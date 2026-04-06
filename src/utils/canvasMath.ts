import type {
  ArrowElement,
  ArrowType,
  ArrowheadStyle,
  BoundingBox,
  CanvasElement,
  LineElement,
  LinearElement,
  Point,
  TextElement,
  Viewport,
} from '../types/canvas';

export interface MarqueeBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type MeasureTextWidth = (text: string, size: number) => number;
export type CornerHandle = 'nw' | 'ne' | 'se' | 'sw';
export type EdgeHandle = 'n' | 'e' | 's' | 'w';
export type ResizeHandle = CornerHandle | EdgeHandle;
export type LineHandle = 'drag-start' | 'drag-midpoint' | 'drag-end';
export type TransformHandle = ResizeHandle | LineHandle | 'rotate';

export interface SelectionControls {
  baseBounds: BoundingBox;
  frameBounds: BoundingBox;
  center: Point;
  rotation: number;
  corners: Record<CornerHandle, Point>;
  handles: Record<ResizeHandle | 'rotate', Point>;
  rotateStemStart: Point;
  handleRadiusWorld: number;
}

export interface LineHandleControls {
  baseBounds: BoundingBox;
  frameBounds: BoundingBox;
  center: Point;
  rotation: number;
  handles: Record<LineHandle | 'rotate', Point>;
  rotateStemStart: Point;
  handleRadiusWorld: number;
}

export interface ArrowheadGeometry {
  tip: Point;
  left: Point;
  right: Point;
}

const EPSILON = 0.0001;

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;
export const SELECTION_MIN_BOX_SCREEN = 24;
export const HANDLE_RADIUS_SCREEN = 5;
export const ROTATE_HANDLE_OFFSET_SCREEN = 28;

export const getTextFontSize = (size: number): number => Math.max(12, size * 6 + 10);

export const fallbackMeasureTextWidth: MeasureTextWidth = (text, size) =>
  text.length * size * 0.62;

export const clampZoom = (zoom: number): number =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

export function screenToWorld(
  screenX: number,
  screenY: number,
  viewport: Viewport,
): Point {
  return {
    x: (screenX - viewport.panX) / viewport.zoom,
    y: (screenY - viewport.panY) / viewport.zoom,
  };
}

export function worldToScreen(
  worldX: number,
  worldY: number,
  viewport: Viewport,
): Point {
  return {
    x: worldX * viewport.zoom + viewport.panX,
    y: worldY * viewport.zoom + viewport.panY,
  };
}

export function zoomViewportAtPoint(
  viewport: Viewport,
  zoomDelta: number,
  screenX: number,
  screenY: number,
): Viewport {
  const nextZoom = clampZoom(viewport.zoom + zoomDelta);
  return {
    zoom: nextZoom,
    panX: screenX - (screenX - viewport.panX) * (nextZoom / viewport.zoom),
    panY: screenY - (screenY - viewport.panY) * (nextZoom / viewport.zoom),
  };
}

export function getElementRotation(element: CanvasElement): number {
  return element.rotation ?? 0;
}

export function getBoxCenter(bounds: BoundingBox): Point {
  return {
    x: bounds.x + bounds.w / 2,
    y: bounds.y + bounds.h / 2,
  };
}

