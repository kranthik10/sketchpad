import { useEffect } from 'react';
import type { RefObject } from 'react';
import type {
  ArrowElement,
  ArrowheadStyle,
  CanvasElement,
  LineElement,
  Point,
  TextElement,
  Viewport,
} from '../types/canvas';
import {
  getArrowheadAngle,
  getBaseBoundingBox,
  getBoxCenter,
  getElementRotation,
  getLineHandleControls,
  getLineHandles,
  getSelectionControls,
} from '../utils/canvasMath';

type StyledShapeElement = Exclude<CanvasElement, TextElement>;

export interface RenderSceneOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  pixelRatio?: number;
  viewport: Viewport;
  canvasBg: string;
  elements: CanvasElement[];
  draftElement?: CanvasElement | null;
  selectedIds?: Set<string>;
  showSelection?: boolean;
}

const patternCache = new WeakMap<CanvasRenderingContext2D, Map<string, CanvasPattern>>();

export function getTextFont(
  fontSize: number,
  fontFamily = 'Caveat, cursive',
  scale = 1,
): string {
  return `${fontSize * scale}px ${fontFamily}`;
}

export function createTextMeasure(ctx: CanvasRenderingContext2D) {
  return (text: string, size: number): number => {
    ctx.save();
    ctx.font = getTextFont(size);
    const width = ctx.measureText(text).width;
    ctx.restore();
    return width;
  };
}

function getContextPatternCache(ctx: CanvasRenderingContext2D): Map<string, CanvasPattern> {
  const existing = patternCache.get(ctx);
  if (existing) {
    return existing;
  }

  const next = new Map<string, CanvasPattern>();
  patternCache.set(ctx, next);
  return next;
}

function getPattern(
  ctx: CanvasRenderingContext2D,
  color: string,
  mode: 'hachure' | 'cross-hatch',
): CanvasPattern | null {
  const key = `${mode}:${color}`;
  const cache = getContextPatternCache(ctx);
  const cached = cache.get(key);

  if (cached) {
    return cached;
  }

  const patternCanvas = document.createElement('canvas');
  patternCanvas.width = 10;
  patternCanvas.height = 10;
  const patternCtx = patternCanvas.getContext('2d');

  if (!patternCtx) {
    return null;
  }

  patternCtx.strokeStyle = color;
  patternCtx.lineWidth = 1.5;
  patternCtx.beginPath();
  patternCtx.moveTo(0, 10);
  patternCtx.lineTo(10, 0);
  if (mode === 'cross-hatch') {
    patternCtx.moveTo(0, 0);
    patternCtx.lineTo(10, 10);
  }
  patternCtx.stroke();

  const pattern = ctx.createPattern(patternCanvas, 'repeat');
  if (pattern) {
    cache.set(key, pattern);
  }
  return pattern;
}

function toSeed(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash) + 1;
}

function getRng(seedValue: string): () => number {
  let seed = toSeed(seedValue) % 2147483647;
  if (seed <= 0) {
    seed += 2147483646;
  }

  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

function getOffset(rng: () => number, amount: number): number {
  return (rng() - 0.5) * amount;
}

function drawRoughLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  element: StyledShapeElement,
  rng: () => number,
): void {
  if (element.sloppiness === 'architect') {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    return;
  }

  const isArtist = element.sloppiness === 'artist';
  const passes = isArtist ? 3 : 1;
  const wobble = isArtist ? 2 : 4;
  const overshoot = isArtist ? 0 : Math.max(5, element.size * 2);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  const nx = length > 0 ? dx / length : 0;
  const ny = length > 0 ? dy / length : 0;

  for (let index = 0; index < passes; index += 1) {
    const ox1 = x1 - nx * overshoot + getOffset(rng, wobble);
    const oy1 = y1 - ny * overshoot + getOffset(rng, wobble);
    const ox2 = x2 + nx * overshoot + getOffset(rng, wobble);
    const oy2 = y2 + ny * overshoot + getOffset(rng, wobble);
    const mx = (x1 + x2) / 2 + getOffset(rng, wobble * 3);
    const my = (y1 + y2) / 2 + getOffset(rng, wobble * 3);

    ctx.moveTo(ox1, oy1);
    ctx.quadraticCurveTo(mx, my, ox2, oy2);
  }
}

