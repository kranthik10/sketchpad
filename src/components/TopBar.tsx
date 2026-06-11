import {
  Eye,
  Menu,
  Trash2,
  FolderOpen,
  Download,
  Image,
  Users,
  Zap,
  Search,
  HelpCircle,
  LogIn,
  Sliders,
  Sun,
  Moon,
  Laptop,
  ChevronDown,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useCanvasStore } from '../stores/useCanvasStore';
import { useUiStore } from '../stores/useUiStore';
import { useCollaborationStore } from '../stores/useCollaborationStore';
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

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('sketchpad-theme') as 'light' | 'dark' | 'system') || 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      document.body.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
    } else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemDark) {
        root.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        root.classList.remove('dark');
        document.body.classList.remove('dark');
      }
    }
    localStorage.setItem('sketchpad-theme', theme);
  }, [theme]);

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

  const triggerOpen = (): void => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target?.result as string);
          if (Array.isArray(parsed)) {
            useCanvasStore.getState().commitHistory(parsed);
            showToast('Canvas loaded');
          } else {
            showToast('Invalid canvas file');
          }
        } catch (err) {
          showToast('Failed to parse canvas file');
        }
      };
      reader.readAsText(file);
    };
    fileInput.click();
    setMenuOpen(false);
  };

  const triggerSave = (): void => {
    const blob = new Blob([JSON.stringify(elements, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sketchpad.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Canvas saved');
    setMenuOpen(false);
  };

  const triggerLiveCollaboration = (): void => {
    useCollaborationStore.getState().setModalOpen(true);
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
          <button className="dropdown-item" type="button" onClick={triggerOpen}>
            <div className="dropdown-item-left">
              <FolderOpen size={16} />
              <span>Open</span>
            </div>
            <span className="dropdown-item-shortcut">Cmd+O</span>
          </button>

          <button className="dropdown-item" type="button" onClick={triggerSave}>
            <div className="dropdown-item-left">
              <Download size={16} />
              <span>Save to...</span>
            </div>
          </button>

          <button className="dropdown-item" type="button" onClick={exportCanvas}>
            <div className="dropdown-item-left">
              <Image size={16} />
              <span>Export image...</span>
            </div>
            <span className="dropdown-item-shortcut">Cmd+Shift+E</span>
          </button>

          <button className="dropdown-item" type="button" onClick={triggerLiveCollaboration}>
            <div className="dropdown-item-left">
              <Users size={16} />
              <span>Live collaboration...</span>
            </div>
          </button>

          <button className="dropdown-item purple-theme" type="button" onClick={() => { showToast('Command palette coming soon!'); setMenuOpen(false); }}>
            <div className="dropdown-item-left">
              <Zap size={16} />
              <span>Command palette</span>
            </div>
            <span className="dropdown-item-shortcut">Cmd+/</span>
          </button>

          <button className="dropdown-item" type="button" onClick={() => { showToast('Search coming soon!'); setMenuOpen(false); }}>
            <div className="dropdown-item-left">
              <Search size={16} />
              <span>Find on canvas</span>
            </div>
            <span className="dropdown-item-shortcut">Cmd+F</span>
          </button>

          <button className="dropdown-item" type="button" onClick={openHelper}>
            <div className="dropdown-item-left">
              <HelpCircle size={16} />
              <span>Help</span>
            </div>
            <span className="dropdown-item-shortcut">?</span>
          </button>

          <button className="dropdown-item" type="button" onClick={() => { clearAll(); setMenuOpen(false); }}>
            <div className="dropdown-item-left">
              <Trash2 size={16} />
              <span>Reset the canvas</span>
            </div>
          </button>

          <div className="dropdown-divider" />

          <a className="dropdown-item" href="https://excalidraw.com" target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>
            <div className="dropdown-item-left">
              <Zap size={16} />
              <span>Excalidraw+</span>
            </div>
          </a>

          <a className="dropdown-item" href="https://github.com" target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>
            <div className="dropdown-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
              <span>GitHub</span>
            </div>
          </a>

          <a className="dropdown-item" href="https://twitter.com" target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>
            <div className="dropdown-item-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></svg>
              <span>Follow us</span>
            </div>
          </a>

          <a className="dropdown-item" href="https://discord.gg" target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>
            <div className="dropdown-item-left">
              <svg viewBox="0 0 127.14 96.36" fill="currentColor" width="16" height="16"><path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.88-.65,1.72-1.34,2.51-2a75.58,75.58,0,0,0,73,0c.79.69,1.63,1.39,2.51,2a68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C129.86,48.86,123.63,26,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.9,46,53.9,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.14,46,96.14,53,91,65.69,84.69,65.69Z"/></svg>
              <span>Discord chat</span>
            </div>
          </a>

          <button className="dropdown-item purple-theme" type="button" onClick={() => { showToast('Sign up coming soon!'); setMenuOpen(false); }}>
            <div className="dropdown-item-left">
              <LogIn size={16} />
              <span>Sign up</span>
            </div>
          </button>

          <div className="dropdown-divider" />

          <button className="dropdown-item" type="button" onClick={() => showToast('Preferences coming soon!')}>
            <div className="dropdown-item-left">
              <Sliders size={16} />
              <span>Preferences</span>
            </div>
            <span className="dropdown-item-shortcut">&gt;</span>
          </button>

          <div className="menu-theme-row">
            <span className="menu-theme-label">Theme</span>
            <div className="theme-toggle-group">
              <button
                className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`}
                type="button"
                title="Light mode"
                onClick={() => setTheme('light')}
              >
                <Sun size={14} />
              </button>
              <button
                className={`theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`}
                type="button"
                title="Dark mode"
                onClick={() => setTheme('dark')}
              >
                <Moon size={14} />
              </button>
              <button
                className={`theme-toggle-btn ${theme === 'system' ? 'active' : ''}`}
                type="button"
                title="System theme"
                onClick={() => setTheme('system')}
              >
                <Laptop size={14} />
              </button>
            </div>
          </div>

          <div className="menu-lang-row">
            <button className="lang-dropdown-btn" type="button" onClick={() => showToast('Language selection is English only')}>
              <span>English</span>
              <ChevronDown size={14} />
            </button>
          </div>

          <div className="dropdown-item no-hover menu-panel">
            <span className="menu-panel-title">Canvas background</span>
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
