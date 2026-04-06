export type CanvasTool =
  | 'select'
  | 'pan'
  | 'pencil'
  | 'line'
  | 'rect'
  | 'ellipse'
  | 'arrow'
  | 'text'
  | 'eraser';

export type EdgeStyle = 'sharp' | 'round';
export type FillStyle = 'none' | string;
export type ShapeFillStyle = 'solid' | 'hachure' | 'cross-hatch';
export type StrokeStyle = 'solid' | 'dashed' | 'dotted';
export type Sloppiness = 'architect' | 'artist' | 'cartoonist';
export type ArrowType = 'straight' | 'curve' | 'elbow';
export type ArrowheadStyle = 'none' | 'arrow' | 'triangle' | 'bar';
export type TextAlign = 'left' | 'center' | 'right';
export type FontFamily = 'Caveat, cursive' | 'sans-serif' | 'DM Mono, monospace' | string;

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Viewport {
  zoom: number;
  panX: number;
  panY: number;
}

export interface BaseCanvasElement {
  id: string;
  color: string;
  size: number;
  opacity: number;
  rotation: number;
  fill?: FillStyle;
  edges?: EdgeStyle;
  fillStyle?: ShapeFillStyle;
  strokeStyle?: StrokeStyle;
  sloppiness?: Sloppiness;
}

export interface PencilElement extends BaseCanvasElement {
  type: 'pencil';
  points: Point[];
}

export interface LinearElement extends BaseCanvasElement {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  arrowType: ArrowType;
  midX?: number;
  midY?: number;
}

export interface LineElement extends LinearElement {
  type: 'line';
}

export interface ArrowElement extends LinearElement {
  type: 'arrow';
  startArrowhead: ArrowheadStyle;
  endArrowhead: ArrowheadStyle;
}

export interface RectElement extends BaseCanvasElement {
  type: 'rect';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  fill: FillStyle;
  edges: EdgeStyle;
}

export interface EllipseElement extends BaseCanvasElement {
  type: 'ellipse';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  fill: FillStyle;
}

export interface TextElement {
  id: string;
  type: 'text';
  text: string;
  x: number;
  y: number;
  color: string;
  size: number;
  opacity: number;
  rotation: number;
  fontFamily: FontFamily;
  textAlign: TextAlign;
  fontSize: number;
}

export type CanvasElement =
  | PencilElement
  | LineElement
  | ArrowElement
  | RectElement
  | EllipseElement
  | TextElement;

export interface ToastMessage {
  id: number;
  message: string;
}

export interface UiState {
  activeTool: CanvasTool;
  toolLock: boolean;
  color: string;
  fill: FillStyle;
  size: number;
  opacity: number;
  edges: EdgeStyle;
  fillStyle: ShapeFillStyle;
  strokeStyle: StrokeStyle;
  sloppiness: Sloppiness;
  arrowType: ArrowType;
  startArrowhead: ArrowheadStyle;
  endArrowhead: ArrowheadStyle;
  fontFamily: FontFamily;
  textAlign: TextAlign;
  fontSize: number;
  canvasBg: string;
  viewport: Viewport;
  menuOpen: boolean;
  helperOpen: boolean;
  toast: ToastMessage | null;
}

export interface CanvasState {
  elements: CanvasElement[];
  selectedIds: string[];
  history: CanvasElement[][];
  historyIndex: number;
}
