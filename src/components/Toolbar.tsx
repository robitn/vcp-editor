import React, { useRef } from "react";

// Global constant to detect if running on Windows
import { isWindows } from "../utils/platform";
import { useMenu, MenuItem } from "../utils/MenuService";
import "./Toolbar.css";

interface ToolbarProps {
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  canCut: boolean;
  canCopy: boolean;
  canPaste: boolean;
  canDelete: boolean;
  onAddBorder: () => void;
  onAddImage: () => void;
  onAddButton: () => void;
  canAddBorder: boolean;
  canAddImage: boolean;
  canAddButton: boolean;
  onSettings?: () => void;
  onAbout?: () => void;
}


const Toolbar: React.FC<ToolbarProps> = ({
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onCut,
  onCopy,
  onPaste,
  onDelete,
  canCut,
  canCopy,
  canPaste,
  canDelete,
  onAddBorder,
  onAddImage,
  onAddButton,
  canAddBorder,
  canAddImage,
  canAddButton,
  onSettings,
  onAbout,
}) => {
  return (
    <div className="toolbar">
      <button onClick={onNew} className="toolbar-button" data-title="New">
        <img src="/icons/new-file-regular-full.svg" alt="New" />
      </button>
      <button onClick={onOpen} className="toolbar-button" data-title="Open">
        <img src="/icons/open-file-regular-full.svg" alt="Open" />
      </button>
      <button onClick={onSave} className="toolbar-button" data-title="Save">
        <img src="/icons/save-drive-regular-full.svg" alt="Save" />
      </button>
      <button onClick={onSaveAs} className="toolbar-button" data-title="Save As">
        <img src="/icons/saveas-drive-regular-full.svg" alt="Save As" />
      </button>
      <div className="toolbar-separator"></div>
      <button onClick={onUndo} className="toolbar-button" disabled={!canUndo} data-title="Undo">
        <img src="/icons/undo-solid-full.svg" alt="Undo" />
      </button>
      <button onClick={onRedo} className="toolbar-button" disabled={!canRedo} data-title="Redo">
        <img src="/icons/redo-solid-full.svg" alt="Redo" />
      </button>
      <button onClick={onCut} className="toolbar-button" disabled={!canCut} data-title="Cut (Cmd+X)">
        <img src="/icons/cut-solid-full.svg" alt="Cut" />
      </button>
      <button onClick={onCopy} className="toolbar-button" disabled={!canCopy} data-title="Copy (Cmd+C)">
        <img src="/icons/copy-regular-full.svg" alt="Copy" />
      </button>
      <button onClick={onPaste} className="toolbar-button" disabled={!canPaste} data-title="Paste (Cmd+V)">
        <img src="/icons/paste-regular-full.svg" alt="Paste" />
      </button>
      <button onClick={onDelete} className="toolbar-button" disabled={!canDelete} data-title="Delete (Del)">
        <img src="/icons/delete-regular-full.svg" alt="Delete" />
      </button>
      <div className="toolbar-separator"></div>
      <button onClick={onAddBorder} className="toolbar-button toolbar-add" disabled={!canAddBorder} data-title="Add Border">
        + Border
      </button>
      <button onClick={onAddImage} className="toolbar-button toolbar-add" disabled={!canAddImage} data-title="Add Image">
        + Image
      </button>
      <button onClick={onAddButton} className="toolbar-button toolbar-add" disabled={!canAddButton} data-title="Add Button">
        + Button
      </button>

      {/* Windows-only Settings button with drop-down */}
      {isWindows && <ToolbarSettingsDropdown onSettings={onSettings} onAbout={onAbout} />}
    </div>
  );
};

// Windows-only settings dropdown using centralized menu service
const ToolbarSettingsDropdown: React.FC<{ onSettings?: () => void; onAbout?: () => void }> = ({ onSettings, onAbout }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { showDropdownMenu, hideMenu } = useMenu();

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const menuItems: MenuItem[] = [
      { id: 'settings', label: 'Settings', onClick: () => { onSettings?.(); hideMenu(); } },
      { id: 'about', label: 'About', onClick: () => { onAbout?.(); hideMenu(); } },
    ];

    if (buttonRef.current) {
      showDropdownMenu(menuItems, buttonRef.current, 'right');
    }
  };

  return (
    <button
      ref={buttonRef}
      className="toolbar-button toolbar-settings"
      onClick={handleSettingsClick}
      aria-haspopup="true"
      aria-label="Settings menu"
    >
      <img src="/icons/settings-gear.svg" alt="Settings" />
    </button>
  );
};

export default Toolbar;