export function rotatePoint(point: Point, center: Point, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

export function inverseRotatePoint(
  point: Point,
  center: Point,
  angle: number,
): Point {
  return rotatePoint(point, center, -angle);
}

export function getPointAngle(center: Point, point: Point): number {
  return Math.atan2(point.y - center.y, point.x - center.x);
}

export function expandBounds(
  bounds: BoundingBox,
  expandX: number,
  expandY: number,
): BoundingBox {
  return {
    x: bounds.x - expandX,
    y: bounds.y - expandY,
    w: bounds.w + expandX * 2,
    h: bounds.h + expandY * 2,
  };
}

export function ensureMinimumBounds(
  bounds: BoundingBox,
  minWidth: number,
  minHeight: number,
): BoundingBox {
  const width = Math.max(bounds.w, minWidth);
  const height = Math.max(bounds.h, minHeight);

  return {
    x: bounds.x - (width - bounds.w) / 2,
    y: bounds.y - (height - bounds.h) / 2,
    w: width,
    h: height,
  };
}

function getTextBounds(
  element: TextElement,
  measureTextWidth: MeasureTextWidth,
): BoundingBox {
  const width = measureTextWidth(element.text ?? '', element.fontSize);
  let x = element.x;

  if (element.textAlign === 'center') {
    x -= width / 2;
  } else if (element.textAlign === 'right') {
    x -= width;
  }

  return {
    x,
    y: element.y - element.fontSize,
    w: width,
    h: element.fontSize + 10,
  };
}

function getDefaultLineMidpoint(element: LinearElement): Point {
  if (element.arrowType === 'curve') {
    return {
      x:
        element.midX ??
        (element.x1 + element.x2) / 2 - (element.y2 - element.y1) * 0.2,
      y:
        element.midY ??
        (element.y1 + element.y2) / 2 + (element.x2 - element.x1) * 0.2,
    };
  }

  if (element.arrowType === 'elbow') {
    const isHorizontal = Math.abs(element.x2 - element.x1) > Math.abs(element.y2 - element.y1);
    return {
      x: isHorizontal
        ? (element.midX ?? (element.x1 + element.x2) / 2)
        : (element.x1 + element.x2) / 2,
      y: isHorizontal
        ? (element.y1 + element.y2) / 2
        : (element.midY ?? (element.y1 + element.y2) / 2),
    };
  }

  return {
    x: element.midX ?? (element.x1 + element.x2) / 2,
    y: element.midY ?? (element.y1 + element.y2) / 2,
  };
}

export function getLineHandles(element: LineElement | ArrowElement): {
  mx: number;
  my: number;
} {
  const midpoint = getDefaultLineMidpoint(element);
  return { mx: midpoint.x, my: midpoint.y };
}

export function getBaseBoundingBox(
  element: CanvasElement,
  measureTextWidth: MeasureTextWidth = fallbackMeasureTextWidth,
): BoundingBox | null {
  if (element.type === 'pencil') {
    if (!element.points.length) {
      return null;
    }

    const xs = element.points.map((point) => point.x);
    const ys = element.points.map((point) => point.y);

    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
    };
  }

  if (element.type === 'line' || element.type === 'arrow') {
    const { mx, my } = getLineHandles(element);
    const minX = Math.min(element.x1, element.x2, mx);
    const maxX = Math.max(element.x1, element.x2, mx);
    const minY = Math.min(element.y1, element.y2, my);
    const maxY = Math.max(element.y1, element.y2, my);

    return {
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY,
    };
  }

  if (element.type === 'rect' || element.type === 'ellipse') {
    return {
      x: Math.min(element.x1, element.x2),
      y: Math.min(element.y1, element.y2),
      w: Math.abs(element.x2 - element.x1),
      h: Math.abs(element.y2 - element.y1),
    };
  }

  if (element.type === 'text') {
    return getTextBounds(element, measureTextWidth);
  }

  return null;
}

export function getRotatedCorners(
  bounds: BoundingBox,
  rotation: number,
): Record<CornerHandle, Point> {
  const center = getBoxCenter(bounds);

  return {
    nw: rotatePoint({ x: bounds.x, y: bounds.y }, center, rotation),
    ne: rotatePoint({ x: bounds.x + bounds.w, y: bounds.y }, center, rotation),
    se: rotatePoint(
      { x: bounds.x + bounds.w, y: bounds.y + bounds.h },
      center,
      rotation,
    ),
    sw: rotatePoint({ x: bounds.x, y: bounds.y + bounds.h }, center, rotation),
  };
}

export function getBoundingBox(
  element: CanvasElement,
  measureTextWidth: MeasureTextWidth = fallbackMeasureTextWidth,
): BoundingBox | null {
  const baseBounds = getBaseBoundingBox(element, measureTextWidth);

  if (!baseBounds) {
    return null;
  }

  const rotation = getElementRotation(element);

  if (rotation === 0) {
    return baseBounds;
  }

  const corners = Object.values(getRotatedCorners(baseBounds, rotation));
  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);

  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };
}

export function hitTest(
  element: CanvasElement,
  worldX: number,
  worldY: number,
  measureTextWidth: MeasureTextWidth = fallbackMeasureTextWidth,
): boolean {
  const baseBounds = getBaseBoundingBox(element, measureTextWidth);

  if (!baseBounds) {
    return false;
  }

  const rotation = getElementRotation(element);
  const center = getBoxCenter(baseBounds);
  const localPoint =
    rotation === 0
      ? { x: worldX, y: worldY }
      : inverseRotatePoint({ x: worldX, y: worldY }, center, rotation);
  const pad = Math.max(8, element.size * 2);

  return (
    localPoint.x >= baseBounds.x - pad &&
    localPoint.x <= baseBounds.x + baseBounds.w + pad &&
    localPoint.y >= baseBounds.y - pad &&
    localPoint.y <= baseBounds.y + baseBounds.h + pad
  );
}

