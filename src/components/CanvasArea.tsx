import { HelpCircle, Minus, Plus } from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createTextMeasure, renderScene, useCanvasRenderer } from '../hooks/useCanvasRenderer';
import { useCanvasStore } from '../stores/useCanvasStore';
import { useUiStore } from '../stores/useUiStore';
import type {
  ArrowElement,
  CanvasElement,
  CanvasTool,
  EllipseElement,
  LineElement,
  Point,
  PencilElement,
  RectElement,
  Viewport,
} from '../types/canvas';
import {
  detectTransformHandleAtPoint,
  getBoundingBox,
  getContentBounds,
  getCursorForHandle,
  getElementRotation,
  getPointAngle,
  getSelectionControls,
  hitTest,
  isBoundingBoxWithinMarquee,
  type LineHandle,
  moveLinearHandle,
  resizeElementFromHandle,
  screenToWorld,
  type ResizeHandle,
  toMarqueeBounds,
  translateElement,
  worldToScreen,
  zoomViewportAtPoint,
} from '../utils/canvasMath';

export interface CanvasAreaHandle {
  exportImage: () => void;
}

interface CanvasMetrics {
  width: number;
  height: number;
  pixelRatio: number;
}

interface TextInputState {
  worldX: number;
  worldY: number;
  value: string;
}

type DrawableElement =
  | PencilElement
  | LineElement
  | ArrowElement
  | RectElement
  | EllipseElement;

interface DrawingDefaults {
  color: string;
  fill: string;
  size: number;
  opacity: number;
  edges: 'sharp' | 'round';
  fillStyle: 'solid' | 'hachure' | 'cross-hatch';
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  sloppiness: 'architect' | 'artist' | 'cartoonist';
  arrowType: 'straight' | 'curve' | 'elbow';
  startArrowhead: 'none' | 'arrow' | 'triangle' | 'bar';
  endArrowhead: 'none' | 'arrow' | 'triangle' | 'bar';
}

type GestureState =
  | {
      type: 'pan';
      startClientX: number;
      startClientY: number;
      originViewport: Viewport;
    }
  | {
      type: 'selection-drag';
      startWorld: Point;
      originals: Map<string, CanvasElement>;
      didMove: boolean;
    }
  | {
      type: 'selection-box';
      startWorld: Point;
      currentWorld: Point;
    }
  | {
      type: 'draw';
      draft: DrawableElement;
    }
  | {
      type: 'erase';
      didErase: boolean;
    }
  | {
      type: 'transform';
      mode: 'resize';
      selectedId: string;
      original: CanvasElement;
      handle: ResizeHandle;
      didTransform: boolean;
    }
  | {
      type: 'transform';
      mode: 'rotate';
      selectedId: string;
      original: CanvasElement;
      rotationOffset: number;
      didTransform: boolean;
    }
  | {
      type: 'transform';
      mode: 'line-handle';
      selectedId: string;
      original: LineElement | ArrowElement;
      handle: LineHandle;
      didTransform: boolean;
    };

function buildElement(
  tool: CanvasTool,
  start: Point,
  defaults: DrawingDefaults,
): DrawableElement | null {
  const base = {
    id: crypto.randomUUID(),
    color: defaults.color,
    fill: defaults.fill,
    size: defaults.size,
    opacity: defaults.opacity,
    edges: defaults.edges,
    fillStyle: defaults.fillStyle,
    strokeStyle: defaults.strokeStyle,
    sloppiness: defaults.sloppiness,
    rotation: 0,
  };

  if (tool === 'pencil') {
    return {
      ...base,
      type: 'pencil',
      points: [start],
    };
  }

  if (tool === 'line') {
    return {
      ...base,
      type: 'line',
      arrowType: defaults.arrowType,
      x1: start.x,
      y1: start.y,
      x2: start.x,
      y2: start.y,
    };
  }

  if (tool === 'arrow') {
    return {
      ...base,
      type: 'arrow',
      arrowType: defaults.arrowType,
      startArrowhead: defaults.startArrowhead,
      endArrowhead: defaults.endArrowhead,
      x1: start.x,
      y1: start.y,
      x2: start.x,
      y2: start.y,
    };
  }

  if (tool === 'rect') {
    return {
      ...base,
      type: 'rect',
      x1: start.x,
      y1: start.y,
      x2: start.x,
      y2: start.y,
    };
  }

  if (tool === 'ellipse') {
    return {
      ...base,
      type: 'ellipse',
      x1: start.x,
      y1: start.y,
      x2: start.x,
      y2: start.y,
    };
  }

  return null;
}

