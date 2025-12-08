import React from "react";
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
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  onNew, 
  onOpen, 
  onSave, 
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
  canAddButton
}) => {
  return (
    <div className="toolbar">
      <button onClick={onNew} className="toolbar-button" title="New">
        New
      </button>
      <button onClick={onOpen} className="toolbar-button" title="Open">
        Open
      </button>
      <button onClick={onSave} className="toolbar-button" title="Save">
        Save
      </button>
      <div className="toolbar-separator"></div>
      <button onClick={onUndo} className="toolbar-button" disabled={!canUndo} title="Undo">
        Undo
      </button>
      <button onClick={onRedo} className="toolbar-button" disabled={!canRedo} title="Redo">
        Redo
      </button>
      <button onClick={onCut} className="toolbar-button" disabled={!canCut} title="Cut (Cmd+X)">
        Cut
      </button>
      <button onClick={onCopy} className="toolbar-button" disabled={!canCopy} title="Copy (Cmd+C)">
        Copy
      </button>
      <button onClick={onPaste} className="toolbar-button" disabled={!canPaste} title="Paste (Cmd+V)">
        Paste
      </button>
      <button onClick={onDelete} className="toolbar-button" disabled={!canDelete} title="Delete (Del)">
        Delete
      </button>
      <div className="toolbar-separator"></div>
      <button onClick={onAddBorder} className="toolbar-button toolbar-add" disabled={!canAddBorder} title="Add Border">
        + Border
      </button>
      <button onClick={onAddImage} className="toolbar-button toolbar-add" disabled={!canAddImage} title="Add Image">
        + Image
      </button>
      <button onClick={onAddButton} className="toolbar-button toolbar-add" disabled={!canAddButton} title="Add Button">
        + Button
      </button>
    </div>
  );
};

export default Toolbar;
