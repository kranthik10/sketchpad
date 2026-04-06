import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  ArrowType,
  ArrowheadStyle,
  CanvasTool,
  EdgeStyle,
  FontFamily,
  FillStyle,
  ShapeFillStyle,
  Sloppiness,
  StrokeStyle,
  TextAlign,
  ToastMessage,
  UiState,
  Viewport,
} from '../types/canvas';

interface UiActions {
  setActiveTool: (tool: CanvasTool) => void;
  toggleToolLock: () => void;
  setColor: (color: string) => void;
  setFill: (fill: FillStyle) => void;
  setSize: (size: number) => void;
  setOpacity: (opacity: number) => void;
  setEdges: (edges: EdgeStyle) => void;
  setFillStyle: (fillStyle: ShapeFillStyle) => void;
  setStrokeStyle: (strokeStyle: StrokeStyle) => void;
  setSloppiness: (sloppiness: Sloppiness) => void;
  setArrowType: (arrowType: ArrowType) => void;
  setStartArrowhead: (startArrowhead: ArrowheadStyle) => void;
  setEndArrowhead: (endArrowhead: ArrowheadStyle) => void;
  setFontFamily: (fontFamily: FontFamily) => void;
  setTextAlign: (textAlign: TextAlign) => void;
  setFontSize: (fontSize: number) => void;
  setCanvasBg: (canvasBg: string) => void;
  setViewport: (viewport: Viewport) => void;
  setMenuOpen: (menuOpen: boolean) => void;
  toggleMenu: () => void;
  setHelperOpen: (helperOpen: boolean) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
  resetUiStore: () => void;
}

export type UiStore = UiState & UiActions;

export const initialUiState: UiState = {
  activeTool: 'pencil',
  toolLock: false,
  color: '#1a1a2e',
  fill: 'none',
  size: 2,
  opacity: 1,
  edges: 'sharp',
  fillStyle: 'solid',
  strokeStyle: 'solid',
  sloppiness: 'architect',
  arrowType: 'straight',
  startArrowhead: 'none',
  endArrowhead: 'arrow',
  fontFamily: 'Caveat, cursive',
  textAlign: 'left',
  fontSize: 32,
  canvasBg: '#ffffff',
  viewport: {
    zoom: 1,
    panX: 0,
    panY: 0,
  },
  menuOpen: false,
  helperOpen: false,
  toast: null,
};

let toastIdCounter = 0;

function nextToast(message: string): ToastMessage {
  toastIdCounter += 1;
  return {
    id: toastIdCounter,
    message,
  };
}

function normalizeUiState(state: Partial<UiState> | undefined): UiState {
  const legacyArrowStart = (state as Partial<UiState> & { arrowStart?: ArrowheadStyle })
    ?.arrowStart;
  const legacyArrowEnd = (state as Partial<UiState> & { arrowEnd?: ArrowheadStyle })
    ?.arrowEnd;

  return {
    ...initialUiState,
    ...state,
    viewport: {
      ...initialUiState.viewport,
      ...state?.viewport,
    },
    fillStyle: state?.fillStyle ?? initialUiState.fillStyle,
    strokeStyle: state?.strokeStyle ?? initialUiState.strokeStyle,
    sloppiness: state?.sloppiness ?? initialUiState.sloppiness,
    arrowType: state?.arrowType ?? initialUiState.arrowType,
    startArrowhead: state?.startArrowhead ?? legacyArrowStart ?? initialUiState.startArrowhead,
    endArrowhead: state?.endArrowhead ?? legacyArrowEnd ?? initialUiState.endArrowhead,
    fontFamily: state?.fontFamily ?? initialUiState.fontFamily,
    textAlign: state?.textAlign ?? initialUiState.textAlign,
    fontSize: state?.fontSize ?? initialUiState.fontSize,
    toast: null,
    menuOpen: false,
    helperOpen: false,
  };
}

const UI_STORAGE_KEY = 'sketchpad-ui-store';
const UI_STORE_VERSION = 3;

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      ...initialUiState,
      setActiveTool: (activeTool) => set({ activeTool }),
      toggleToolLock: () => set((state) => ({ toolLock: !state.toolLock })),
      setColor: (color) => set({ color }),
      setFill: (fill) => set({ fill }),
      setSize: (size) => set({ size }),
      setOpacity: (opacity) => set({ opacity }),
      setEdges: (edges) => set({ edges }),
      setFillStyle: (fillStyle) => set({ fillStyle }),
      setStrokeStyle: (strokeStyle) => set({ strokeStyle }),
      setSloppiness: (sloppiness) => set({ sloppiness }),
      setArrowType: (arrowType) => set({ arrowType }),
      setStartArrowhead: (startArrowhead) => set({ startArrowhead }),
      setEndArrowhead: (endArrowhead) => set({ endArrowhead }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setTextAlign: (textAlign) => set({ textAlign }),
      setFontSize: (fontSize) => set({ fontSize }),
      setCanvasBg: (canvasBg) => set({ canvasBg }),
      setViewport: (viewport) => set({ viewport }),
      setMenuOpen: (menuOpen) => set({ menuOpen }),
      toggleMenu: () => set((state) => ({ menuOpen: !state.menuOpen })),
      setHelperOpen: (helperOpen) => set({ helperOpen }),
      showToast: (message) => set({ toast: nextToast(message) }),
      clearToast: () => set({ toast: null }),
      resetUiStore: () => set(initialUiState),
    }),
    {
      name: UI_STORAGE_KEY,
      version: UI_STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeTool: state.activeTool,
        toolLock: state.toolLock,
        color: state.color,
        fill: state.fill,
        size: state.size,
        opacity: state.opacity,
        edges: state.edges,
        fillStyle: state.fillStyle,
        strokeStyle: state.strokeStyle,
        sloppiness: state.sloppiness,
        arrowType: state.arrowType,
        startArrowhead: state.startArrowhead,
        endArrowhead: state.endArrowhead,
        fontFamily: state.fontFamily,
        textAlign: state.textAlign,
        fontSize: state.fontSize,
        canvasBg: state.canvasBg,
        viewport: state.viewport,
      }),
      migrate: (persistedState) =>
        normalizeUiState(persistedState as Partial<UiState> | undefined),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...normalizeUiState(persistedState as Partial<UiState> | undefined),
      }),
    },
  ),
);
