import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanvasElement } from '../types/canvas';
import { useCanvasStore } from '../stores/useCanvasStore';
import { useUiStore } from '../stores/useUiStore';
import { TopBar } from './TopBar';

const makeElement = (): CanvasElement => ({
  id: 'rect-1',
  type: 'rect',
  color: '#111',
  fill: 'none',
  edges: 'sharp',
  size: 2,
  opacity: 1,
  rotation: 0,
  x1: 0,
  y1: 0,
  x2: 20,
  y2: 20,
});

describe('TopBar', () => {
  beforeEach(() => {
    localStorage.clear();
    useUiStore.getState().resetUiStore();
    useCanvasStore.getState().resetCanvasStore();
  });

  it('toggles the menu and wires export/help/clear actions', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();

    useCanvasStore.getState().setElements([makeElement()]);
    render(<TopBar collaborationControls={null} onExport={onExport} />);

    await user.click(screen.getByTitle('Menu'));
    expect(screen.getByText('Export Image')).toBeInTheDocument();

    await user.click(screen.getByText('Export Image'));
    expect(onExport).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTitle('Menu'));
    await user.click(screen.getByText('Help & Shortcuts'));
    expect(useUiStore.getState().helperOpen).toBe(true);

    await user.click(screen.getByRole('button', { name: /clear/i }));
    expect(useCanvasStore.getState().elements).toEqual([]);
  });
});