export function translateElement(
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
      midX: typeof element.midX === 'number' ? element.midX + dx : undefined,
      midY: typeof element.midY === 'number' ? element.midY + dy : undefined,
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

export function toMarqueeBounds(
  start: Point,
  current: Point,
): MarqueeBounds {
  return {
    minX: Math.min(start.x, current.x),
    minY: Math.min(start.y, current.y),
    maxX: Math.max(start.x, current.x),
    maxY: Math.max(start.y, current.y),
  };
}

export function isBoundingBoxWithinMarquee(
  boundingBox: BoundingBox,
  marquee: MarqueeBounds,
): boolean {
  return (
    boundingBox.x >= marquee.minX &&
    boundingBox.y >= marquee.minY &&
    boundingBox.x + boundingBox.w <= marquee.maxX &&
    boundingBox.y + boundingBox.h <= marquee.maxY
  );
}

export function getArrowHeadPoints(
  from: Point,
  to: Point,
  size: number,
): ArrowheadGeometry {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, dx);
  const headLength = Math.max(size * 4, 16);

  return {
    tip: { x: to.x, y: to.y },
    left: {
      x: to.x - headLength * Math.cos(angle - 0.4),
      y: to.y - headLength * Math.sin(angle - 0.4),
    },
    right: {
      x: to.x - headLength * Math.cos(angle + 0.4),
      y: to.y - headLength * Math.sin(angle + 0.4),
    },
  };
}

export function getArrowheadGeometry(
  style: ArrowheadStyle,
  from: Point,
  to: Point,
  size: number,
): ArrowheadGeometry | null {
  if (style === 'none' || style === 'bar') {
    return null;
  }

  return getArrowHeadPoints(from, to, size);
}

export function getContentBounds(
  elements: CanvasElement[],
  measureTextWidth: MeasureTextWidth = fallbackMeasureTextWidth,
): BoundingBox {
  if (!elements.length) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const element of elements) {
    const boundingBox = getBoundingBox(element, measureTextWidth);

    if (!boundingBox) {
      continue;
    }

    minX = Math.min(minX, boundingBox.x);
    minY = Math.min(minY, boundingBox.y);
    maxX = Math.max(maxX, boundingBox.x + boundingBox.w);
    maxY = Math.max(maxY, boundingBox.y + boundingBox.h);
  }

  if (
    minX === Number.POSITIVE_INFINITY ||
    minY === Number.POSITIVE_INFINITY ||
    maxX === Number.NEGATIVE_INFINITY ||
    maxY === Number.NEGATIVE_INFINITY
  ) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  };
}

export function getSelectionControls(
  element: CanvasElement,
  measureTextWidth: MeasureTextWidth = fallbackMeasureTextWidth,
  zoom = 1,
): SelectionControls | null {
  const baseBounds = getBaseBoundingBox(element, measureTextWidth);

  if (!baseBounds) {
    return null;
  }

  const frameBounds = ensureMinimumBounds(
    baseBounds,
    SELECTION_MIN_BOX_SCREEN / zoom,
    SELECTION_MIN_BOX_SCREEN / zoom,
  );
  const center = getBoxCenter(frameBounds);
  const rotation = getElementRotation(element);
  const baseHandles = {
    nw: { x: frameBounds.x, y: frameBounds.y },
    n: { x: center.x, y: frameBounds.y },
    ne: { x: frameBounds.x + frameBounds.w, y: frameBounds.y },
    e: { x: frameBounds.x + frameBounds.w, y: center.y },
    se: { x: frameBounds.x + frameBounds.w, y: frameBounds.y + frameBounds.h },
    s: { x: center.x, y: frameBounds.y + frameBounds.h },
    sw: { x: frameBounds.x, y: frameBounds.y + frameBounds.h },
    w: { x: frameBounds.x, y: center.y },
    rotate: {
      x: center.x,
      y: frameBounds.y - ROTATE_HANDLE_OFFSET_SCREEN / zoom,
    },
  } satisfies Record<ResizeHandle | 'rotate', Point>;

  const corners = {
    nw: rotatePoint(baseHandles.nw, center, rotation),
    ne: rotatePoint(baseHandles.ne, center, rotation),
    se: rotatePoint(baseHandles.se, center, rotation),
    sw: rotatePoint(baseHandles.sw, center, rotation),
  } satisfies Record<CornerHandle, Point>;

  return {
    baseBounds,
    frameBounds,
    center,
    rotation,
    corners,
    handles: {
      nw: corners.nw,
      n: rotatePoint(baseHandles.n, center, rotation),
      ne: corners.ne,
      e: rotatePoint(baseHandles.e, center, rotation),
      se: corners.se,
      s: rotatePoint(baseHandles.s, center, rotation),
      sw: corners.sw,
      w: rotatePoint(baseHandles.w, center, rotation),
      rotate: rotatePoint(baseHandles.rotate, center, rotation),
    },
    rotateStemStart: rotatePoint(baseHandles.n, center, rotation),
    handleRadiusWorld: HANDLE_RADIUS_SCREEN / zoom,
  };
}