function isLineHandle(handle: string): handle is LineHandle {
  return handle === 'drag-start' || handle === 'drag-midpoint' || handle === 'drag-end';
}

function isResizeHandle(handle: string): handle is ResizeHandle {
  return ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].includes(handle);
}

export const CanvasArea = forwardRef<CanvasAreaHandle>(function CanvasArea(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const gestureRef = useRef<GestureState | null>(null);

  const activeTool = useUiStore((state) => state.activeTool);
  const toolLock = useUiStore((state) => state.toolLock);
  const color = useUiStore((state) => state.color);
  const fill = useUiStore((state) => state.fill);
  const size = useUiStore((state) => state.size);
  const opacity = useUiStore((state) => state.opacity);
  const edges = useUiStore((state) => state.edges);
  const fillStyle = useUiStore((state) => state.fillStyle);
  const strokeStyle = useUiStore((state) => state.strokeStyle);
  const sloppiness = useUiStore((state) => state.sloppiness);
  const arrowType = useUiStore((state) => state.arrowType);
  const startArrowhead = useUiStore((state) => state.startArrowhead);
  const endArrowhead = useUiStore((state) => state.endArrowhead);
  const fontFamily = useUiStore((state) => state.fontFamily);
  const textAlign = useUiStore((state) => state.textAlign);
  const fontSize = useUiStore((state) => state.fontSize);
  const canvasBg = useUiStore((state) => state.canvasBg);
  const viewport = useUiStore((state) => state.viewport);
  const toast = useUiStore((state) => state.toast);
  const setActiveTool = useUiStore((state) => state.setActiveTool);
  const setViewport = useUiStore((state) => state.setViewport);
  const setHelperOpen = useUiStore((state) => state.setHelperOpen);
  const showToast = useUiStore((state) => state.showToast);
  const clearToast = useUiStore((state) => state.clearToast);

  const elements = useCanvasStore((state) => state.elements);
  const selectedIds = useCanvasStore((state) => state.selectedIds);
  const setElements = useCanvasStore((state) => state.setElements);
  const setSelection = useCanvasStore((state) => state.setSelection);
  const clearSelection = useCanvasStore((state) => state.clearSelection);
  const commitHistory = useCanvasStore((state) => state.commitHistory);
  const deleteSelection = useCanvasStore((state) => state.deleteSelection);
  const duplicateSelection = useCanvasStore((state) => state.duplicateSelection);
  const undo = useCanvasStore((state) => state.undo);
  const redo = useCanvasStore((state) => state.redo);

  const [canvasMetrics, setCanvasMetrics] = useState<CanvasMetrics>({
    width: 0,
    height: 0,
    pixelRatio: 1,
  });
  const [draftElement, setDraftElement] = useState<CanvasElement | null>(null);
  const [selectionBox, setSelectionBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [textInput, setTextInput] = useState<TextInputState | null>(null);

  const defaults = useMemo<DrawingDefaults>(
    () => ({
      color,
      fill,
      size,
      opacity,
      edges,
      fillStyle,
      strokeStyle,
      sloppiness,
      arrowType,
      startArrowhead,
      endArrowhead,
    }),
    [
      arrowType,
      color,
      edges,
      endArrowhead,
      fill,
      fillStyle,
      opacity,
      size,
      sloppiness,
      startArrowhead,
      strokeStyle,
    ],
  );

  const selectedElement = useMemo(() => {
    if (selectedIds.length !== 1) {
      return null;
    }

    return elements.find((element) => element.id === selectedIds[0]) ?? null;
  }, [elements, selectedIds]);

  const measureTextWidth = useCallback((text: string, textSize: number): number => {
    const ctx = canvasRef.current?.getContext('2d');

    if (!ctx) {
      return text.length * textSize * 0.62;
    }

    return createTextMeasure(ctx)(text, textSize);
  }, []);

  const getWorldPointFromPointer = useCallback(
    (event: PointerEvent | React.PointerEvent<HTMLCanvasElement>): Point => {
      const rect = canvasRef.current?.getBoundingClientRect();

      if (!rect) {
        return { x: 0, y: 0 };
      }

      return screenToWorld(
        event.clientX - rect.left,
        event.clientY - rect.top,
        viewport,
      );
    },
    [viewport],
  );

  const activateTool = useCallback(
    (tool: CanvasTool): void => {
      setActiveTool(tool);

      if (tool !== 'select') {
        clearSelection();
      }
    },
    [clearSelection, setActiveTool],
  );

  const commitText = useCallback((): void => {
    if (!textInput) {
      return;
    }

    const text = textInput.value.trim();
    setTextInput(null);

    if (text) {
      const nextElements = [
        ...useCanvasStore.getState().elements,
        {
          id: crypto.randomUUID(),
          type: 'text',
          text,
          x: textInput.worldX,
          y: textInput.worldY + fontSize,
          color,
          size,
          opacity,
          rotation: 0,
          fontFamily,
          textAlign,
          fontSize,
        } as const,
      ];

      setElements(nextElements);
      commitHistory(nextElements);
    }

    if (!toolLock) {
      activateTool('select');
    }
  }, [
    activateTool,
    color,
    commitHistory,
    fontFamily,
    fontSize,
    opacity,
    setElements,
    size,
    textAlign,
    textInput,
    toolLock,
  ]);

  const eraseAtPoint = useCallback(
    (point: Point): boolean => {
      const currentElements = useCanvasStore.getState().elements;
      const nextElements = currentElements.filter(
        (element) => !hitTest(element, point.x, point.y, measureTextWidth),
      );

      if (nextElements.length === currentElements.length) {
        return false;
      }

      setElements(nextElements);
      return true;
    },
    [measureTextWidth, setElements],
  );

  const replaceSelectedElement = useCallback(
    (selectedId: string, nextElement: CanvasElement): void => {
      setElements(
        useCanvasStore
          .getState()
          .elements.map((element) => (element.id === selectedId ? nextElement : element)),
      );
    },
    [setElements],
  );

  const setCanvasCursor = useCallback((cursor: string): void => {
    if (canvasRef.current) {
      canvasRef.current.style.cursor = cursor;
    }
  }, []);

  const updateHoverCursor = useCallback(
    (point: Point | null): void => {
      if (!point) {
        setCanvasCursor(activeTool === 'select' ? 'default' : '');
        return;
      }

      if (activeTool === 'select') {
        if (selectedElement) {
          const handle = detectTransformHandleAtPoint(
            selectedElement,
            point,
            measureTextWidth,
            viewport.zoom,
          );

          if (handle) {
            setCanvasCursor(getCursorForHandle(handle, getElementRotation(selectedElement)));
            return;
          }

          if (hitTest(selectedElement, point.x, point.y, measureTextWidth)) {
            setCanvasCursor('move');
            return;
          }
        } else if (selectedIds.length > 1) {
          const hitElement = [...elements]
            .reverse()
            .find((element) => hitTest(element, point.x, point.y, measureTextWidth));

          if (hitElement && selectedIds.includes(hitElement.id)) {
            setCanvasCursor('move');
            return;
          }
        }

        setCanvasCursor('default');
        return;
      }

      if (activeTool === 'pan') {
        setCanvasCursor('grab');
        return;
      }

      if (activeTool === 'text') {
        setCanvasCursor('text');
        return;
      }

      if (activeTool === 'eraser') {
        setCanvasCursor('cell');
        return;
      }

      setCanvasCursor('crosshair');
    },
    [
      activeTool,
      elements,
      measureTextWidth,
      selectedElement,
      selectedIds,
      setCanvasCursor,
      viewport.zoom,
    ],
  );

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;

    if (!wrap || !canvas) {
      return;
    }

    const updateCanvasSize = (): void => {
      const rect = wrap.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      const pixelRatio = window.devicePixelRatio || 1;

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));

      setCanvasMetrics({
        width,
        height,
        pixelRatio,
      });
    };

    const observer = new ResizeObserver(updateCanvasSize);
    observer.observe(wrap);
    updateCanvasSize();

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.body.classList.remove('dragging');
    updateHoverCursor(null);

    return () => {
      document.body.classList.remove('dragging');
    };
  }, [activeTool, updateHoverCursor]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => {
      clearToast();
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [clearToast, toast]);

  useEffect(() => {
    if (!textInput || !textAreaRef.current) {
      return;
    }

    const textArea = textAreaRef.current;
    textArea.focus();
    textArea.style.width = '120px';
    textArea.style.width = `${Math.max(120, textArea.scrollWidth)}px`;
  }, [textInput]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (textInput) {
        return;
      }

      const key = event.key.toLowerCase();
      const ctrl = event.ctrlKey || event.metaKey;

      if (ctrl && key === 'z') {
        event.preventDefault();
        undo();
        return;
      }

      if (ctrl && (key === 'y' || (event.shiftKey && key === 'z'))) {
        event.preventDefault();
        redo();
        return;
      }

      if (ctrl && key === 'a') {
        event.preventDefault();
        setSelection(useCanvasStore.getState().elements.map((element) => element.id));
        return;
      }

      if (ctrl && key === 'c') {
        event.preventDefault();
        duplicateSelection();
        showToast('Copied');
        return;
      }

      const toolMap: Record<string, CanvasTool> = {
        s: 'select',
        h: 'pan',
        p: 'pencil',
        l: 'line',
        r: 'rect',
        e: 'ellipse',
        a: 'arrow',
        t: 'text',
        x: 'eraser',
      };

      const nextTool = toolMap[key];

      if (nextTool && !ctrl) {
        activateTool(nextTool);
        return;
      }

      if ((key === 'delete' || key === 'backspace') && selectedIds.length) {
        event.preventDefault();
        deleteSelection();
        return;
      }

      if (key === 'escape') {
        clearSelection();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    activateTool,
    clearSelection,
    deleteSelection,
    duplicateSelection,
    redo,
    selectedIds.length,
    setSelection,
    showToast,
    textInput,
    undo,
  ]);

  useCanvasRenderer({
    canvasRef,
    width: canvasMetrics.width,
    height: canvasMetrics.height,
    pixelRatio: canvasMetrics.pixelRatio,
    viewport,
    canvasBg,
    elements,
    draftElement,
    selectedIds,
  });

  const finishGesture = useCallback((): void => {
    const gesture = gestureRef.current;

    if (!gesture) {
      return;
    }

    if (gesture.type === 'selection-drag' && gesture.didMove) {
      commitHistory();
    }

    if (gesture.type === 'selection-box') {
      const marquee = toMarqueeBounds(gesture.startWorld, gesture.currentWorld);
      const ids = useCanvasStore
        .getState()
        .elements.filter((element) => {
          const boundingBox = getBoundingBox(element, measureTextWidth);
          return boundingBox ? isBoundingBoxWithinMarquee(boundingBox, marquee) : false;
        })
        .map((element) => element.id);
      setSelection(ids);
      setSelectionBox(null);
    }

    if (gesture.type === 'erase' && gesture.didErase) {
      commitHistory();
    }

    if (gesture.type === 'draw') {
      const finalElement = gesture.draft;

      if (finalElement.type === 'pencil' && finalElement.points.length < 2) {
        setDraftElement(null);
        gestureRef.current = null;
        updateHoverCursor(null);
        return;
      }

      const nextElements = [...useCanvasStore.getState().elements, finalElement];
      setElements(nextElements);
      commitHistory(nextElements);
      setDraftElement(null);

      if (!toolLock) {
        activateTool('select');
      }
    }

    if (gesture.type === 'transform' && gesture.didTransform) {
      commitHistory();
    }

    gestureRef.current = null;
    document.body.classList.remove('dragging');
    updateHoverCursor(null);
  }, [
    activateTool,
    commitHistory,
    measureTextWidth,
    setElements,
    setSelection,
    toolLock,
    updateHoverCursor,
  ]);

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    if (textInput) {
      commitText();
    }

    const worldPoint = getWorldPointFromPointer(event);

    if (activeTool === 'pan') {
      gestureRef.current = {
        type: 'pan',
        startClientX: event.clientX,
        startClientY: event.clientY,
        originViewport: viewport,
      };
      document.body.classList.add('dragging');
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (activeTool === 'select') {
      if (selectedElement) {
        const handle = detectTransformHandleAtPoint(
          selectedElement,
          worldPoint,
          measureTextWidth,
          viewport.zoom,
        );

        if (handle) {
          const original = structuredClone(selectedElement) as CanvasElement;

          if (handle === 'rotate') {
            const controls = getSelectionControls(
              original,
              measureTextWidth,
              viewport.zoom,
            );

            if (controls) {
              gestureRef.current = {
                type: 'transform',
                mode: 'rotate',
                selectedId: original.id,
                original,
                rotationOffset:
                  getPointAngle(controls.center, worldPoint) -
                  getElementRotation(original),
                didTransform: false,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
              return;
            }
          } else if (
            isLineHandle(handle) &&
            (selectedElement.type === 'line' || selectedElement.type === 'arrow')
          ) {
            gestureRef.current = {
              type: 'transform',
              mode: 'line-handle',
              selectedId: original.id,
              original: original as LineElement | ArrowElement,
              handle,
              didTransform: false,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
            return;
          } else if (isResizeHandle(handle)) {
            gestureRef.current = {
              type: 'transform',
              mode: 'resize',
              selectedId: original.id,
              original,
              handle,
              didTransform: false,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
            return;
          }
        }
      }

      const hitElement = [...elements]
        .reverse()
        .find((element) => hitTest(element, worldPoint.x, worldPoint.y, measureTextWidth));

      if (hitElement && selectedIds.includes(hitElement.id)) {
        const originals = new Map<string, CanvasElement>();
        for (const element of elements) {
          if (selectedIds.includes(element.id)) {
            originals.set(element.id, structuredClone(element) as CanvasElement);
          }
        }

        gestureRef.current = {
          type: 'selection-drag',
          startWorld: worldPoint,
          originals,
          didMove: false,
        };
      } else if (hitElement) {
        setSelection([hitElement.id]);
        gestureRef.current = {
          type: 'selection-drag',
          startWorld: worldPoint,
          originals: new Map([
            [hitElement.id, structuredClone(hitElement) as CanvasElement],
          ]),
          didMove: false,
        };
      } else {
        clearSelection();
        gestureRef.current = {
          type: 'selection-box',
          startWorld: worldPoint,
          currentWorld: worldPoint,
        };
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (activeTool === 'eraser') {
      const didErase = eraseAtPoint(worldPoint);
      gestureRef.current = {
        type: 'erase',
        didErase,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (activeTool === 'text') {
      setTextInput({
        worldX: worldPoint.x,
        worldY: worldPoint.y,
        value: '',
      });
      return;
    }

    const nextDraft = buildElement(activeTool, worldPoint, defaults);

    if (!nextDraft) {
      return;
    }

    gestureRef.current = {
      type: 'draw',
      draft: nextDraft,
    };
    setDraftElement(nextDraft);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const worldPoint = getWorldPointFromPointer(event);
    const gesture = gestureRef.current;

    if (!gesture) {
      updateHoverCursor(worldPoint);
      return;
    }

    if (gesture.type === 'pan') {
      setViewport({
        ...gesture.originViewport,
        panX: gesture.originViewport.panX + (event.clientX - gesture.startClientX),
        panY: gesture.originViewport.panY + (event.clientY - gesture.startClientY),
      });
      return;
    }

    if (gesture.type === 'selection-drag') {
      const dx = worldPoint.x - gesture.startWorld.x;
      const dy = worldPoint.y - gesture.startWorld.y;

      if (dx !== 0 || dy !== 0) {
        gesture.didMove = true;
      }

      setElements(
        useCanvasStore.getState().elements.map((element) => {
          const original = gesture.originals.get(element.id);
          return original ? translateElement(original, dx, dy) : element;
        }),
      );
      return;
    }

    if (gesture.type === 'selection-box') {
      gesture.currentWorld = worldPoint;
      const startScreen = worldToScreen(
        gesture.startWorld.x,
        gesture.startWorld.y,
        viewport,
      );
      const currentScreen = worldToScreen(worldPoint.x, worldPoint.y, viewport);
      setSelectionBox({
        left: Math.min(startScreen.x, currentScreen.x),
        top: Math.min(startScreen.y, currentScreen.y),
        width: Math.abs(currentScreen.x - startScreen.x),
        height: Math.abs(currentScreen.y - startScreen.y),
      });
      return;
    }

    if (gesture.type === 'erase') {
      gesture.didErase = eraseAtPoint(worldPoint) || gesture.didErase;
      return;
    }

    if (gesture.type === 'draw') {
      const currentDraft = gesture.draft;
      let nextDraft: DrawableElement;

      if (currentDraft.type === 'pencil') {
        nextDraft = {
          ...currentDraft,
          points: [...currentDraft.points, worldPoint],
        };
      } else {
        nextDraft = {
          ...currentDraft,
          x2: worldPoint.x,
          y2: worldPoint.y,
        };
      }

      gesture.draft = nextDraft;
      setDraftElement(nextDraft);
      return;
    }

    if (gesture.type === 'transform') {
      if (gesture.mode === 'rotate') {
        const controls = getSelectionControls(
          gesture.original,
          measureTextWidth,
          viewport.zoom,
        );

        if (!controls) {
          return;
        }

        const nextRotation =
          getPointAngle(controls.center, worldPoint) - gesture.rotationOffset;

        replaceSelectedElement(gesture.selectedId, {
          ...gesture.original,
          rotation: nextRotation,
        });
        gesture.didTransform = true;
        return;
      }

      if (gesture.mode === 'line-handle') {
        replaceSelectedElement(
          gesture.selectedId,
          moveLinearHandle(
            gesture.original,
            gesture.handle,
            worldPoint,
            measureTextWidth,
          ),
        );
        gesture.didTransform = true;
        return;
      }

      replaceSelectedElement(
        gesture.selectedId,
        resizeElementFromHandle(
          gesture.original,
          gesture.handle,
          worldPoint,
          measureTextWidth,
          viewport.zoom,
        ),
      );
      gesture.didTransform = true;
    }
  };

  const handlePointerUp = (): void => {
    finishGesture();
  };

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>): void => {
    event.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const delta = event.deltaY > 0 ? -0.08 : 0.08;

    setViewport(
      zoomViewportAtPoint(
        viewport,
        delta,
        event.clientX - rect.left,
        event.clientY - rect.top,
      ),
    );
  };

  const changeZoom = (delta: number): void => {
    setViewport(
      zoomViewportAtPoint(
        viewport,
        delta,
        canvasMetrics.width / 2,
        canvasMetrics.height / 2,
      ),
    );
  };

  const resetZoom = (): void => {
    setViewport({
      zoom: 1,
      panX: 0,
      panY: 0,
    });
  };

  useImperativeHandle(
    ref,
    () => ({
      exportImage: () => {
        const exportCanvas = document.createElement('canvas');
        const exportCtx = exportCanvas.getContext('2d');

        if (!exportCtx) {
          return;
        }

        const measureText = createTextMeasure(exportCtx);
        const bounds = getContentBounds(elements, measureText);
        const pad = 40;
        exportCanvas.width = bounds.w + pad * 2 || 800;
        exportCanvas.height = bounds.h + pad * 2 || 600;

        renderScene({
          ctx: exportCtx,
          width: exportCanvas.width,
          height: exportCanvas.height,
          pixelRatio: 1,
          viewport: {
            zoom: 1,
            panX: pad - bounds.x,
            panY: pad - bounds.y,
          },
          canvasBg,
          elements,
          selectedIds: new Set<string>(),
          showSelection: false,
        });

        const link = document.createElement('a');
        link.download = 'sketchpad-export.png';
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
        showToast('Exported!');
      },
    }),
    [canvasBg, elements, showToast],
  );

  const textInputScreenPoint = textInput
    ? worldToScreen(textInput.worldX, textInput.worldY, viewport)
    : null;

  return (
    <div id="canvas-wrap" ref={wrapRef}>
      <canvas
        id="main-canvas"
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      />

      {selectionBox ? (
        <div
          id="sel-box"
          style={{
            display: 'block',
            left: selectionBox.left,
            top: selectionBox.top,
            width: selectionBox.width,
            height: selectionBox.height,
          }}
        />
      ) : null}

      {textInput && textInputScreenPoint ? (
        <textarea
          ref={textAreaRef}
          className="text-editor-overlay"
          rows={1}
          value={textInput.value}
          style={{
            left: `${textInputScreenPoint.x}px`,
            top: `${textInputScreenPoint.y - 2}px`,
            borderColor: color,
            fontFamily,
            textAlign,
            fontSize: `${fontSize * viewport.zoom}px`,
            color,
          }}
          onChange={(event) =>
            setTextInput((current) =>
              current
                ? {
                    ...current,
                    value: event.target.value,
                  }
                : current,
            )
          }
          onInput={(event) => {
            const target = event.currentTarget;
            target.style.width = '120px';
            target.style.width = `${Math.max(120, target.scrollWidth)}px`;
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setTextInput(null);
              if (!toolLock) {
                activateTool('select');
              }
            }

            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              commitText();
            }
          }}
        />
      ) : null}

      <div id="bottom-right-controls">
        <div id="zoom-controls">
          <button className="zoom-btn" type="button" onClick={() => changeZoom(-0.1)}>
            <Minus size={14} />
          </button>
          <button id="zoom-label" type="button" onClick={resetZoom}>
            {Math.round(viewport.zoom * 100)}%
          </button>
          <button className="zoom-btn" type="button" onClick={() => changeZoom(0.1)}>
            <Plus size={14} />
          </button>
        </div>

        <button
          className="icon-btn icon-only"
          type="button"
          title="Help & Shortcuts"
          onClick={() => setHelperOpen(true)}
        >
          <HelpCircle size={18} />
        </button>
      </div>

      <div id="toast" className={toast ? 'show' : ''}>
        {toast?.message}
      </div>
    </div>
  );
});
