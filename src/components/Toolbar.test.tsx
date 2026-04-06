import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCanvasStore } from '../stores/useCanvasStore';
import { useUiStore } from '../stores/useUiStore';
import { Toolbar } from './Toolbar';

describe('Toolbar', () => {
  beforeEach(() => {
    localStorage.clear();
    useUiStore.getState().resetUiStore();
    useCanvasStore.getState().resetCanvasStore();
  });

  it('switches tools and clears selection for non-select tools', async () => {
    const user = userEvent.setup();

    useCanvasStore.getState().setSelection(['shape-1']);
    render(<Toolbar />);

    await user.click(screen.getByTitle('Rectangle (R)'));

    expect(useUiStore.getState().activeTool).toBe('rect');
    expect(useCanvasStore.getState().selectedIds).toEqual([]);
  });
});