function drawRoughPathForLinear(
  ctx: CanvasRenderingContext2D,
  element: LineElement | ArrowElement,
  rng: () => number,
): void {
  const isArchitect = element.sloppiness === 'architect';
  const isArtist = element.sloppiness === 'artist';
  const passes = isArtist ? 3 : 1;
  const wobble = isArtist ? 2 : 4;
  const overshoot = isArtist ? 0 : isArchitect ? 0 : Math.max(5, element.size * 2);

  for (let index = 0; index < passes; index += 1) {
    if (element.arrowType === 'curve') {
      const { mx, my } = getLineHandles(element);
      const cpX = 2 * mx - element.x1 / 2 - element.x2 / 2;
      const cpY = 2 * my - element.y1 / 2 - element.y2 / 2;
      const offset = isArchitect ? 0 : getOffset(rng, wobble);
      const curveOffset = isArchitect ? 0 : getOffset(rng, wobble * 3);
      ctx.moveTo(element.x1 + offset, element.y1 + offset);
      ctx.quadraticCurveTo(
        cpX + curveOffset,
        cpY + curveOffset,
        element.x2 + offset,
        element.y2 + offset,
      );
      continue;
    }

    if (element.arrowType === 'elbow') {
      const isHorizontal =
        Math.abs(element.x2 - element.x1) > Math.abs(element.y2 - element.y1);
      const { mx, my } = getLineHandles(element);
      const offset = isArchitect ? 0 : getOffset(rng, wobble);
      const cornerOffset = isArchitect ? 0 : getOffset(rng, wobble * 3);

      ctx.moveTo(element.x1 + offset, element.y1 + offset);
      if (isHorizontal) {
        ctx.lineTo(mx + cornerOffset, element.y1 + offset);
        ctx.lineTo(mx + cornerOffset, element.y2 + offset);
      } else {
        ctx.lineTo(element.x1 + offset, my + cornerOffset);
        ctx.lineTo(element.x2 + offset, my + cornerOffset);
      }
      ctx.lineTo(element.x2 + offset, element.y2 + offset);
      continue;
    }

    const { mx, my } = getLineHandles(element);
    const offset = isArchitect ? 0 : getOffset(rng, wobble);
    const curveOffset = isArchitect ? 0 : getOffset(rng, wobble * 3);
    const isTrueStraight = element.midX === undefined && element.midY === undefined;
    ctx.moveTo(element.x1 + offset, element.y1 + offset);

    if (isTrueStraight && !isArchitect) {
      const dx = element.x2 - element.x1;
      const dy = element.y2 - element.y1;
      const length = Math.hypot(dx, dy);
      const nx = length > 0 ? dx / length : 0;
      const ny = length > 0 ? dy / length : 0;
      const ox1 = element.x1 - nx * overshoot + offset;
      const oy1 = element.y1 - ny * overshoot + offset;
      const ox2 = element.x2 + nx * overshoot + offset;
      const oy2 = element.y2 + ny * overshoot + offset;
      ctx.moveTo(ox1, oy1);
      ctx.quadraticCurveTo(mx + curveOffset, my + curveOffset, ox2, oy2);
    } else {
      ctx.lineTo(mx + curveOffset, my + curveOffset);
      ctx.lineTo(element.x2 + offset, element.y2 + offset);
    }
  }
}

function fillShape(
  ctx: CanvasRenderingContext2D,
  element: Extract<CanvasElement, { type: 'rect' | 'ellipse' }>,
  fill: string,
): void {
  if (element.fillStyle === 'hachure') {
    ctx.fillStyle = getPattern(ctx, fill, 'hachure') ?? fill;
  } else if (element.fillStyle === 'cross-hatch') {
    ctx.fillStyle = getPattern(ctx, fill, 'cross-hatch') ?? fill;
  } else {
    ctx.fillStyle = fill;
  }
  ctx.fill();
}

