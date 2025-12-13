import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { Store } from "@tauri-apps/plugin-store";
import { getCurrentWindow, LogicalPosition, LogicalSize } from "@tauri-apps/api/window";
import { dirname, homeDir, join } from "@tauri-apps/api/path";
import { listen } from "@tauri-apps/api/event";
import { copyFile, mkdir } from "@tauri-apps/plugin-fs";
import "./App.css";
import "./components/AboutDialog.css";
import { VcpDocument, Selection } from "./types";
import VcpGrid from "./components/VcpGrid";
import Inspector from "./components/Inspector";
import Toolbar from "./components/Toolbar";
import Notification, { NotificationType } from "./components/Notification";
import UnsavedChangesDialog, { UnsavedChangesResult } from "./components/UnsavedChangesDialog";
import SettingsDialog from "./components/SettingsDialog";
import ButtonEditorModal from "./components/ButtonEditorModal";
import AboutDialog from "./components/AboutDialog";
import ErrorBoundary from "./components/ErrorBoundary";
import { UndoRedoManager } from "./undoRedo";
import { AppSettings, defaultSettings } from "./settingsTypes";
import { useMenu, Menu } from "./utils/MenuService";

interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
}

function App() {
  const [document, setDocument] = useState<VcpDocument | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [clipboard, setClipboard] = useState<{ type: 'border' | 'image' | 'button'; data: any; isCut: boolean } | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [unsavedDialogContext, setUnsavedDialogContext] = useState<'close' | 'new' | 'open'>('close');
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const [showButtonEditor, setShowButtonEditor] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [imageCacheBuster, setImageCacheBuster] = useState(Date.now());
  const unsavedDialogResolve = useRef<((result: UnsavedChangesResult) => void) | null>(null);

  const { menuState, hideMenu } = useMenu();

  // Read package version from Vite env (set via npm script as VITE_APP_VERSION)
  const appVersion = (import.meta as any).env?.VITE_APP_VERSION ?? '';

  // Parse version into components for detailed display
  const getVersionInfo = (version: string) => {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
    const baseInfo = match ? {
      major: parseInt(match[1]),
      minor: parseInt(match[2]),
      patch: parseInt(match[3]),
      preRelease: match[4] || null,
    } : {
      major: 0,
      minor: 0,
      patch: 0,
      preRelease: null,
    };

    // Get build info
    const now = new Date();
    const buildDate = now.toLocaleDateString();
    const buildTime = now.toLocaleTimeString();

    return {
      full: version,
      ...baseInfo,
      buildDate,
      buildTime,
      // Could add git commit hash here if available
      commitHash: 'dev-build' // Placeholder - could be populated from git
    };
  };

  const versionInfo = getVersionInfo(appVersion);

  const undoRedoManager = useRef(new UndoRedoManager());
  const store = useRef<Store | null>(null);
  const windowSaveTimeout = useRef<number | null>(null);

  const showNotification = (message: string, type: NotificationType = 'info') => {
    setNotification({ message, type });
  };

  const saveLastFilePath = async (path: string | null) => {
    if (store.current) {
      try {
        await store.current.set('lastFilePath', path);
        await store.current.save();
      } catch (error) {
        console.error('Failed to save last file path:', error);
      }
    }
  };

  const showUnsavedChangesDialog = (context: 'close' | 'new' | 'open'): Promise<UnsavedChangesResult> => {
    return new Promise((resolve) => {
      unsavedDialogResolve.current = resolve;
      setUnsavedDialogContext(context);
      setShowUnsavedDialog(true);
    });
  };

  const handleUnsavedDialogResult = async (result: UnsavedChangesResult) => {
    setShowUnsavedDialog(false);
    if (unsavedDialogResolve.current) {
      unsavedDialogResolve.current(result);
      unsavedDialogResolve.current = null;
    }
  };

  const checkUnsavedChanges = async (context: 'new' | 'open' = 'open'): Promise<boolean> => {
    if (!isDirty) return true;

    const result = await showUnsavedChangesDialog(context);

    if (result === 'cancel') {
      return false;
    }

    if (result === 'save') {
      const saveSuccess = await handleSave();
      return saveSuccess; // Return true only if save was successful
    }

    // result === 'discard'
    return true;
  };

  // Initialize store and restore window state
  useEffect(() => {
    const initStore = async () => {
      const appWindow = getCurrentWindow();

      try {
        store.current = await Store.load('settings.json');

        // Load app settings and ensure required fields exist (e.g., attributions)
        const savedSettings = await store.current.get<AppSettings>('appSettings');
        if (savedSettings) {
          if (!Array.isArray(savedSettings.attributions)) {
            savedSettings.attributions = [];
            try {
              await store.current.set('appSettings', savedSettings);
              await store.current.save();
            } catch (e) {
              console.warn('Failed to persist patched settings:', e);
            }
          }
          setSettings(savedSettings);
        }

        // Restore window position and size
        const windowState = await store.current.get<WindowState>('windowState');
        if (windowState) {
          await appWindow.setPosition(new LogicalPosition(windowState.x, windowState.y));
          await appWindow.setSize(new LogicalSize(windowState.width, windowState.height));
          // window state restored
        } else {
          // no saved window state
        }

        // Show the window after state is restored
        await appWindow.show();

        // Try to open last file
        const lastFilePath = await store.current.get<string>('lastFilePath');
        if (lastFilePath && typeof lastFilePath === 'string') {
          try {
            const doc = await invoke<VcpDocument>("open_file", { path: lastFilePath });
            setDocument(doc);
            setCurrentFilePath(lastFilePath);
            setIsDirty(false);
            setSelection(null);
            undoRedoManager.current.clear();
            undoRedoManager.current.markAsSaved();
            updateUndoRedoState();
            showNotification('Last file reopened', 'success');
            console.log('Last file opened successfully');
          } catch (error) {
            console.error("Failed to open last file:", error);
            // Clear invalid path
            await store.current.set('lastFilePath', null);
            await store.current.save();
            // Start with new document instead
            const newDoc = await invoke<VcpDocument>("new_document");
            setDocument(newDoc);
            setCurrentFilePath(null);
            setIsDirty(false);
            setSelection(null);
            undoRedoManager.current.clear();
            undoRedoManager.current.markAsSaved();
            updateUndoRedoState();
          }
        } else {
          // No last file, create new document
          const newDoc = await invoke<VcpDocument>("new_document");
          setDocument(newDoc);
          setCurrentFilePath(null);
          setIsDirty(false);
          setSelection(null);
          undoRedoManager.current.clear();
          undoRedoManager.current.markAsSaved();
          updateUndoRedoState();
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        // Still create a new document on error
        try {
          const newDoc = await invoke<VcpDocument>("new_document");
          setDocument(newDoc);
          setCurrentFilePath(null);
          setIsDirty(false);
          setSelection(null);
          undoRedoManager.current.clear();
          updateUndoRedoState();
        } catch (e) {
          console.error('Failed to create new document:', e);
        }
      } finally {
        // Show the window after restoring (or if restoration failed)
        await appWindow.show();
        console.log('Window shown');
      }
    };

    initStore();
  }, []);

  // Disable the browser default context menu in production builds so
  // vestiges like "Reload" and "Inspect Element" don't appear.
  useEffect(() => {
    if (!import.meta.env.DEV) {
      const handler = (e: Event) => {
        e.preventDefault();
      };
      window.addEventListener('contextmenu', handler);
      return () => window.removeEventListener('contextmenu', handler);
    }
    return;
  }, []);

  // Save window state on resize/move with debouncing
  useEffect(() => {
    const appWindow = getCurrentWindow();

    const saveWindowState = async () => {
      if (!store.current) return;

      try {
        const position = await appWindow.outerPosition();
        const size = await appWindow.innerSize();

        const windowState: WindowState = {
          x: position.x,
          y: position.y,
          width: size.width,
          height: size.height,
        };

        console.log('Saving window state:', windowState);
        await store.current.set('windowState', windowState);
        await store.current.save();
        console.log('Window state saved');
      } catch (error) {
        console.error('Failed to save window state:', error);
      }
    };

    const debouncedSave = () => {
      if (windowSaveTimeout.current) {
        clearTimeout(windowSaveTimeout.current);
      }
      windowSaveTimeout.current = window.setTimeout(saveWindowState, 500);
    };

    const unlistenResize = appWindow.onResized(debouncedSave);
    const unlistenMove = appWindow.onMoved(debouncedSave);

    return () => {
      unlistenResize.then(fn => fn());
      unlistenMove.then(fn => fn());
      if (windowSaveTimeout.current) {
        clearTimeout(windowSaveTimeout.current);
      }
    };
  }, []);

  // Handle window close - warn about unsaved changes
  useEffect(() => {
    const appWindow = getCurrentWindow();
    let isProcessing = false;

    const handleCloseRequested = async (event: any) => {
      // Prevent multiple simultaneous handlers
      if (isProcessing) {
        event.preventDefault();
        return;
      }

      isProcessing = true;

      try {
        // Close any open dialogs first
        if (showSettingsDialog) {
          setShowSettingsDialog(false);
          // Allow time for state update
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        if (showButtonEditor) {
          setShowButtonEditor(false);
          // Allow time for state update
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // If there are no unsaved changes after closing dialogs, allow close
        if (!isDirty) {
          return;
        }

        // We have unsaved changes, prevent close and show dialog
        event.preventDefault();

        const result = await showUnsavedChangesDialog('close');

        if (result === 'cancel') {
          return;
        }

        if (result === 'save') {
          const saveSuccess = await handleSave();
          if (!saveSuccess) {
            return;
          }
        }

        // User approved close, set isDirty to false and close
        setIsDirty(false);
        // Allow time for state update
        await new Promise(resolve => setTimeout(resolve, 50));
        appWindow.close();
      } finally {
        isProcessing = false;
      }
    };

    const unlisten = appWindow.onCloseRequested(handleCloseRequested);

    return () => {
      unlisten.then(fn => fn());
    };
  }, [isDirty, showSettingsDialog, showButtonEditor]);

  // Listen for menu events
  useEffect(() => {
    const setupMenuListeners = async () => {
      const unlistenNew = await listen('menu-new', () => handleNew());
      const unlistenOpen = await listen('menu-open', () => handleOpen());
      const unlistenSave = await listen('menu-save', () => handleSave());
      const unlistenSaveAs = await listen('menu-save-as', () => handleSaveAs());
      const unlistenExport = await listen('menu-export-cnc', () => handleExportToCNC());
      const unlistenPrint = await listen('menu-print', () => handlePrint());
      const unlistenAbout = await listen('menu-about', () => {
        console.log('menu-about event received');
        setShowAboutDialog(true);
      });
      const unlistenSettings = await listen('menu-settings', () => setShowSettingsDialog(true));
      const unlistenRefreshImages = await listen('menu-refresh-images', () => setImageCacheBuster(Date.now()));
      const unlistenZoomIn = await listen('menu-zoom-in', () => {
        setSettings(prev => {
          const newZoom = Math.min(prev.grid.cellZoom + 10, 200);
          return {
            ...prev,
            grid: {
              ...prev.grid,
              cellZoom: newZoom
            }
          };
        });
      });
      const unlistenZoomOut = await listen('menu-zoom-out', () => {
        setSettings(prev => {
          const newZoom = Math.max(prev.grid.cellZoom - 10, 50);
          return {
            ...prev,
            grid: {
              ...prev.grid,
              cellZoom: newZoom
            }
          };
        });
      });
      const unlistenToggleGrid = await listen('menu-toggle-grid', () => {
        setSettings(prev => ({
          ...prev,
          grid: {
            ...prev.grid,
            showGridLines: !prev.grid.showGridLines
          }
        }));
      });
      const unlistenQuit = await listen('menu-quit', () => handleQuit());

      return () => {
        unlistenNew();
        unlistenOpen();
        unlistenSave();
        unlistenSaveAs();
        unlistenExport();
        unlistenPrint();
        unlistenAbout();
        unlistenSettings();
        unlistenRefreshImages();
        unlistenZoomIn();
        unlistenZoomOut();
        unlistenToggleGrid();
        unlistenQuit();
      };
    };

    setupMenuListeners().then(cleanup => {
      // Return cleanup function
      return cleanup;
    }).catch(err => console.error('Failed to setup menu listeners:', err));
  }, [document, currentFilePath, isDirty]);

  // Apply theme setting to document root
  useEffect(() => {
    const root = window.document.documentElement;

    // Remove any existing theme classes
    root.classList.remove('theme-light', 'theme-dark');

    if (settings.display.theme === 'light') {
      root.classList.add('theme-light');
    } else if (settings.display.theme === 'dark') {
      root.classList.add('theme-dark');
    }
    // If 'system', don't add any class (let CSS media query handle it)
  }, [settings.display.theme]);

  // About dialog close handler
  const handleCloseAbout = () => {
    setShowAboutDialog(false);
  };

  useEffect(() => {
    if (showAboutDialog) {
      console.log('About dialog shown (showAboutDialog=true)');
    } else {
      console.log('About dialog hidden (showAboutDialog=false)');
    }
  }, [showAboutDialog]);

  const handleNew = async () => {
    if (showSettingsDialog || showButtonEditor) return;
    if (!await checkUnsavedChanges('new')) return;

    try {
      const newDoc = await invoke<VcpDocument>("new_document");
      setDocument(newDoc);
      setCurrentFilePath(null);
      setIsDirty(false);
      setSelection(null);
      undoRedoManager.current.clear();
      updateUndoRedoState();
      await saveLastFilePath(null);
    } catch (error) {
      console.error("Failed to create new document:", error);
    }
  };

  const handleOpen = async () => {
    if (showSettingsDialog || showButtonEditor) return;
    if (!await checkUnsavedChanges('open')) return;

    try {
      // Use vcpResourcesFolder for Open dialog
      let defaultPath: string | undefined;

      if (settings.files.vcpResourcesFolder && settings.files.vcpResourcesFolder.trim() !== '') {
        // Try to use skins subfolder if it exists, otherwise use root
        const skinsPath = await join(settings.files.vcpResourcesFolder, 'skins');
        defaultPath = skinsPath;
      } else if (currentFilePath) {
        defaultPath = await dirname(currentFilePath);
      } else {
        defaultPath = await homeDir();
      }

      const filePath = await open({
        filters: [{ name: "VCP Files", extensions: ["vcp"] }],
        defaultPath,
      });

      if (filePath) {
        let finalFilePath = filePath as string;

        // Check if file is from vcpResourcesFolder and copy to work in progress folder
        if (settings.files.vcpResourcesFolder && settings.files.defaultSaveLocation) {
          const vcpResourcesPath = settings.files.vcpResourcesFolder.toLowerCase();
          const filePathLower = finalFilePath.toLowerCase();

          if (filePathLower.startsWith(vcpResourcesPath)) {
            // File is from vcpResourcesFolder, copy to work in progress folder
            try {
              // Ensure folder structure exists
              await invoke('ensure_vcp_folder_structure', { basePath: settings.files.defaultSaveLocation });

              // Create destination path in work in progress folder
              const relativePath = finalFilePath.substring(settings.files.vcpResourcesFolder.length);
              const destPath = await join(settings.files.defaultSaveLocation, relativePath);

              // Ensure destination directory exists
              const destDir = await dirname(destPath);
              try {
                await mkdir(destDir, { recursive: true });
              } catch (error) {
                // Directory might already exist, continue
              }

              // Copy the file
              await copyFile(finalFilePath, destPath);

              finalFilePath = destPath;
              showNotification('File copied from VCP resources to work in progress folder', 'info');
            } catch (error) {
              console.warn('Failed to copy file from VCP resources:', error);
              showNotification('Warning: Could not copy file to work in progress folder', 'warning');
            }
          }
        }

        const doc = await invoke<VcpDocument>("open_file", { path: finalFilePath });
        setDocument(doc);
        setCurrentFilePath(finalFilePath);
        setIsDirty(false);
        setSelection(null);
        undoRedoManager.current.clear();
        undoRedoManager.current.markAsSaved();
        updateUndoRedoState();
        await saveLastFilePath(finalFilePath);
        showNotification('File opened successfully', 'success');
      }
    } catch (error) {
      console.error("Failed to open file:", error);
      showNotification(`Failed to open file: ${error}`, 'error');
    }
  };

  const handleSave = async (): Promise<boolean> => {
    if (!document) return false;

    try {
      let path = currentFilePath;

      if (!path) {
        // Get default save location from settings with fallback chain
        let defaultPath: string | undefined;

        if (settings.files.defaultSaveLocation && settings.files.defaultSaveLocation.trim() !== '') {
          // Ensure folder structure exists
          try {
            await invoke('ensure_vcp_folder_structure', { basePath: settings.files.defaultSaveLocation });
          } catch (error) {
            console.warn('Failed to create folder structure:', error);
          }
          // Append 'skins' subfolder for VCP files
          defaultPath = await join(settings.files.defaultSaveLocation, 'skins');
        } else {
          defaultPath = settings.files.vcpResourcesFolder || await homeDir();
        }

        const savePath = await save({
          filters: [{ name: "VCP Files", extensions: ["vcp"] }],
          defaultPath,
        });

        if (!savePath) return false;
        path = savePath;
      }

      await invoke("save_file_command", { path, doc: document });
      setCurrentFilePath(path);
      setIsDirty(false);
      undoRedoManager.current.markAsSaved();
      await saveLastFilePath(path);
      showNotification('File saved successfully', 'success');
      return true;
    } catch (error) {
      console.error("Failed to save file:", error);
      showNotification(`Failed to save file: ${error}`, 'error');
      return false;
    }
  };

  const handleSaveAs = async () => {
    if (!document) return;

    try {
      // Get default save location from settings with fallback chain
      let defaultPath: string | undefined;

      if (settings.files.defaultSaveLocation && settings.files.defaultSaveLocation.trim() !== '') {
        // Ensure folder structure exists
        try {
          await invoke('ensure_vcp_folder_structure', { basePath: settings.files.defaultSaveLocation });
        } catch (error) {
          console.warn('Failed to create folder structure:', error);
        }
        // Append 'skins' subfolder for VCP files
        defaultPath = await join(settings.files.defaultSaveLocation, 'skins');
      } else if (currentFilePath) {
        defaultPath = await dirname(currentFilePath);
      } else {
        defaultPath = settings.files.vcpResourcesFolder || await homeDir();
      }

      const savePath = await save({
        filters: [{ name: "VCP Files", extensions: ["vcp"] }],
        defaultPath,
      });

      if (!savePath) return;

      await invoke("save_file_command", { path: savePath, doc: document });
      setCurrentFilePath(savePath);
      setIsDirty(false);
      undoRedoManager.current.markAsSaved();
      await saveLastFilePath(savePath);
      showNotification('File saved successfully', 'success');
    } catch (error) {
      console.error("Failed to save file:", error);
      showNotification(`Failed to save file: ${error}`, 'error');
    }
  };

  const handlePrint = async () => {
    try {
      // Try to invoke print through Tauri
      await invoke("print_window");
    } catch (error) {
      console.error("Failed to print:", error);
      showNotification(`Failed to print: ${error}`, 'error');
    }
  };

  const handleExportToCNC = async () => {
    if (showSettingsDialog || showButtonEditor) return;

    try {
      // Check that CNC base path is configured
      if (!settings.files.cncBasePath || settings.files.cncBasePath.trim() === '') {
        showNotification('Please configure CNC base path in Settings > Files before exporting', 'error');
        setShowSettingsDialog(true);
        return;
      }

      // Check that VCP resources folder is configured
      if (!settings.files.vcpResourcesFolder || settings.files.vcpResourcesFolder.trim() === '') {
        showNotification('Please configure VCP resources folder in Settings > Files before exporting', 'error');
        setShowSettingsDialog(true);
        return;
      }

      // Generate VCP XML content
      const vcpXml = await invoke<string>('serialize_vcp_document', { doc: document });

      // Call Rust export command with path remapping
      const result = await invoke<string>('export_to_cnc', {
        vcpResourcesFolder: settings.files.vcpResourcesFolder,
        cncBasePath: settings.files.cncBasePath,
        vcpContent: vcpXml
      });

      showNotification(`VCP package exported successfully to: ${result}`, 'success');
    } catch (error) {
      console.error('Export failed:', error);
      showNotification(`Export failed: ${error}`, 'error');
    }
  };

  const handleQuit = async () => {
    if (showSettingsDialog || showButtonEditor) return;
    if (isDirty) {
      const result = await showUnsavedChangesDialog('close');

      if (result === 'cancel') {
        // User cancelled quit
        return;
      }

      if (result === 'save') {
        // User wants to save before quitting
        const saveSuccess = await handleSave();
        if (!saveSuccess) {
          // Save failed or was cancelled, don't quit
          return;
        }
      }

      // result === 'discard' or save was successful, proceed with quit
      // Set isDirty to false so close handler allows it
      setIsDirty(false);
      setTimeout(() => getCurrentWindow().close(), 100);
    } else {
      // No unsaved changes, just close
      await getCurrentWindow().close();
    }
  };

  const handleSettingsSave = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    setShowSettingsDialog(false);

    // Save to store
    if (store.current) {
      try {
        await store.current.set('appSettings', newSettings);
        await store.current.save();
        showNotification('Settings saved successfully', 'success');
      } catch (error) {
        console.error('Failed to save settings:', error);
        showNotification('Failed to save settings', 'error');
      }
    }

    // Update undo manager max size if changed
    if (newSettings.editor.undoHistoryDepth !== settings.editor.undoHistoryDepth) {
      undoRedoManager.current = new UndoRedoManager(newSettings.editor.undoHistoryDepth);
    }
  };

  const handleSettingsChange = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    // Persist changes but don't close dialog
    if (store.current) {
      try {
        await store.current.set('appSettings', newSettings);
        await store.current.save();
        console.log('Settings auto-saved');
      } catch (error) {
        console.error('Failed to auto-save settings:', error);
      }
    }
  };

  const updateDocument = (updatedDoc: VcpDocument, skipHistory = false) => {
    if (!skipHistory && document) {
      undoRedoManager.current.pushState(document);
      updateUndoRedoState();
    }
    setDocument(updatedDoc);
    setIsDirty(true);
    setImageCacheBuster(Date.now()); // Force image refresh
  };

  const handleUndo = () => {
    if (!document) return;
    const previousDoc = undoRedoManager.current.undo(document);
    if (previousDoc) {
      setDocument(previousDoc);
      setSelection({ type: 'empty' }); // Clear selection since elements may have changed
      // Check if we've undone back to the saved state
      const isAtSaved = undoRedoManager.current.isAtSavedState();
      setIsDirty(!isAtSaved);
      updateUndoRedoState();
    }
  };

  const handleRedo = () => {
    if (!document) return;
    const nextDoc = undoRedoManager.current.redo(document);
    if (nextDoc) {
      setDocument(nextDoc);
      setSelection({ type: 'empty' }); // Clear selection since elements may have changed
      // Redo always makes the document dirty (we're moving away from saved state)
      setIsDirty(true);
      updateUndoRedoState();
    }
  };

  const updateUndoRedoState = () => {
    setCanUndo(undoRedoManager.current.canUndo());
    setCanRedo(undoRedoManager.current.canRedo());
  };

  // Check if a cell is occupied by a button or image
  const isCellOccupiedByElement = (row: number, col: number): boolean => {
    if (!document) return false;

    // Check buttons
    for (const btn of document.buttons) {
      const rowSpan = btn.row_span || 1;
      const colSpan = btn.column_span || 1;

      if (row >= btn.row && row < btn.row + rowSpan &&
        col >= btn.column && col < btn.column + colSpan) {
        return true;
      }
    }

    // Check images
    for (const img of document.images) {
      if (row >= img.row_start && row < img.row_start + img.row_span &&
        col >= img.column_start && col < img.column_start + img.column_span) {
        return true;
      }
    }

    return false;
  };

  const handleAddBorder = () => {
    if (!document) return;

    // Use selected cell position or default to (1,1)
    const startRow = selection?.row || 1;
    const startCol = selection?.column || 1;

    // Smart sizing: ensure border fits within grid bounds
    const maxRowSpan = document.row_count - startRow + 1;
    const maxColSpan = document.column_count - startCol + 1;
    const rowSpan = Math.min(2, maxRowSpan);
    const colSpan = Math.min(2, maxColSpan);

    const newBorder = {
      row_start: startRow,
      column_start: startCol,
      row_span: rowSpan,
      column_span: colSpan,
      fill: "Transparent",
      outline_color: "#000000",
      outline_thickness: 2,
    };

    const updatedDoc = {
      ...document,
      borders: [...document.borders, newBorder],
    };

    updateDocument(updatedDoc);

    // Select the new border
    setSelection({
      type: 'border',
      index: updatedDoc.borders.length - 1,
      row: newBorder.row_start,
      column: newBorder.column_start,
    });
  };

  const handleAddImage = () => {
    if (!document) return;

    // Use selected cell position or default to (1,1)
    const startRow = selection?.row || 1;
    const startCol = selection?.column || 1;

    // Check if the cell is already occupied by a button or image
    if (isCellOccupiedByElement(startRow, startCol)) {
      showNotification('Cannot add image: Cell is already occupied. Please select an empty cell or delete the existing element first.', 'warning');
      return;
    }

    const newImage = {
      row_start: startRow,
      column_start: startCol,
      row_span: 1,
      column_span: 1,
      path: "",
    };

    const updatedDoc = {
      ...document,
      images: [...document.images, newImage],
    };

    updateDocument(updatedDoc);

    // Select the new image
    setSelection({
      type: 'image',
      index: updatedDoc.images.length - 1,
      row: newImage.row_start,
      column: newImage.column_start,
    });
  };

  const handleAddButton = () => {
    if (!document || !selection) return;

    // Use selected cell position or default to (1,1)
    const buttonRow = selection.row || 1;
    const buttonColumn = selection.column || 1;

    // Quick add: creates placeholder button (no XML file yet)
    const newButton = {
      row: buttonRow,
      column: buttonColumn,
      name: '',  // No name until configured in editor
      file: '',  // No XML file until user opens editor
    };

    const updatedDoc = {
      ...document,
      buttons: [...document.buttons, newButton],
    };

    updateDocument(updatedDoc);

    // Select the new button
    setSelection({
      type: 'button',
      index: updatedDoc.buttons.length - 1,
      row: newButton.row,
      column: newButton.column,
    });
  };

  useEffect(() => {
    const updateTitle = async () => {
      try {
        const appWindow = getCurrentWindow();
        const filename = currentFilePath ? currentFilePath.split('/').pop() : "Untitled";
        const title = `${filename}${isDirty ? " •" : ""}`;
        console.log('Setting window title to:', title);
        await appWindow.setTitle(title);
        console.log('Window title set successfully to:', title);
      } catch (error) {
        console.error('Failed to set window title:', error);
      }
    };
    updateTitle();
  }, [currentFilePath, isDirty]);

  const handleCut = () => {
    if (!document || !selection || selection.type === 'empty' || selection.index === undefined) return;

    // Copy to clipboard
    let data = null;
    if (selection.type === 'border') {
      data = { ...document.borders[selection.index] };
    } else if (selection.type === 'image') {
      data = { ...document.images[selection.index] };
    } else if (selection.type === 'button') {
      data = { ...document.buttons[selection.index] };
    }

    if (data) {
      setClipboard({ type: selection.type, data, isCut: true });

      // Remove the element
      const updatedDoc = { ...document };
      if (selection.type === 'border') {
        updatedDoc.borders = document.borders.filter((_, i) => i !== selection.index);
      } else if (selection.type === 'image') {
        updatedDoc.images = document.images.filter((_, i) => i !== selection.index);
      } else if (selection.type === 'button') {
        updatedDoc.buttons = document.buttons.filter((_, i) => i !== selection.index);
      }

      updateDocument(updatedDoc);
      setSelection(null);
    }
  };

  const handleCopy = () => {
    if (!document || !selection || selection.type === 'empty' || selection.index === undefined) return;

    let data = null;
    if (selection.type === 'border') {
      data = { ...document.borders[selection.index] };
    } else if (selection.type === 'image') {
      data = { ...document.images[selection.index] };
    } else if (selection.type === 'button') {
      data = { ...document.buttons[selection.index] };
    }

    if (data) {
      setClipboard({ type: selection.type, data, isCut: false });
    }
  };

  const handlePaste = () => {
    if (!document || !clipboard) return;

    // Use selected cell position or default to (1,1)
    const targetRow = selection?.row || 1;
    const targetCol = selection?.column || 1;

    const updatedDoc = { ...document };
    let newIndex = -1;

    if (clipboard.type === 'border') {
      const newBorder = {
        ...clipboard.data,
        row_start: targetRow,
        column_start: targetCol,
      };
      updatedDoc.borders = [...document.borders, newBorder];
      newIndex = updatedDoc.borders.length - 1;
    } else if (clipboard.type === 'image') {
      const newImage = {
        ...clipboard.data,
        row_start: targetRow,
        column_start: targetCol,
      };
      updatedDoc.images = [...document.images, newImage];
      newIndex = updatedDoc.images.length - 1;
    } else if (clipboard.type === 'button') {
      const newButton = {
        ...clipboard.data,
        row: targetRow,
        column: targetCol,
      };
      updatedDoc.buttons = [...document.buttons, newButton];
      newIndex = updatedDoc.buttons.length - 1;
    }

    updateDocument(updatedDoc);

    // Select the pasted element
    setSelection({
      type: clipboard.type,
      index: newIndex,
      row: targetRow,
      column: targetCol,
    });

    // Clear clipboard if it was cut
    if (clipboard.isCut) {
      setClipboard(null);
    }
  };

  const handleDelete = () => {
    if (!document || !selection || selection.type === 'empty' || selection.index === undefined) return;

    const updatedDoc = { ...document };
    if (selection.type === 'border') {
      updatedDoc.borders = document.borders.filter((_, i) => i !== selection.index);
    } else if (selection.type === 'image') {
      updatedDoc.images = document.images.filter((_, i) => i !== selection.index);
    } else if (selection.type === 'button') {
      updatedDoc.buttons = document.buttons.filter((_, i) => i !== selection.index);
    }

    updateDocument(updatedDoc);
    setSelection(null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keyboard shortcuts when typing in an input or textarea
      const target = e.target as HTMLElement;
      const isTextInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.key === 's') {
        // Cmd+S or Ctrl+S: Save
        e.preventDefault();
        handleSave();
      } else if (isMod && e.shiftKey && e.key === 's') {
        // Cmd+Shift+S or Ctrl+Shift+S: Save As
        e.preventDefault();
        handleSaveAs();
      } else if (isMod && e.key === 'p') {
        // Cmd+P or Ctrl+P: Print
        e.preventDefault();
        handlePrint();
      } else if (isMod && e.key === 'n') {
        // Cmd+N or Ctrl+N: New
        e.preventDefault();
        handleNew();
      } else if (isMod && e.key === 'o') {
        // Cmd+O or Ctrl+O: Open
        e.preventDefault();
        handleOpen();
      } else if (isMod && e.key === 'z' && !e.shiftKey) {
        // Cmd+Z or Ctrl+Z: Undo
        e.preventDefault();
        handleUndo();
      } else if (isMod && (e.key === 'z' && e.shiftKey || e.key === 'y')) {
        // Cmd+Shift+Z or Cmd+Y or Ctrl+Shift+Z or Ctrl+Y: Redo
        e.preventDefault();
        handleRedo();
      } else if (isMod && e.key === 'x') {
        // Cmd+X or Ctrl+X: Cut
        e.preventDefault();
        handleCut();
      } else if (isMod && e.key === 'c') {
        // Cmd+C or Ctrl+C: Copy
        e.preventDefault();
        handleCopy();
      } else if (isMod && e.key === 'v') {
        // Cmd+V or Ctrl+V: Paste
        e.preventDefault();
        handlePaste();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isMod && !isTextInput) {
        // Delete or Backspace: Delete element (but not when typing in text fields)
        e.preventDefault();
        handleDelete();
      } else if (isMod && e.key === '=') {
        // Cmd+= or Ctrl+=: Zoom In
        e.preventDefault();
        setSettings(prev => {
          const newZoom = Math.min(prev.grid.cellZoom + 10, 200);
          return {
            ...prev,
            grid: {
              ...prev.grid,
              cellZoom: newZoom
            }
          };
        });
      } else if (isMod && e.key === '-') {
        // Cmd+- or Ctrl+-: Zoom Out
        e.preventDefault();
        setSettings(prev => {
          const newZoom = Math.max(prev.grid.cellZoom - 10, 50);
          return {
            ...prev,
            grid: {
              ...prev.grid,
              cellZoom: newZoom
            }
          };
        });
      } else if (isMod && e.key === 'g') {
        // Cmd+G or Ctrl+G: Toggle Grid
        e.preventDefault();
        setSettings(prev => ({
          ...prev,
          grid: {
            ...prev.grid,
            showGridLines: !prev.grid.showGridLines
          }
        }));
      } else if (isMod && e.key === 'r') {
        // Cmd+R or Ctrl+R: Refresh Images
        e.preventDefault();
        setImageCacheBuster(Date.now());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleCut, handleCopy, handlePaste, handleDelete]);

  if (!document) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      {showUnsavedDialog && (
        <UnsavedChangesDialog
          context={unsavedDialogContext}
          onResult={handleUnsavedDialogResult}
        />
      )}
      {showSettingsDialog && (
        <SettingsDialog
          settings={settings}
          onSave={handleSettingsSave}
          onChange={handleSettingsChange}
          onCancel={() => setShowSettingsDialog(false)}
        />
      )}
      {showButtonEditor && (
        <ButtonEditorModal
          onClose={() => setShowButtonEditor(false)}
          onSave={async (buttonName) => {
            try {
              // Update the selected button with the new name and file
              if (selection && selection.type === 'button' && selection.index !== undefined && document && currentFilePath) {
                const updatedButtons = [...document.buttons];
                updatedButtons[selection.index] = {
                  ...updatedButtons[selection.index],
                  name: buttonName,
                  file: `${buttonName}.xml`,
                };

                const updatedDoc = {
                  ...document,
                  buttons: updatedButtons,
                };

                // Save the document first
                await invoke("save_file_command", { path: currentFilePath, doc: updatedDoc });
                setIsDirty(false);

                // Now reload to get updated default_image field
                const reloadedDoc = await invoke<VcpDocument>("open_file", { path: currentFilePath });
                setDocument(reloadedDoc);
                setImageCacheBuster(Date.now()); // Force image refresh
                showNotification(`Button "${buttonName}" saved`, 'success');
              }
            } catch (error) {
              console.error("Failed to save button:", error);
              showNotification(`Failed to save button: ${error}`, 'error');
            }
            setShowButtonEditor(false);
          }}
          vcpResourcesFolder={settings.files.vcpResourcesFolder}
          defaultSaveLocation={settings.files.defaultSaveLocation}
          existingButton={
            selection && selection.type === 'button' && selection.index !== undefined && document
              ? (() => {
                const button = document.buttons[selection.index];
                // Pass the button name when present so the editor pre-fills the name input.
                // Allow buttons without an XML file to still populate the name field.
                return button.name && button.name.trim() !== ''
                  ? { name: button.name, file: button.file || '' }
                  : undefined;
              })()
              : undefined
          }
        />
      )}
      {showAboutDialog && (
        <ErrorBoundary>
          <AboutDialog
            onClose={handleCloseAbout}
            appName="VCP Editor"
            version={appVersion}
            versionInfo={versionInfo}
            attributions={settings.attributions}
            settingsPathHint={"~/Library/Application Support/com.cncsage.vcp-editor/settings.json"}
          />
        </ErrorBoundary>
      )}
      <Toolbar
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onCut={handleCut}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onDelete={handleDelete}
        canCut={selection !== null && selection.type !== 'empty'}
        canCopy={selection !== null && selection.type !== 'empty'}
        canPaste={clipboard !== null}
        canDelete={selection !== null && selection.type !== 'empty'}
        onAddBorder={handleAddBorder}
        onAddImage={handleAddImage}
        onAddButton={handleAddButton}
        canAddBorder={selection !== null && selection.type === 'empty'}
        canAddImage={selection !== null && selection.type === 'empty'}
        canAddButton={selection !== null && selection.type === 'empty'}
        onSettings={() => setShowSettingsDialog(true)}
        onAbout={() => setShowAboutDialog(true)}
      />
      <div className="main-container">
        <div
          className="canvas-container"
          onClick={(e) => {
            // Deselect when clicking the canvas background (not the grid)
            if (e.target === e.currentTarget) {
              setSelection(null);
            }
          }}
        >
          <VcpGrid
            document={document}
            selection={selection}
            onSelectionChange={setSelection}
            onDocumentChange={updateDocument}
            gridSettings={settings.grid}
            vcpResourcesFolder={settings.files.vcpResourcesFolder}
            imageCacheBuster={imageCacheBuster}
            onAddBorder={handleAddBorder}
            onAddImage={handleAddImage}
            onAddButton={handleAddButton}
            onCut={handleCut}
            onCopy={handleCopy}
            onPaste={handlePaste}
            onDelete={handleDelete}
            canPaste={clipboard !== null}
          />
        </div>
        <div className="inspector-container">
          <Inspector
            document={document}
            selection={selection}
            onDocumentChange={updateDocument}
            onShowNotification={showNotification}
            onNewButton={() => setShowButtonEditor(true)}
            vcpResourcesFolder={settings.files.vcpResourcesFolder}
            defaultSaveLocation={settings.files.defaultSaveLocation}
          />
        </div>
      </div>

      {/* Global Menu Component */}
      {menuState.isOpen && menuState.position && (
        <Menu
          items={menuState.items}
          position={menuState.position}
          type={menuState.anchor ? 'dropdown' : 'context'}
          alignment={menuState.alignment}
          onClose={hideMenu}
        />
      )}
    </div>
  );
}

export default App;
