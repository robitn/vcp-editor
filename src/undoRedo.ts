import { VcpDocument } from "./types";

interface HistoryState {
  document: VcpDocument;
  timestamp: number;
}

export class UndoRedoManager {
  private undoStack: HistoryState[] = [];
  private redoStack: HistoryState[] = [];
  private maxHistorySize: number;
  private savedStateIndex: number = -1; // -1 means no saved state tracked

  constructor(maxHistorySize: number = 5) {
    this.maxHistorySize = maxHistorySize;
  }

  pushState(document: VcpDocument): void {
    // Add current state to undo stack
    this.undoStack.push({
      document: JSON.parse(JSON.stringify(document)), // Deep clone
      timestamp: Date.now(),
    });

    // Limit stack size to maxHistorySize
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift(); // Remove oldest entry
      // Adjust savedStateIndex if we removed the saved state
      if (this.savedStateIndex > 0) {
        this.savedStateIndex--;
      }
    }

    // Clear redo stack when new action is performed
    this.redoStack = [];
  }

  undo(currentDocument: VcpDocument): VcpDocument | null {
    if (this.undoStack.length === 0) return null;

    // Save current state to redo stack
    this.redoStack.push({
      document: JSON.parse(JSON.stringify(currentDocument)),
      timestamp: Date.now(),
    });

    // Limit redo stack size
    if (this.redoStack.length > this.maxHistorySize) {
      this.redoStack.shift();
    }

    // Pop and return previous state
    const previousState = this.undoStack.pop();
    return previousState ? previousState.document : null;
  }

  redo(currentDocument: VcpDocument): VcpDocument | null {
    if (this.redoStack.length === 0) return null;

    // Save current state to undo stack
    this.undoStack.push({
      document: JSON.parse(JSON.stringify(currentDocument)),
      timestamp: Date.now(),
    });

    // Limit undo stack size
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }

    // Pop and return next state
    const nextState = this.redoStack.pop();
    return nextState ? nextState.document : null;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.savedStateIndex = -1;
  }

  // Mark current position as saved (called when document is saved)
  markAsSaved(): void {
    this.savedStateIndex = this.undoStack.length - 1;
  }

  // Check if we're currently at the saved state
  isAtSavedState(): boolean {
    // If we marked the save at a time when undo stack was empty (savedStateIndex = -1),
    // we're at saved state when undo stack is also empty
    if (this.savedStateIndex === -1) {
      return this.undoStack.length === 0;
    }
    // Otherwise, we're at saved state if undo stack length matches the saved index + 1
    return this.undoStack.length === this.savedStateIndex + 1;
  }

  getUndoStackSize(): number {
    return this.undoStack.length;
  }

  getRedoStackSize(): number {
    return this.redoStack.length;
  }
}