function drawRoughRect(ctx: CanvasRenderingContext2D, element: Extract<CanvasElement, { type: 'rect' }>): void {
  const rng = getRng(element.id);
  const w = element.x2 - element.x1;
  const h = element.y2 - element.y1;
  const radius =
    element.edges === 'round' ? Math.min(16, Math.abs(w) / 4, Math.abs(h) / 4) : 0;

  if (element.fill && element.fill !== 'none') {
    ctx.beginPath();
    if (radius && typeof ctx.roundRect === 'function') {
      ctx.roundRect(element.x1, element.y1, w, h, radius);
    } else {
      ctx.rect(element.x1, element.y1, w, h);
    }
    fillShape(ctx, element, element.fill);
  }

  ctx.beginPath();
  if (element.sloppiness === 'architect') {
    if (radius && typeof ctx.roundRect === 'function') {
      ctx.roundRect(element.x1, element.y1, w, h, radius);
    } else {
      ctx.rect(element.x1, element.y1, w, h);
    }
  } else if (radius) {
    const passes = element.sloppiness === 'artist' ? 3 : 1;
    const wobble = element.sloppiness === 'artist' ? 2 : 4;
    for (let index = 0; index < passes; index += 1) {
      const x = element.x1;
      const y = element.y1;
      ctx.moveTo(x + radius + getOffset(rng, wobble), y + getOffset(rng, wobble));
      ctx.lineTo(x + w - radius + getOffset(rng, wobble), y + getOffset(rng, wobble));
      ctx.quadraticCurveTo(
        x + w + getOffset(rng, wobble),
        y + getOffset(rng, wobble),
        x + w + getOffset(rng, wobble),
        y + radius + getOffset(rng, wobble),
      );
      ctx.lineTo(
        x + w + getOffset(rng, wobble),
        y + h - radius + getOffset(rng, wobble),
      );
      ctx.quadraticCurveTo(
        x + w + getOffset(rng, wobble),
        y + h + getOffset(rng, wobble),
        x + w - radius + getOffset(rng, wobble),
        y + h + getOffset(rng, wobble),
      );
      ctx.lineTo(x + radius + getOffset(rng, wobble), y + h + getOffset(rng, wobble));
      ctx.quadraticCurveTo(
        x + getOffset(rng, wobble),
        y + h + getOffset(rng, wobble),
        x + getOffset(rng, wobble),
        y + h - radius + getOffset(rng, wobble),
      );
      ctx.lineTo(x + getOffset(rng, wobble), y + radius + getOffset(rng, wobble));
      ctx.quadraticCurveTo(
        x + getOffset(rng, wobble),
        y + getOffset(rng, wobble),
        x + radius + getOffset(rng, wobble),
        y + getOffset(rng, wobble),
      );
    }
  } else {
    drawRoughLine(ctx, element.x1, element.y1, element.x1 + w, element.y1, element, rng);
    drawRoughLine(
      ctx,
      element.x1 + w,
      element.y1,
      element.x1 + w,
      element.y1 + h,
      element,
      rng,
    );
    drawRoughLine(
      ctx,
      element.x1 + w,
      element.y1 + h,
      element.x1,
      element.y1 + h,
      element,
      rng,
    );
    drawRoughLine(ctx, element.x1, element.y1 + h, element.x1, element.y1, element, rng);
  }
  ctx.stroke();
}

