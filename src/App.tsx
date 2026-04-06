import { useEffect, useRef } from 'react';
import { CanvasArea, type CanvasAreaHandle } from './components/CanvasArea';
import { HelperPopup } from './components/HelperPopup';
import { PropertiesPanel } from './components/PropertiesPanel';
import { TopBar } from './components/TopBar';
import { useUiStore } from './stores/useUiStore';

export function App() {
  const canvasBg = useUiStore((state) => state.canvasBg);
  const activeTool = useUiStore((state) => state.activeTool);
  const showToast = useUiStore((state) => state.showToast);
  const canvasAreaRef = useRef<CanvasAreaHandle | null>(null);
  const welcomeShownRef = useRef(false);

  useEffect(() => {
    document.body.dataset.tool = activeTool;
  }, [activeTool]);

  useEffect(() => {
    document.body.style.backgroundColor = canvasBg;
  }, [canvasBg]);

  useEffect(() => {
    if (welcomeShownRef.current) {
      return;
    }

    welcomeShownRef.current = true;
    showToast('Welcome to Sketchpad ✏️');
  }, [showToast]);

  return (
    <div id="app-shell">
      <TopBar onExport={() => canvasAreaRef.current?.exportImage()} />
      <div id="canvas-stage">
        <CanvasArea ref={canvasAreaRef} />
        <PropertiesPanel />
      </div>
      <HelperPopup />
    </div>
  );
}
