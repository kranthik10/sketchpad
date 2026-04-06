import { beforeEach, describe, expect, it } from 'vitest';
import type { CanvasElement } from '../types/canvas';
import { useCanvasStore } from './useCanvasStore';

const makeRect = (id: string): CanvasElement => ({
  id,
  type: 'rect',
  color: '#111',
  fill: 'none',
  edges: 'sharp',
  fillStyle: 'solid',
  size: 2,
  opacity: 1,
  rotation: 0,
  strokeStyle: 'solid',
  sloppiness: 'architect',
  x1: 0,
  y1: 0,
  x2: 20,
  y2: 20,
});

describe('useCanvasStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useCanvasStore.getState().resetCanvasStore();
  });

  it('tracks history and supports undo/redo with branching', () => {
    const first = makeRect('1');
    const second = makeRect('2');
    const branch = makeRect('3');

    useCanvasStore.getState().setElements([first]);
    useCanvasStore.getState().commitHistory([first]);
    useCanvasStore.getState().setElements([first, second]);
    useCanvasStore.getState().commitHistory([first, second]);

    useCanvasStore.getState().undo();
    expect(useCanvasStore.getState().elements).toEqual([first]);

    useCanvasStore.getState().setElements([first, branch]);
    useCanvasStore.getState().commitHistory([first, branch]);

    expect(useCanvasStore.getState().history).toHaveLength(3);
    expect(useCanvasStore.getState().elements).toEqual([first, branch]);

    useCanvasStore.getState().redo();
    expect(useCanvasStore.getState().elements).toEqual([first, branch]);
  });

  it('deletes the current selection and commits history', () => {
    const first = makeRect('1');
    const second = makeRect('2');

    useCanvasStore.getState().setElements([first, second]);
    useCanvasStore.getState().commitHistory([first, second]);
    useCanvasStore.getState().setSelection(['2']);
    useCanvasStore.getState().deleteSelection();

    expect(useCanvasStore.getState().elements).toEqual([first]);
    expect(useCanvasStore.getState().selectedIds).toEqual([]);
    expect(useCanvasStore.getState().historyIndex).toBe(2);
  });

  it('clears the canvas and resets selection', () => {
    const first = makeRect('1');

    useCanvasStore.getState().setElements([first]);
    useCanvasStore.getState().commitHistory([first]);
    useCanvasStore.getState().setSelection(['1']);
    useCanvasStore.getState().clearCanvas();

    expect(useCanvasStore.getState().elements).toEqual([]);
    expect(useCanvasStore.getState().selectedIds).toEqual([]);
    expect(useCanvasStore.getState().historyIndex).toBe(2);
  });

  it('persists document state to localStorage', () => {
    const first = makeRect('persisted');

    useCanvasStore.getState().setElements([first]);
    useCanvasStore.getState().commitHistory([first]);

    const stored = localStorage.getItem('sketchpad-canvas-store');
    expect(stored).toContain('persisted');
    expect(stored).toContain('"rotation":0');
  });
});