function drawRoughEllipse(
  ctx: CanvasRenderingContext2D,
  element: Extract<CanvasElement, { type: 'ellipse' }>,
): void {
  const rng = getRng(element.id);
  const centerX = (element.x1 + element.x2) / 2;
  const centerY = (element.y1 + element.y2) / 2;
  const radiusX = Math.abs(element.x2 - element.x1) / 2;
  const radiusY = Math.abs(element.y2 - element.y1) / 2;

  if (element.fill && element.fill !== 'none') {
    ctx.beginPath();
    ctx.ellipse(
      centerX,
      centerY,
      Math.max(radiusX, 1),
      Math.max(radiusY, 1),
      0,
      0,
      Math.PI * 2,
    );
    fillShape(ctx, element, element.fill);
  }

  ctx.beginPath();
  if (element.sloppiness === 'architect') {
    ctx.ellipse(
      centerX,
      centerY,
      Math.max(radiusX, 1),
      Math.max(radiusY, 1),
      0,
      0,
      Math.PI * 2,
    );
  } else {
    const passes = element.sloppiness === 'artist' ? 3 : 1;
    const wobble = element.sloppiness === 'artist' ? 3 : 6;
    const kappa = 0.5522848;
    for (let index = 0; index < passes; index += 1) {
      const offsetX = getOffset(rng, wobble);
      const offsetY = getOffset(rng, wobble);
      const x = centerX + offsetX;
      const y = centerY + offsetY;
      const kx = radiusX * kappa;
      const ky = radiusY * kappa;
      ctx.moveTo(x + radiusX, y);
      ctx.bezierCurveTo(
        x + radiusX + getOffset(rng, wobble),
        y + ky + getOffset(rng, wobble),
        x + kx + getOffset(rng, wobble),
        y + radiusY + getOffset(rng, wobble),
        x,
        y + radiusY,
      );
      ctx.bezierCurveTo(
        x - kx + getOffset(rng, wobble),
        y + radiusY + getOffset(rng, wobble),
        x - radiusX + getOffset(rng, wobble),
        y + ky + getOffset(rng, wobble),
        x - radiusX,
        y,
      );
      ctx.bezierCurveTo(
        x - radiusX + getOffset(rng, wobble),
        y - ky + getOffset(rng, wobble),
        x - kx + getOffset(rng, wobble),
        y - radiusY + getOffset(rng, wobble),
        x,
        y - radiusY,
      );
      ctx.bezierCurveTo(
        x + kx + getOffset(rng, wobble),
        y - radiusY + getOffset(rng, wobble),
        x + radiusX + getOffset(rng, wobble),
        y - ky + getOffset(rng, wobble),
        x + radiusX,
        y,
      );
    }
  }
  ctx.stroke();
}

