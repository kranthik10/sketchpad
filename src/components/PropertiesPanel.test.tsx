import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCanvasStore } from '../stores/useCanvasStore';
import { useUiStore } from '../stores/useUiStore';
import { PropertiesPanel } from './PropertiesPanel';

describe('PropertiesPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    useUiStore.getState().resetUiStore();
    useCanvasStore.getState().resetCanvasStore();
  });

  it('hides for selection mode', () => {
    useUiStore.getState().setActiveTool('select');
    const { container } = render(<PropertiesPanel />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows rect-specific controls', () => {
    useUiStore.getState().setActiveTool('rect');
    render(<PropertiesPanel />);

    expect(screen.getByText('Stroke')).toBeInTheDocument();
    expect(screen.getByText('Stroke Width')).toBeInTheDocument();
    expect(screen.getByText('Edges')).toBeInTheDocument();
    expect(screen.getByText('Background')).toBeInTheDocument();
    expect(screen.getByText('Fill Style')).toBeInTheDocument();
    expect(screen.getByText('Opacity')).toBeInTheDocument();
  });

  it('shows arrowhead controls for arrow defaults', () => {
    useUiStore.getState().setActiveTool('arrow');
    render(<PropertiesPanel />);

    expect(screen.getByText('Arrowheads')).toBeInTheDocument();
    expect(screen.getByText('Arrow Type')).toBeInTheDocument();
    expect(screen.getByText('->')).toBeInTheDocument();
  });
});
