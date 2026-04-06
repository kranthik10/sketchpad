import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  ArrowElement,
  ArrowType,
  ArrowheadStyle,
  CanvasElement,
  CanvasState,
  EdgeStyle,
  FillStyle,
  FontFamily,
  ShapeFillStyle,
  Sloppiness,
  StrokeStyle,
  TextAlign,
} from '../types/canvas';

interface CanvasActions {
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, nextElement: CanvasElement) => void;
  setElements: (elements: CanvasElement[]) => void;
  setSelection: (selectedIds: string[]) => void;
  clearSelection: () => void;
  duplicateSelection: () => void;
  deleteSelection: () => void;
  clearCanvas: () => void;
  commitHistory: (elements?: CanvasElement[]) => void;
  undo: () => void;
  redo: () => void;
  resetCanvasStore: () => void;
}

export type CanvasStore = CanvasState & CanvasActions;

export const initialCanvasState: CanvasState = {
  elements: [],
  selectedIds: [],
  history: [[]],
  historyIndex: 0,
};

function cloneElements(elements: CanvasElement[]): CanvasElement[] {
  return structuredClone(elements) as CanvasElement[];
}

function mapLegacyArrowhead(style: ArrowheadStyle | 'line' | undefined): ArrowheadStyle {
  if (style === 'line') {
    return 'arrow';
  }

  return style ?? 'none';
}

function getDefaultFill(fill?: FillStyle): FillStyle {
  return typeof fill === 'string' ? fill : 'none';
}

function getDefaultEdgeStyle(edges?: EdgeStyle): EdgeStyle {
  return edges ?? 'sharp';
}

function getDefaultShapeFillStyle(fillStyle?: ShapeFillStyle): ShapeFillStyle {
  return fillStyle ?? 'solid';
}

function getDefaultStrokeStyle(strokeStyle?: StrokeStyle): StrokeStyle {
  return strokeStyle ?? 'solid';
}

function getDefaultSloppiness(sloppiness?: Sloppiness): Sloppiness {
  return sloppiness ?? 'architect';
}

function getDefaultArrowType(arrowType?: ArrowType): ArrowType {
  return arrowType ?? 'straight';
}

function getDefaultFontFamily(fontFamily?: FontFamily): FontFamily {
  return fontFamily ?? 'Caveat, cursive';
}

function getDefaultTextAlign(textAlign?: TextAlign): TextAlign {
  return textAlign ?? 'left';
}

function normalizeCanvasElement(element: CanvasElement): CanvasElement {
  const legacyElement = element as Partial<CanvasElement> & { angle?: number };
  const baseRotation =
    typeof legacyElement.rotation === 'number'
      ? legacyElement.rotation
      : typeof legacyElement.angle === 'number'
        ? legacyElement.angle
        : 0;

  if (element.type === 'arrow') {
    const arrow = element as Partial<ArrowElement> &
      ArrowElement & {
        arrowStart?: ArrowheadStyle | 'line';
        arrowEnd?: ArrowheadStyle | 'line';
      };
    return {
      ...arrow,
      rotation: baseRotation,
      fill: getDefaultFill(arrow.fill),
      edges: getDefaultEdgeStyle(arrow.edges),
      fillStyle: getDefaultShapeFillStyle(arrow.fillStyle),
      strokeStyle: getDefaultStrokeStyle(arrow.strokeStyle),
      sloppiness: getDefaultSloppiness(arrow.sloppiness),
      arrowType: getDefaultArrowType(arrow.arrowType),
      startArrowhead: arrow.startArrowhead ?? mapLegacyArrowhead(arrow.arrowStart),
      endArrowhead:
        arrow.endArrowhead ?? mapLegacyArrowhead(arrow.arrowEnd) ?? 'arrow',
    };
  }

  if (element.type === 'text') {
    return {
      ...element,
      rotation: baseRotation,
      fontFamily: getDefaultFontFamily(element.fontFamily),
      textAlign: getDefaultTextAlign(element.textAlign),
      fontSize:
        typeof element.fontSize === 'number'
          ? element.fontSize
          : Math.max(12, element.size * 6 + 10),
    };
  }

  if (element.type === 'line') {
    return {
      ...element,
      rotation: baseRotation,
      fill: getDefaultFill(element.fill),
      edges: getDefaultEdgeStyle(element.edges),
      fillStyle: getDefaultShapeFillStyle(element.fillStyle),
      strokeStyle: getDefaultStrokeStyle(element.strokeStyle),
      sloppiness: getDefaultSloppiness(element.sloppiness),
      arrowType: getDefaultArrowType(element.arrowType),
    };
  }

  return {
    ...element,
    rotation: baseRotation,
    fill: getDefaultFill(element.fill),
    edges: getDefaultEdgeStyle(element.edges),
    fillStyle: getDefaultShapeFillStyle(element.fillStyle),
    strokeStyle: getDefaultStrokeStyle(element.strokeStyle),
    sloppiness: getDefaultSloppiness(element.sloppiness),
  };
}

function normalizeElements(elements: CanvasElement[] | undefined): CanvasElement[] {
  return (elements ?? []).map((element) => normalizeCanvasElement(element));
}

function normalizeCanvasState(
  state: Partial<CanvasState> | undefined,
): CanvasState {
  const elements = normalizeElements(state?.elements);
  const history =
    state?.history?.map((snapshot) => normalizeElements(snapshot)) ??
    [cloneElements(elements)];

  return {
    elements,
    selectedIds: [],
    history: history.length ? history : [[]],
    historyIndex:
      typeof state?.historyIndex === 'number'
        ? Math.min(state.historyIndex, Math.max(history.length - 1, 0))
        : Math.max(history.length - 1, 0),
  };
}