function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  style: ArrowheadStyle,
  element: ArrowElement,
  rng: () => number,
): void {
  if (style === 'none') {
    return;
  }

  const headLength = Math.max(element.size * 4, 16);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  if (style === 'arrow') {
    ctx.beginPath();
    drawRoughLine(
      ctx,
      -headLength,
      -headLength * 0.6,
      0,
      0,
      element,
      rng,
    );
    drawRoughLine(
      ctx,
      0,
      0,
      -headLength,
      headLength * 0.6,
      element,
      rng,
    );
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (style === 'triangle') {
    ctx.beginPath();
    ctx.moveTo(-headLength + getOffset(rng, 2), -headLength * 0.6 + getOffset(rng, 2));
    ctx.lineTo(getOffset(rng, 2), getOffset(rng, 2));
    ctx.lineTo(-headLength + getOffset(rng, 2), headLength * 0.6 + getOffset(rng, 2));
    ctx.closePath();
    ctx.fillStyle = element.color;
    ctx.fill();

    ctx.beginPath();
    drawRoughLine(
      ctx,
      -headLength,
      -headLength * 0.6,
      0,
      0,
      element,
      rng,
    );
    drawRoughLine(
      ctx,
      0,
      0,
      -headLength,
      headLength * 0.6,
      element,
      rng,
    );
    drawRoughLine(
      ctx,
      -headLength,
      headLength * 0.6,
      -headLength,
      -headLength * 0.6,
      element,
      rng,
    );
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  drawRoughLine(ctx, 0, -headLength * 0.6, 0, headLength * 0.6, element, rng);
  ctx.stroke();
  ctx.restore();
}

function applyElementStyles(ctx: CanvasRenderingContext2D, element: CanvasElement): void {
  ctx.globalAlpha = element.opacity ?? 1;
  ctx.strokeStyle = element.color;
  ctx.lineWidth = element.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'edges' in element && element.edges === 'sharp' ? 'miter' : 'round';

  if ('strokeStyle' in element && element.strokeStyle === 'dashed') {
    ctx.setLineDash([element.size * 3, element.size * 3]);
  } else if ('strokeStyle' in element && element.strokeStyle === 'dotted') {
    ctx.setLineDash([element.size, element.size * 2]);
  } else {
    ctx.setLineDash([]);
  }
}

function drawText(ctx: CanvasRenderingContext2D, element: TextElement): void {
  ctx.font = getTextFont(element.fontSize, element.fontFamily);
  ctx.textAlign = element.textAlign;
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = element.color;
  ctx.fillText(element.text ?? '', element.x, element.y);
}

function drawSelectionOutline(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  zoom: number,
  measureTextWidth: (text: string, size: number) => number,
  showHandles: boolean,
): void {
  if (element.type === 'line' || element.type === 'arrow') {
    const boxControls = getSelectionControls(element, measureTextWidth, zoom);
    const lineControls = getLineHandleControls(element, measureTextWidth, zoom);

    if (!boxControls || !lineControls) {
      return;
    }

    ctx.save();
    ctx.strokeStyle = '#3a7be8';
    ctx.lineWidth = 1.5 / zoom;
    ctx.setLineDash([4 / zoom, 3 / zoom]);
    ctx.beginPath();
    ctx.moveTo(boxControls.corners.nw.x, boxControls.corners.nw.y);
    ctx.lineTo(boxControls.corners.ne.x, boxControls.corners.ne.y);
    ctx.lineTo(boxControls.corners.se.x, boxControls.corners.se.y);
    ctx.lineTo(boxControls.corners.sw.x, boxControls.corners.sw.y);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    if (showHandles) {
      ctx.beginPath();
      ctx.moveTo(lineControls.rotateStemStart.x, lineControls.rotateStemStart.y);
      ctx.lineTo(lineControls.handles.rotate.x, lineControls.handles.rotate.y);
      ctx.stroke();

      const handleSize = lineControls.handleRadiusWorld * 2;
      ctx.fillStyle = '#fff';

      ctx.fillRect(
        lineControls.handles['drag-start'].x - handleSize / 2,
        lineControls.handles['drag-start'].y - handleSize / 2,
        handleSize,
        handleSize,
      );
      ctx.strokeRect(
        lineControls.handles['drag-start'].x - handleSize / 2,
        lineControls.handles['drag-start'].y - handleSize / 2,
        handleSize,
        handleSize,
      );
      ctx.fillRect(
        lineControls.handles['drag-end'].x - handleSize / 2,
        lineControls.handles['drag-end'].y - handleSize / 2,
        handleSize,
        handleSize,
      );
      ctx.strokeRect(
        lineControls.handles['drag-end'].x - handleSize / 2,
        lineControls.handles['drag-end'].y - handleSize / 2,
        handleSize,
        handleSize,
      );

      ctx.fillStyle = '#f0a500';
      ctx.fillRect(
        lineControls.handles['drag-midpoint'].x - handleSize / 2,
        lineControls.handles['drag-midpoint'].y - handleSize / 2,
        handleSize,
        handleSize,
      );
      ctx.strokeRect(
        lineControls.handles['drag-midpoint'].x - handleSize / 2,
        lineControls.handles['drag-midpoint'].y - handleSize / 2,
        handleSize,
        handleSize,
      );

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(
        lineControls.handles.rotate.x,
        lineControls.handles.rotate.y,
        lineControls.handleRadiusWorld,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
    return;
  }

  const controls = getSelectionControls(element, measureTextWidth, zoom);

  if (!controls) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = '#3a7be8';
  ctx.lineWidth = 1.5 / zoom;
  ctx.setLineDash([4 / zoom, 3 / zoom]);
  ctx.beginPath();
  ctx.moveTo(controls.corners.nw.x, controls.corners.nw.y);
  ctx.lineTo(controls.corners.ne.x, controls.corners.ne.y);
  ctx.lineTo(controls.corners.se.x, controls.corners.se.y);
  ctx.lineTo(controls.corners.sw.x, controls.corners.sw.y);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  if (showHandles) {
    ctx.beginPath();
    ctx.moveTo(controls.rotateStemStart.x, controls.rotateStemStart.y);
    ctx.lineTo(controls.handles.rotate.x, controls.handles.rotate.y);
    ctx.stroke();

    const squareHandles: Array<keyof typeof controls.handles> = [
      'nw',
      'n',
      'ne',
      'e',
      'se',
      's',
      'sw',
      'w',
    ];
    const handleSize = controls.handleRadiusWorld * 2;

    ctx.fillStyle = '#fffef9';
    for (const handle of squareHandles) {
      const point = controls.handles[handle];
      ctx.beginPath();
      ctx.rect(
        point.x - handleSize / 2,
        point.y - handleSize / 2,
        handleSize,
        handleSize,
      );
      ctx.fill();
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(
      controls.handles.rotate.x,
      controls.handles.rotate.y,
      controls.handleRadiusWorld,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function drawElement(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  measureTextWidth: (text: string, size: number) => number,
): void {
  const baseBounds = getBaseBoundingBox(element, measureTextWidth);

  if (!baseBounds) {
    return;
  }

  ctx.save();
  const center = getBoxCenter(baseBounds);
  ctx.translate(center.x, center.y);
  ctx.rotate(getElementRotation(element));
  ctx.translate(-center.x, -center.y);
  applyElementStyles(ctx, element);
  const rng = getRng(element.id);

  if (element.type === 'pencil') {
    const firstPoint = element.points[0];
    if (firstPoint && element.points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(firstPoint.x, firstPoint.y);
      for (let index = 1; index < element.points.length; index += 1) {
        const previous = element.points[index - 1];
        const current = element.points[index];
        if (!previous || !current) {
          continue;
        }
        ctx.quadraticCurveTo(
          previous.x,
          previous.y,
          (previous.x + current.x) / 2,
          (previous.y + current.y) / 2,
        );
      }
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (element.type === 'line') {
    ctx.beginPath();
    drawRoughPathForLinear(ctx, element, rng);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (element.type === 'arrow') {
    ctx.beginPath();
    drawRoughPathForLinear(ctx, element, rng);
    ctx.stroke();

    const angles = getArrowheadAngle(element.arrowType, element);
    drawArrowhead(
      ctx,
      element.x1,
      element.y1,
      angles.start,
      element.startArrowhead,
      element,
      rng,
    );
    drawArrowhead(
      ctx,
      element.x2,
      element.y2,
      angles.end,
      element.endArrowhead,
      element,
      rng,
    );
    ctx.restore();
    return;
  }

  if (element.type === 'rect') {
    drawRoughRect(ctx, element);
    ctx.restore();
    return;
  }

  if (element.type === 'ellipse') {
    drawRoughEllipse(ctx, element);
    ctx.restore();
    return;
  }

  drawText(ctx, element);
  ctx.restore();
}

export function renderScene({
  ctx,
  width,
  height,
  pixelRatio = 1,
  viewport,
  canvasBg,
  elements,
  draftElement = null,
  selectedIds = new Set<string>(),
  showSelection = true,
}: RenderSceneOptions): void {
  const measureTextWidth = createTextMeasure(ctx);

  ctx.save();
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = canvasBg;
  ctx.fillRect(0, 0, width, height);
  ctx.translate(viewport.panX, viewport.panY);
  ctx.scale(viewport.zoom, viewport.zoom);

  for (const element of elements) {
    drawElement(ctx, element, measureTextWidth);
  }

  if (draftElement) {
    drawElement(ctx, draftElement, measureTextWidth);
  }

  if (showSelection && selectedIds.size > 0) {
    const selectedElements = elements.filter((element) => selectedIds.has(element.id));
    const showHandles = selectedElements.length === 1;
    for (const element of selectedElements) {
      drawSelectionOutline(ctx, element, viewport.zoom, measureTextWidth, showHandles);
    }
  }

  ctx.restore();
}

interface UseCanvasRendererParams {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  width: number;
  height: number;
  pixelRatio: number;
  viewport: Viewport;
  canvasBg: string;
  elements: CanvasElement[];
  draftElement: CanvasElement | null;
  selectedIds: string[];
}

export function useCanvasRenderer({
  canvasRef,
  width,
  height,
  pixelRatio,
  viewport,
  canvasBg,
  elements,
  draftElement,
  selectedIds,
}: UseCanvasRendererParams): void {
  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || width === 0 || height === 0) {
      return;
    }

    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    renderScene({
      ctx,
      width,
      height,
      pixelRatio,
      viewport,
      canvasBg,
      elements,
      draftElement,
      selectedIds: new Set(selectedIds),
      showSelection: true,
    });
  }, [
    canvasRef,
    width,
    height,
    pixelRatio,
    viewport,
    canvasBg,
    elements,
    draftElement,
    selectedIds,
  ]);
}
