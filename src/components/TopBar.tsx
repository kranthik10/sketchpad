import { Eye, Menu, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { useCanvasStore } from '../stores/useCanvasStore';
import { useUiStore } from '../stores/useUiStore';
import { Toolbar } from './Toolbar';

interface TopBarProps {
  onExport: () => void;
  collaborationControls: ReactNode;
}

const backgroundSwatches = [
  '#ffffff',
  '#f8f9fa',
  '#f5faff',
  '#fffce8',
  '#fdf8f6',
];

export function TopBar({ onExport, collaborationControls }: TopBarProps) {
  const menuOpen = useUiStore((state) => state.menuOpen);
  const canvasBg = useUiStore((state) => state.canvasBg);
  const isReadOnly = useUiStore((state) => state.isReadOnly);
  const toggleMenu = useUiStore((state) => state.toggleMenu);
  const setMenuOpen = useUiStore((state) => state.setMenuOpen);
  const setHelperOpen = useUiStore((state) => state.setHelperOpen);
  const setCanvasBg = useUiStore((state) => state.setCanvasBg);
  const showToast = useUiStore((state) => state.showToast);
  const clearCanvas = useCanvasStore((state) => state.clearCanvas);
  const elements = useCanvasStore((state) => state.elements);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent): void => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (!menuRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [setMenuOpen]);

  const clearAll = (): void => {
    if (!elements.length) {
      return;
    }

    clearCanvas();
    showToast('Canvas cleared');
  };

  const openHelper = (): void => {
    setHelperOpen(true);
    setMenuOpen(false);
  };

  const exportCanvas = (): void => {
    onExport();
    setMenuOpen(false);
  };

  return (
    <header id="topbar">
      <div className="topbar-left" ref={menuRef}>
        <button
          className="hamburger-btn"
          type="button"
          title="Menu"
          onClick={toggleMenu}
        >
          <Menu size={24} />
        </button>

        <div id="hamburger-menu" className={`dropdown-menu ${menuOpen ? 'show' : ''}`}>
          <div className="dropdown-item no-hover menu-panel">
            <span className="menu-panel-title">Canvas Background</span>
            <div id="bg-swatches">
              {backgroundSwatches.map((swatch) => (
                <button
                  key={swatch}
                  className={`color-swatch ${canvasBg === swatch ? 'selected' : ''}`}
                  type="button"
                  style={{ background: swatch }}
                  data-bg={swatch}
                  aria-label={`Background ${swatch}`}
                  onClick={() => setCanvasBg(swatch)}
                />
              ))}

              <input
                id="custom-bg-color"
                className="color-input-swatch"
                type="color"
                value={canvasBg}
                title="Custom background"
                aria-label="Custom background"
                onChange={(event) => setCanvasBg(event.target.value)}
              />
            </div>
          </div>

          <div className="dropdown-divider" />

          <button className="dropdown-item" type="button" onClick={exportCanvas}>
            Export Image
          </button>
          <button className="dropdown-item" type="button" onClick={openHelper}>
            Help &amp; Shortcuts
          </button>
        </div>
      </div>

      <div className="topbar-center">
        {isReadOnly ? (
          <div className="view-only-badge">
            <Eye size={14} />
            View Only
          </div>
        ) : (
          <Toolbar />
        )}
      </div>

      <div className="topbar-right">
        {collaborationControls}
        {!isReadOnly && (
          <button className="icon-btn danger" type="button" onClick={clearAll}>
            <Trash2 size={16} />
            Clear
          </button>
        )}
      </div>
    </header>
  );
}