export function getLineHandleControls(
  element: LineElement | ArrowElement,
  measureTextWidth: MeasureTextWidth = fallbackMeasureTextWidth,
  zoom = 1,
): LineHandleControls | null {
  const baseBounds = getBaseBoundingBox(element, measureTextWidth);

  if (!baseBounds) {
    return null;
  }

  const frameBounds = ensureMinimumBounds(
    baseBounds,
    SELECTION_MIN_BOX_SCREEN / zoom,
    SELECTION_MIN_BOX_SCREEN / zoom,
  );
  const center = getBoxCenter(frameBounds);
  const rotation = getElementRotation(element);
  const { mx, my } = getLineHandles(element);

  return {
    baseBounds,
    frameBounds,
    center,
    rotation,
    handles: {
      'drag-start': rotatePoint({ x: element.x1, y: element.y1 }, center, rotation),
      'drag-midpoint': rotatePoint({ x: mx, y: my }, center, rotation),
      'drag-end': rotatePoint({ x: element.x2, y: element.y2 }, center, rotation),
      rotate: rotatePoint(
        { x: center.x, y: frameBounds.y - ROTATE_HANDLE_OFFSET_SCREEN / zoom },
        center,
        rotation,
      ),
    },
    rotateStemStart: rotatePoint({ x: center.x, y: frameBounds.y }, center, rotation),
    handleRadiusWorld: HANDLE_RADIUS_SCREEN / zoom,
  };
}

function getDistance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function detectTransformHandleAtPoint(
  element: CanvasElement,
  point: Point,
  measureTextWidth: MeasureTextWidth = fallbackMeasureTextWidth,
  zoom = 1,
): TransformHandle | null {
  if (element.type === 'line' || element.type === 'arrow') {
    const controls = getLineHandleControls(element, measureTextWidth, zoom);

    if (!controls) {
      return null;
    }

    const threshold = controls.handleRadiusWorld * 1.8;
    const orderedHandles: Array<LineHandle | 'rotate'> = [
      'rotate',
      'drag-midpoint',
      'drag-start',
      'drag-end',
    ];

    for (const handle of orderedHandles) {
      if (getDistance(controls.handles[handle], point) <= threshold) {
        return handle;
      }
    }

    return null;
  }

  const controls = getSelectionControls(element, measureTextWidth, zoom);

  if (!controls) {
    return null;
  }

  const threshold = controls.handleRadiusWorld * 1.8;
    const orderedHandles: Array<ResizeHandle | 'rotate'> = [
      'rotate',
      'nw',
      'n',
    'ne',
    'e',
    'se',
    's',
    'sw',
    'w',
  ];

  for (const handle of orderedHandles) {
    if (getDistance(controls.handles[handle], point) <= threshold) {
      return handle;
    }
  }

  return null;
}

export function getCursorForHandle(
  handle: TransformHandle,
  rotation: number,
): string {
  if (handle === 'rotate' || handle === 'drag-start' || handle === 'drag-end') {
    return 'crosshair';
  }

  if (handle === 'drag-midpoint') {
    return 'move';
  }

  const handleAngles: Record<ResizeHandle, number> = {
    n: 0,
    ne: 45,
    e: 90,
    se: 135,
    s: 180,
    sw: 225,
    w: 270,
    nw: 315,
  };
  const baseAngle = handleAngles[handle];
  let globalAngle = (baseAngle + (rotation * 180) / Math.PI) % 360;

  if (globalAngle < 0) {
    globalAngle += 360;
  }

  if (
    globalAngle >= 337.5 ||
    globalAngle < 22.5 ||
    (globalAngle >= 157.5 && globalAngle < 202.5)
  ) {
    return 'ns-resize';
  }

  if (
    (globalAngle >= 22.5 && globalAngle < 67.5) ||
    (globalAngle >= 202.5 && globalAngle < 247.5)
  ) {
    return 'nesw-resize';
  }

  if (
    (globalAngle >= 67.5 && globalAngle < 112.5) ||
    (globalAngle >= 247.5 && globalAngle < 292.5)
  ) {
    return 'ew-resize';
  }

  return 'nwse-resize';
}

