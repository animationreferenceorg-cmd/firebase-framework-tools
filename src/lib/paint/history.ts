import type { Layer } from './types';
import { cloneCanvas } from './engine';

export interface LayerSnapshot {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: Layer['blendMode'];
  canvas: HTMLCanvasElement;
  alphaLocked?: boolean;
  mask?: HTMLCanvasElement;
  maskEnabled?: boolean;
}

const MAX_HISTORY = 40;

/**
 * Full-state undo/redo. Snapshots clone every layer's canvas, which is
 * simple and correct at the cost of memory — acceptable for a bounded
 * history depth and typical canvas sizes in a browser session.
 */
export class HistoryManager {
  private undoStack: LayerSnapshot[][] = [];
  private redoStack: LayerSnapshot[][] = [];

  snapshot(layers: Layer[]) {
    this.redoStack = [];
    this.undoStack.push(HistoryManager.clone(layers));
    if (this.undoStack.length > MAX_HISTORY) {
      this.undoStack.shift();
    }
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(currentLayers: Layer[]): LayerSnapshot[] | null {
    const prev = this.undoStack.pop();
    if (!prev) return null;
    this.redoStack.push(HistoryManager.clone(currentLayers));
    return prev;
  }

  redo(currentLayers: Layer[]): LayerSnapshot[] | null {
    const next = this.redoStack.pop();
    if (!next) return null;
    this.undoStack.push(HistoryManager.clone(currentLayers));
    return next;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }

  private static clone(layers: Layer[]): LayerSnapshot[] {
    return layers.map((l) => ({
      id: l.id,
      name: l.name,
      visible: l.visible,
      opacity: l.opacity,
      blendMode: l.blendMode,
      canvas: cloneCanvas(l.canvas),
      alphaLocked: l.alphaLocked,
      mask: l.mask ? cloneCanvas(l.mask) : undefined,
      maskEnabled: l.maskEnabled,
    }));
  }
}
