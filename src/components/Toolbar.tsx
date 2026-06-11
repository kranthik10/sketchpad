import {
  ArrowRight,
  Circle,
  Eraser,
  Hand,
  Lock,
  MousePointer2,
  Pencil,
  Slash,
  Square,
  Type,
  Diamond,
  Image,
  MoreHorizontal,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useCanvasStore } from '../stores/useCanvasStore';
import { useUiStore } from '../stores/useUiStore';
import type { CanvasTool } from '../types/canvas';

interface ToolConfig {
  tool: CanvasTool;
  title: string;
  keyLabel: string;
  Icon: typeof MousePointer2;
  hint: ReactNode;
}

const tools: ToolConfig[] = [
  {
    tool: 'pan',
    title: 'Hand (H)',
    keyLabel: 'H',
    Icon: Hand,
    hint: 'Click and drag to pan around the canvas',
  },
  {
    tool: 'select',
    title: 'Selection (S)',
    keyLabel: 'S',
    Icon: MousePointer2,
    hint: <>To move canvas, hold <kbd>Scroll wheel</kbd> or <kbd>Space</kbd> while dragging, or use the hand tool</>,
  },
  {
    tool: 'rect',
    title: 'Rectangle (R)',
    keyLabel: 'R',
    Icon: Square,
    hint: 'Click and drag to draw a rectangle, release when done',
  },
  {
    tool: 'diamond',
    title: 'Diamond (D)',
    keyLabel: 'D',
    Icon: Diamond,
    hint: 'Click and drag to draw a diamond, release when done',
  },
  {
    tool: 'ellipse',
    title: 'Ellipse (E)',
    keyLabel: 'E',
    Icon: Circle,
    hint: 'Click and drag to draw an ellipse, release when done',
  },
  {
    tool: 'arrow',
    title: 'Arrow (A)',
    keyLabel: 'A',
    Icon: ArrowRight,
    hint: <>Click to start, drag to set endpoint, release to finish. Press <kbd>A</kbd> again to change arrow type</>,
  },
  {
    tool: 'line',
    title: 'Line (L)',
    keyLabel: 'L',
    Icon: Slash,
    hint: 'Click to start, drag to set endpoint, release to finish',
  },
  {
    tool: 'pencil',
    title: 'Draw (P)',
    keyLabel: 'P',
    Icon: Pencil,
    hint: 'Click and drag, release when you are finished',
  },
  {
    tool: 'text',
    title: 'Text (T)',
    keyLabel: 'T',
    Icon: Type,
    hint: 'Tip: you can also add text by double-clicking anywhere with the selection tool',
  },
  {
    tool: 'image',
    title: 'Image (I)',
    keyLabel: 'I',
    Icon: Image,
    hint: 'Click on the canvas to select and upload an image',
  },
  {
    tool: 'eraser',
    title: 'Eraser (X)',
    keyLabel: 'X',
    Icon: Eraser,
    hint: <>Click and drag over elements to delete. Hold <kbd>Option</kbd> to revert elements marked for deletion</>,
  },
  {
    tool: 'more',
    title: 'More tools',
    keyLabel: 'M',
    Icon: MoreHorizontal,
    hint: 'Additional tools and utilities',
  },
];

export function Toolbar() {
  const activeTool = useUiStore((state) => state.activeTool);
  const toolLock = useUiStore((state) => state.toolLock);
  const setActiveTool = useUiStore((state) => state.setActiveTool);
  const toggleToolLock = useUiStore((state) => state.toggleToolLock);
  const clearSelection = useCanvasStore((state) => state.clearSelection);

  const selectTool = (tool: CanvasTool): void => {
    if (tool === 'more') {
      useUiStore.getState().showToast('More tools coming soon! 🚀');
      return;
    }
    setActiveTool(tool);

    if (tool !== 'select') {
      clearSelection();
    }
  };

  const activeToolConfig = tools.find((t) => t.tool === activeTool);
  const activeHint = activeToolConfig?.hint ?? '';

  return (
    <div id="toolbar">
      <button
        id="lock-btn"
        className={`tool-btn ${toolLock ? 'active' : ''}`}
        type="button"
        title="Lock Tool"
        onClick={toggleToolLock}
      >
        <Lock size={18} />
      </button>

      {tools.map(({ tool, title, keyLabel, Icon }) => (
        <button
          key={tool}
          className={`tool-btn ${activeTool === tool ? 'active' : ''}`}
          type="button"
          title={title}
          data-key={keyLabel}
          onClick={() => selectTool(tool)}
        >
          <Icon size={18} />
        </button>
      ))}

      {activeHint && (
        <div className="toolbar-hint">
          {activeHint}
        </div>
      )}
    </div>
  );
}