function resizeBoundsFromHandle(
  sourceBounds: BoundingBox,
  handle: ResizeHandle,
  localPoint: Point,
  minSize: number,
): BoundingBox {
  const minX = sourceBounds.x;
  const minY = sourceBounds.y;
  const maxX = sourceBounds.x + sourceBounds.w;
  const maxY = sourceBounds.y + sourceBounds.h;

  if (handle === 'nw') {
    const nextMinX = Math.min(localPoint.x, maxX - minSize);
    const nextMinY = Math.min(localPoint.y, maxY - minSize);
    return {
      x: nextMinX,
      y: nextMinY,
      w: maxX - nextMinX,
      h: maxY - nextMinY,
    };
  }

  if (handle === 'n') {
    const nextMinY = Math.min(localPoint.y, maxY - minSize);
    return {
      x: minX,
      y: nextMinY,
      w: sourceBounds.w,
      h: maxY - nextMinY,
    };
  }

  if (handle === 'ne') {
    const nextMaxX = Math.max(localPoint.x, minX + minSize);
    const nextMinY = Math.min(localPoint.y, maxY - minSize);
    return {
      x: minX,
      y: nextMinY,
      w: nextMaxX - minX,
      h: maxY - nextMinY,
    };
  }

  if (handle === 'e') {
    const nextMaxX = Math.max(localPoint.x, minX + minSize);
    return {
      x: minX,
      y: minY,
      w: nextMaxX - minX,
      h: sourceBounds.h,
    };
  }

  if (handle === 'se') {
    const nextMaxX = Math.max(localPoint.x, minX + minSize);
    const nextMaxY = Math.max(localPoint.y, minY + minSize);
    return {
      x: minX,
      y: minY,
      w: nextMaxX - minX,
      h: nextMaxY - minY,
    };
  }

  if (handle === 's') {
    const nextMaxY = Math.max(localPoint.y, minY + minSize);
    return {
      x: minX,
      y: minY,
      w: sourceBounds.w,
      h: nextMaxY - minY,
    };
  }

  if (handle === 'sw') {
    const nextMinX = Math.min(localPoint.x, maxX - minSize);
    const nextMaxY = Math.max(localPoint.y, minY + minSize);
    return {
      x: nextMinX,
      y: minY,
      w: maxX - nextMinX,
      h: nextMaxY - minY,
    };
  }

  const nextMinX = Math.min(localPoint.x, maxX - minSize);
  return {
    x: nextMinX,
    y: minY,
    w: maxX - nextMinX,
    h: sourceBounds.h,
  };
}

function mapValueToRange(
  value: number,
  sourceStart: number,
  sourceLength: number,
  targetStart: number,
  targetLength: number,
): number {
  if (Math.abs(sourceLength) < EPSILON) {
    return targetStart + targetLength / 2;
  }

  return targetStart + ((value - sourceStart) / sourceLength) * targetLength;
}

function resizeElementToBounds(
  element: CanvasElement,
  sourceBounds: BoundingBox,
  targetBounds: BoundingBox,
): CanvasElement {
  if (element.type === 'pencil') {
    return {
      ...element,
      points: element.points.map((point) => ({
        x: mapValueToRange(
          point.x,
          sourceBounds.x,
          sourceBounds.w,
          targetBounds.x,
          targetBounds.w,
        ),
        y: mapValueToRange(
          point.y,
          sourceBounds.y,
          sourceBounds.h,
          targetBounds.y,
          targetBounds.h,
        ),
      })),
    };
  }

  if (element.type === 'rect' || element.type === 'ellipse') {
    return {
      ...element,
      x1: mapValueToRange(
        element.x1,
        sourceBounds.x,
        sourceBounds.w,
        targetBounds.x,
        targetBounds.w,
      ),
      y1: mapValueToRange(
        element.y1,
        sourceBounds.y,
        sourceBounds.h,
        targetBounds.y,
        targetBounds.h,
      ),
      x2: mapValueToRange(
        element.x2,
        sourceBounds.x,
        sourceBounds.w,
        targetBounds.x,
        targetBounds.w,
      ),
      y2: mapValueToRange(
        element.y2,
        sourceBounds.y,
        sourceBounds.h,
        targetBounds.y,
        targetBounds.h,
      ),
    };
  }

  if (element.type === 'text') {
    const scaleX =
      Math.abs(sourceBounds.w) < EPSILON ? 1 : targetBounds.w / sourceBounds.w;
    const scaleY =
      Math.abs(sourceBounds.h) < EPSILON ? 1 : targetBounds.h / sourceBounds.h;
    const nextScale = Math.max(0.25, Math.min(8, Math.min(scaleX, scaleY)));

    return {
      ...element,
      x: mapValueToRange(
        element.x,
        sourceBounds.x,
        sourceBounds.w,
        targetBounds.x,
        targetBounds.w,
      ),
      y: mapValueToRange(
        element.y,
        sourceBounds.y,
        sourceBounds.h,
        targetBounds.y,
        targetBounds.h,
      ),
      fontSize: Math.max(12, element.fontSize * nextScale),
    };
  }

  return element;
}

