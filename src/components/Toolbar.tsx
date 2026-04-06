import {
  ArrowRight,
  Circle,
  Eraser,
  Hand,
  Lock,
  MousePointer2,
  Pencil,
  Redo2,
  Slash,
  Square,
  Type,
  Undo2,
} from 'lucide-react';
import { useCanvasStore } from '../stores/useCanvasStore';
import { useUiStore } from '../stores/useUiStore';
import type { CanvasTool } from '../types/canvas';

interface ToolConfig {
  tool: CanvasTool;
  title: string;
  keyLabel: string;
  Icon: typeof MousePointer2;
}

const tools: ToolConfig[] = [
  { tool: 'select', title: 'Select (S)', keyLabel: 'S', Icon: MousePointer2 },
  { tool: 'pan', title: 'Pan (H)', keyLabel: 'H', Icon: Hand },
  { tool: 'pencil', title: 'Pencil (P)', keyLabel: 'P', Icon: Pencil },
  { tool: 'line', title: 'Line (L)', keyLabel: 'L', Icon: Slash },
  { tool: 'rect', title: 'Rectangle (R)', keyLabel: 'R', Icon: Square },
  { tool: 'ellipse', title: 'Ellipse (E)', keyLabel: 'E', Icon: Circle },
  { tool: 'arrow', title: 'Arrow (A)', keyLabel: 'A', Icon: ArrowRight },
  { tool: 'text', title: 'Text (T)', keyLabel: 'T', Icon: Type },
  { tool: 'eraser', title: 'Eraser (X)', keyLabel: 'X', Icon: Eraser },
];

export function Toolbar() {
  const activeTool = useUiStore((state) => state.activeTool);
  const toolLock = useUiStore((state) => state.toolLock);
  const setActiveTool = useUiStore((state) => state.setActiveTool);
  const toggleToolLock = useUiStore((state) => state.toggleToolLock);
  const undo = useCanvasStore((state) => state.undo);
  const redo = useCanvasStore((state) => state.redo);
  const clearSelection = useCanvasStore((state) => state.clearSelection);

  const selectTool = (tool: CanvasTool): void => {
    setActiveTool(tool);

    if (tool !== 'select') {
      clearSelection();
    }
  };

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

      <div className="toolbar-divider" />

      <button
        className="tool-btn"
        type="button"
        title="Undo (Ctrl+Z)"
        onClick={undo}
      >
        <Undo2 size={18} />
      </button>
      <button
        className="tool-btn"
        type="button"
        title="Redo (Ctrl+Y)"
        onClick={redo}
      >
        <Redo2 size={18} />
      </button>

      <div className="toolbar-divider" />

      {tools.slice(0, 2).map(({ tool, title, keyLabel, Icon }) => (
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

      <div className="toolbar-divider" />

      {tools.slice(2, 8).map(({ tool, title, keyLabel, Icon }) => (
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

      <div className="toolbar-divider" />

      {tools.slice(8).map(({ tool, title, keyLabel, Icon }) => (
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
    </div>
  );
}
