import { useState, useRef, useEffect } from 'react';
import './SettingsDialog.css';
import { AppSettings, GridLineStyle, ThemeMode } from '../settingsTypes';

interface SettingsDialogProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void; // persist and close
  onCancel: () => void; // just close without saving
  onChange?: (settings: AppSettings) => void; // live update without closing
}

type SettingsTab = 'grid' | 'display' | 'editor' | 'files';

export default function SettingsDialog({ settings, onSave, onCancel, onChange }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('grid');
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const devMode = Boolean((import.meta as any).env?.DEV);
  const [showDeveloperOptions, setShowDeveloperOptions] = useState<boolean>(devMode);

  const autosaveTimeout = useRef<number | null>(null);
  const AUTOSAVE_DEBOUNCE_MS = 400;

  const applyChange = (newSettings: AppSettings) => {
    setLocalSettings(newSettings);

    if (autosaveTimeout.current) {
      clearTimeout(autosaveTimeout.current);
    }

    autosaveTimeout.current = window.setTimeout(() => {
      try {
        if (typeof onChange === 'function') {
          onChange(newSettings);
        } else {
          // Fallback: persist via onSave if onChange isn't provided
          onSave(newSettings);
        }
      } finally {
        autosaveTimeout.current = null;
      }
    }, AUTOSAVE_DEBOUNCE_MS) as unknown as number;
  };

  useEffect(() => {
    return () => {
      if (autosaveTimeout.current) {
        clearTimeout(autosaveTimeout.current);
      }
    };
  }, []);

  const updateGridSetting = <K extends keyof AppSettings['grid']>(key: K, value: AppSettings['grid'][K]) => {
    const newSettings = { ...localSettings, grid: { ...localSettings.grid, [key]: value } } as AppSettings;
    applyChange(newSettings);
  };

  const updateDisplaySetting = <K extends keyof AppSettings['display']>(key: K, value: AppSettings['display'][K]) => {
    const newSettings = { ...localSettings, display: { ...localSettings.display, [key]: value } } as AppSettings;
    applyChange(newSettings);
  };

  const updateEditorSetting = <K extends keyof AppSettings['editor']>(key: K, value: AppSettings['editor'][K]) => {
    const newSettings = { ...localSettings, editor: { ...localSettings.editor, [key]: value } } as AppSettings;
    applyChange(newSettings);
  };

  const updateFileSetting = <K extends keyof AppSettings['files']>(key: K, value: AppSettings['files'][K]) => {
    const newSettings = { ...localSettings, files: { ...localSettings.files, [key]: value } } as AppSettings;
    applyChange(newSettings);
  };

  return (
    <div className="settings-overlay" onClick={onCancel}>
      <div className="settings-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onCancel}>×</button>
        </div>

        <div className="settings-content">
          <div className="settings-tabs">
            <button className={`settings-tab ${activeTab === 'grid' ? 'active' : ''}`} onClick={() => setActiveTab('grid')}>Grid</button>
            <button className={`settings-tab ${activeTab === 'display' ? 'active' : ''}`} onClick={() => setActiveTab('display')}>Display</button>
            <button className={`settings-tab ${activeTab === 'editor' ? 'active' : ''}`} onClick={() => setActiveTab('editor')}>Editor</button>
            <button className={`settings-tab ${activeTab === 'files' ? 'active' : ''}`} onClick={() => setActiveTab('files')}>Files</button>
          </div>

          <div className="settings-panel">
            {activeTab === 'grid' && (
              <div className="settings-section">
                <h3>Grid Settings</h3>

                <div className="setting-row">
                  <label>
                    <input type="checkbox" checked={localSettings.grid.showGridLines} onChange={(e) => updateGridSetting('showGridLines', e.target.checked)} />
                    Show grid lines
                  </label>
                </div>

                <div className="setting-row">
                  <label className="noninteractive">Grid line style</label>
                  <select value={localSettings.grid.gridLineStyle} onChange={(e) => updateGridSetting('gridLineStyle', e.target.value as GridLineStyle)} disabled={!localSettings.grid.showGridLines}>
                    <option value="solid">Solid</option>
                    <option value="dotted">Dotted</option>
                    <option value="dashed">Dashed</option>
                  </select>
                </div>

                <div className="setting-row">
                  <label className="noninteractive">Grid line color</label>
                  <input
                    type="color"
                    value={localSettings.grid.gridLineColor.startsWith('rgba') ? '#000000' : localSettings.grid.gridLineColor}
                    onChange={(e) => updateGridSetting('gridLineColor', e.target.value)}
                    disabled={!localSettings.grid.showGridLines}
                  />
                  <span className="color-preview" style={{ backgroundColor: localSettings.grid.gridLineColor }} />
                </div>

                <div className="setting-row">
                  <label className="noninteractive">Grid line thickness</label>
                  <input type="range" min={1} max={3} step={1} value={localSettings.grid.gridLineThickness} onChange={(e) => updateGridSetting('gridLineThickness', parseInt(e.target.value))} disabled={!localSettings.grid.showGridLines} />
                  <span className="range-value">{localSettings.grid.gridLineThickness}px</span>
                </div>

                <div className="setting-row">
                  <label className="noninteractive">Cell zoom</label>
                  <input type="range" min={50} max={200} step={10} value={localSettings.grid.cellZoom} onChange={(e) => updateGridSetting('cellZoom', parseInt(e.target.value))} />
                  <span className="range-value">{localSettings.grid.cellZoom}%</span>
                </div>

                <div className="setting-row">
                  <label>
                    <input type="checkbox" checked={localSettings.grid.snapToGrid} onChange={(e) => updateGridSetting('snapToGrid', e.target.checked)} />
                    Snap to grid
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'display' && (
              <div className="settings-section">
                <h3>Display Settings</h3>

                <div className="setting-row">
                  <label>
                    <input type="checkbox" checked={localSettings.display.showElementLabels} onChange={(e) => updateDisplaySetting('showElementLabels', e.target.checked)} />
                    Show element labels/names
                  </label>
                </div>

                <div className="setting-row">
                  <label className="noninteractive">Theme</label>
                  <select value={localSettings.display.theme} onChange={(e) => updateDisplaySetting('theme', e.target.value as ThemeMode)}>
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'editor' && (
              <div className="settings-section">
                <h3>Editor Settings</h3>

                <div className="setting-row">
                  <label className="noninteractive">Undo history depth</label>
                  <input type="number" min={5} max={50} value={localSettings.editor.undoHistoryDepth} onChange={(e) => updateEditorSetting('undoHistoryDepth', parseInt(e.target.value) || 5)} />
                  <span className="help-text">Number of undo steps to remember (5-50)</span>
                </div>

                <div className="setting-row">
                  <label className="noninteractive">Auto-save interval</label>
                  <select value={String(localSettings.editor.autoSaveInterval)} onChange={(e) => updateEditorSetting('autoSaveInterval', parseInt(e.target.value))}>
                    <option value="0">Off</option>
                    <option value="1">1 minute</option>
                    <option value="5">5 minutes</option>
                    <option value="10">10 minutes</option>
                  </select>
                </div>

                <div className="setting-row">
                  <label>
                    <input type="checkbox" checked={localSettings.editor.confirmBeforeDelete} onChange={(e) => updateEditorSetting('confirmBeforeDelete', e.target.checked)} />
                    Confirm before deleting elements
                  </label>
                </div>

                <div className="setting-row">
                  <label className="noninteractive">External SVG Editor</label>
                  <div className="folder-input-group">
                    <input type="text" value={localSettings.editor.externalSvgEditor} onChange={(e) => updateEditorSetting('externalSvgEditor', e.target.value)} placeholder="Path to SVG editor (e.g., /Applications/Inkscape.app)" />
                    <button className="folder-browse-button" onClick={async () => {
                      const { open } = await import('@tauri-apps/plugin-dialog');
                      const { homeDir } = await import('@tauri-apps/api/path');
                      const defaultPath = localSettings.editor.externalSvgEditor || await homeDir();
                      const selected = await open({ directory: false, multiple: false, title: 'Select SVG Editor', defaultPath });
                      if (selected) updateEditorSetting('externalSvgEditor', selected as string);
                    }}>Browse...</button>
                  </div>
                  <span className="help-text">Application to use for editing SVG button images</span>
                </div>
              </div>
            )}

            {activeTab === 'files' && (
              <div className="settings-section">
                <h3>File Settings</h3>

                <div className="setting-row">
                  <label>
                    <input type="checkbox" checked={localSettings.files.autoOpenLastFile} onChange={(e) => updateFileSetting('autoOpenLastFile', e.target.checked)} />
                    Auto-open last file on startup
                  </label>
                </div>

                <div className="setting-row">
                  <label className="noninteractive">Work in progress folder</label>
                  <div className="folder-input-group">
                    <input type="text" value={localSettings.files.defaultSaveLocation} onChange={(e) => updateFileSetting('defaultSaveLocation', e.target.value)} placeholder="ex: C:\Users\YourName\Documents\VCP" />
                    <button className="folder-browse-button" onClick={async () => {
                      const { open } = await import('@tauri-apps/plugin-dialog');
                      const { homeDir } = await import('@tauri-apps/api/path');
                      const defaultPath = localSettings.files.defaultSaveLocation || await homeDir();
                      const selected = await open({ directory: true, multiple: false, title: 'Select Default Save Folder', defaultPath });
                      if (selected) updateFileSetting('defaultSaveLocation', selected as string);
                    }}>Browse...</button>
                  </div>
                  <span className="help-text">You will edit the files in this folder</span>
                </div>

                <div className="setting-row">
                  <label>VCP resources folder</label>
                  <div className="folder-input-group">
                    <input type="text" value={localSettings.files.vcpResourcesFolder} onChange={(e) => updateFileSetting('vcpResourcesFolder', e.target.value)} placeholder="Path to vcp folder (containing new Buttons, Images, Skins)" />
                    <button className="folder-browse-button" onClick={async () => {
                      const { open } = await import('@tauri-apps/plugin-dialog');
                      const { homeDir } = await import('@tauri-apps/api/path');
                      const defaultPath = localSettings.files.vcpResourcesFolder || await homeDir();
                      const selected = await open({ directory: true, multiple: false, title: 'Select VCP Resources Folder', defaultPath });
                      if (selected) updateFileSetting('vcpResourcesFolder', selected as string);
                    }}>Browse...</button>
                  </div>
                  <span className="help-text">Optional: Source folder for importing buttons/images. Leave blank if only shuffling existing elements</span>
                </div>

                <div className="setting-row">
                  <label>CNC base path</label>
                  <div className="folder-input-group">
                    <input type="text" value={localSettings.files.cncBasePath} onChange={(e) => updateFileSetting('cncBasePath', e.target.value)} placeholder="CNC deployment path (e.g., C:\cncm\resources\vcp)" />
                    <button className="folder-browse-button" onClick={async () => {
                      const { open } = await import('@tauri-apps/plugin-dialog');
                      const defaultPath = localSettings.files.cncBasePath || 'C:\\cncm\\resources\\vcp';
                      const selected = await open({ directory: true, multiple: false, title: 'Select CNC Base Path', defaultPath });
                      if (selected) updateFileSetting('cncBasePath', selected as string);
                    }}>Browse...</button>
                  </div>
                  <span className="help-text">Path where VCP files are deployed on the CNC machine</span>
                </div>

                <div className="settings-divider" />

                {devMode && (
                  <>
                    <div className="setting-row">
                      <label>
                        <input type="checkbox" checked={showDeveloperOptions} onChange={(e) => setShowDeveloperOptions(e.target.checked)} />
                        Show Advanced / Developer options
                      </label>
                    </div>

                    {showDeveloperOptions && (
                      <div className="settings-section developer-section">
                        <h4>Developer Attributions</h4>
                        <div className="setting-row">
                          <label className="noninteractive">Attributions (one per line)</label>
                          <textarea
                            value={(localSettings.attributions || []).join('\n')}
                            onChange={(e) => {
                              const lines = e.target.value.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                              const newSettings = { ...localSettings, attributions: lines } as AppSettings;
                              applyChange(newSettings);
                            }}
                            rows={6}
                            style={{ width: '100%' }}
                          />
                          <span className="help-text">These lines are developer-editable and will appear in the About dialog.</span>
                        </div>
                      </div>
                    )}
                  </>
                )}

              </div>
            )}

          </div>
        </div>

        <div className="settings-footer">
          <button className="settings-button settings-button-default" onClick={() => onSave(localSettings)}>Close</button>
        </div>
      </div>
    </div>
  );
}