function pushHistory(
  history: CanvasElement[][],
  historyIndex: number,
  elements: CanvasElement[],
): Pick<CanvasState, 'history' | 'historyIndex'> {
  const nextHistory = history.slice(0, historyIndex + 1);
  nextHistory.push(cloneElements(elements));

  return {
    history: nextHistory,
    historyIndex: nextHistory.length - 1,
  };
}

const CANVAS_STORAGE_KEY = 'sketchpad-canvas-store';
const CANVAS_STORE_VERSION = 3;

export const useCanvasStore = create<CanvasStore>()(
  persist(
    (set) => ({
      ...initialCanvasState,
      addElement: (element) =>
        set((state) => ({
          elements: [...state.elements, normalizeCanvasElement(element)],
        })),
      updateElement: (id, nextElement) =>
        set((state) => ({
          elements: state.elements.map((element) =>
            element.id === id ? normalizeCanvasElement(nextElement) : element,
          ),
        })),
      setElements: (elements) => set({ elements: normalizeElements(elements) }),
      setSelection: (selectedIds) =>
        set({
          selectedIds: Array.from(new Set(selectedIds)),
        }),
      clearSelection: () => set({ selectedIds: [] }),
      duplicateSelection: () =>
        set((state) => {
          if (!state.selectedIds.length) {
            return {};
          }

          const nextSelectedIds: string[] = [];
          const offset = 20;
          const duplicates = state.elements.flatMap((element) => {
            if (!state.selectedIds.includes(element.id)) {
              return [];
            }

            const duplicate = normalizeCanvasElement({
              ...translateElementForDuplicate(element, offset, offset),
              id: crypto.randomUUID(),
            });
            nextSelectedIds.push(duplicate.id);
            return [duplicate];
          });

          if (!duplicates.length) {
            return {};
          }

          const nextElements = [...state.elements, ...duplicates];
          const nextHistory = pushHistory(
            state.history,
            state.historyIndex,
            nextElements,
          );

          return {
            elements: nextElements,
            selectedIds: nextSelectedIds,
            ...nextHistory,
          };
        }),
      deleteSelection: () =>
        set((state) => {
          if (!state.selectedIds.length) {
            return {};
          }

          const nextElements = state.elements.filter(
            (element) => !state.selectedIds.includes(element.id),
          );
          const nextHistory = pushHistory(
            state.history,
            state.historyIndex,
            nextElements,
          );

          return {
            elements: nextElements,
            selectedIds: [],
            ...nextHistory,
          };
        }),
      clearCanvas: () =>
        set((state) => {
          if (!state.elements.length) {
            return {};
          }

          const nextElements: CanvasElement[] = [];
          const nextHistory = pushHistory(
            state.history,
            state.historyIndex,
            nextElements,
          );

          return {
            elements: nextElements,
            selectedIds: [],
            ...nextHistory,
          };
        }),
      commitHistory: (elements) =>
        set((state) => {
          const nextElements = normalizeElements(elements ?? state.elements);
          const nextHistory = pushHistory(
            state.history,
            state.historyIndex,
            nextElements,
          );

          return {
            elements: nextElements,
            ...nextHistory,
          };
        }),
      undo: () =>
        set((state) => {
          if (state.historyIndex <= 0) {
            return {};
          }

          const nextHistoryIndex = state.historyIndex - 1;

          return {
            elements: cloneElements(state.history[nextHistoryIndex] ?? []),
            historyIndex: nextHistoryIndex,
            selectedIds: [],
          };
        }),
      redo: () =>
        set((state) => {
          if (state.historyIndex >= state.history.length - 1) {
            return {};
          }

          const nextHistoryIndex = state.historyIndex + 1;

          return {
            elements: cloneElements(state.history[nextHistoryIndex] ?? []),
            historyIndex: nextHistoryIndex,
            selectedIds: [],
          };
        }),
      resetCanvasStore: () => set(initialCanvasState),
    }),
    {
      name: CANVAS_STORAGE_KEY,
      version: CANVAS_STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        elements: state.elements,
        history: state.history,
        historyIndex: state.historyIndex,
      }),
      migrate: (persistedState) =>
        normalizeCanvasState(persistedState as Partial<CanvasState> | undefined),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...normalizeCanvasState(persistedState as Partial<CanvasState> | undefined),
      }),
    },
  ),
);

export const getCanvasState = (): CanvasStore => useCanvasStore.getState();

function translateElementForDuplicate(
  element: CanvasElement,
  dx: number,
  dy: number,
): CanvasElement {
  if (element.type === 'pencil') {
    return {
      ...element,
      points: element.points.map((point) => ({
        x: point.x + dx,
        y: point.y + dy,
      })),
    };
  }

  if (
    element.type === 'line' ||
    element.type === 'arrow'
  ) {
    return {
      ...element,
      x1: element.x1 + dx,
      y1: element.y1 + dy,
      x2: element.x2 + dx,
      y2: element.y2 + dy,
      midX: element.midX === undefined ? undefined : element.midX + dx,
      midY: element.midY === undefined ? undefined : element.midY + dy,
    };
  }

  if (element.type === 'rect' || element.type === 'ellipse') {
    return {
      ...element,
      x1: element.x1 + dx,
      y1: element.y1 + dy,
      x2: element.x2 + dx,
      y2: element.y2 + dy,
    };
  }

  return {
    ...element,
    x: element.x + dx,
    y: element.y + dy,
  };
}