export function resizeElementFromHandle(
  element: CanvasElement,
  handle: ResizeHandle,
  pointer: Point,
  measureTextWidth: MeasureTextWidth = fallbackMeasureTextWidth,
  zoom = 1,
): CanvasElement {
  const controls = getSelectionControls(element, measureTextWidth, zoom);

  if (!controls) {
    return element;
  }

  const localPointer = inverseRotatePoint(pointer, controls.center, controls.rotation);
  const nextFrameBounds = resizeBoundsFromHandle(
    controls.frameBounds,
    handle,
    localPointer,
    12 / zoom,
  );

  return resizeElementToBounds(element, controls.frameBounds, nextFrameBounds);
}

export function moveLinearHandle(
  element: LineElement | ArrowElement,
  handle: LineHandle,
  pointer: Point,
  measureTextWidth: MeasureTextWidth = fallbackMeasureTextWidth,
): LineElement | ArrowElement {
  const baseBounds = getBaseBoundingBox(element, measureTextWidth);

  if (!baseBounds) {
    return element;
  }

  const center = getBoxCenter(baseBounds);
  const localPoint = inverseRotatePoint(pointer, center, getElementRotation(element));

  if (handle === 'drag-start') {
    return {
      ...element,
      x1: localPoint.x,
      y1: localPoint.y,
      midX: undefined,
      midY: undefined,
    };
  }

  if (handle === 'drag-end') {
    return {
      ...element,
      x2: localPoint.x,
      y2: localPoint.y,
      midX: undefined,
      midY: undefined,
    };
  }

  if (element.arrowType === 'elbow') {
    const isHorizontal = Math.abs(element.x2 - element.x1) > Math.abs(element.y2 - element.y1);
    return {
      ...element,
      midX: isHorizontal ? localPoint.x : element.midX,
      midY: isHorizontal ? element.midY : localPoint.y,
    };
  }

  if (element.arrowType === 'straight') {
    const midpoint = getDefaultLineMidpoint(element);
    const dx = localPoint.x - midpoint.x;
    const dy = localPoint.y - midpoint.y;

    return {
      ...element,
      x1: element.x1 + dx,
      y1: element.y1 + dy,
      x2: element.x2 + dx,
      y2: element.y2 + dy,
      midX: undefined,
      midY: undefined,
    };
  }

  return {
    ...element,
    midX: localPoint.x,
    midY: localPoint.y,
  };
}

export function getArrowheadAngle(type: ArrowType, element: LineElement | ArrowElement): {
  start: number;
  end: number;
} {
  const { mx, my } = getLineHandles(element);

  if (type === 'curve') {
    const cpX = 2 * mx - element.x1 / 2 - element.x2 / 2;
    const cpY = 2 * my - element.y1 / 2 - element.y2 / 2;
    return {
      start: Math.atan2(element.y1 - cpY, element.x1 - cpX),
      end: Math.atan2(element.y2 - cpY, element.x2 - cpX),
    };
  }

  if (type === 'elbow') {
    const isHorizontal = Math.abs(element.x2 - element.x1) > Math.abs(element.y2 - element.y1);
    if (isHorizontal) {
      return {
        start: Math.atan2(0, element.x1 - mx),
        end: Math.atan2(0, element.x2 - mx),
      };
    }

    return {
      start: Math.atan2(element.y1 - my, 0),
      end: Math.atan2(element.y2 - my, 0),
    };
  }

  return {
    start: Math.atan2(element.y1 - my, element.x1 - mx),
    end: Math.atan2(element.y2 - my, element.x2 - mx),
  };
}
