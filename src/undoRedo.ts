import { VcpDocument } from "./types";

interface HistoryState {
  document: VcpDocument;
  timestamp: number;
}

export class UndoRedoManager {
  private undoStack: HistoryState[] = [];
  private redoStack: HistoryState[] = [];
  private maxHistorySize: number;

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
  }

  getUndoStackSize(): number {
    return this.undoStack.length;
  }

  getRedoStackSize(): number {
    return this.redoStack.length;
  }
}
