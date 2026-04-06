import { describe, expect, it } from 'vitest';
import type { CanvasElement } from '../types/canvas';
import {
  detectTransformHandleAtPoint,
  getBoundingBox,
  getContentBounds,
  getSelectionControls,
  hitTest,
  isBoundingBoxWithinMarquee,
  resizeElementFromHandle,
  screenToWorld,
  toMarqueeBounds,
  translateElement,
  worldToScreen,
  zoomViewportAtPoint,
} from './canvasMath';

describe('canvasMath', () => {
  it('converts between screen and world coordinates', () => {
    const viewport = { zoom: 2, panX: 10, panY: 20 };
    const worldPoint = screenToWorld(30, 40, viewport);

    expect(worldPoint).toEqual({ x: 10, y: 10 });
    expect(worldToScreen(worldPoint.x, worldPoint.y, viewport)).toEqual({
      x: 30,
      y: 40,
    });
  });

  it('returns correct bounds and hit testing for text elements', () => {
    const textElement: CanvasElement = {
      id: 'text-1',
      type: 'text',
      text: 'Hello',
      x: 100,
      y: 120,
      color: '#111',
      size: 6,
      opacity: 1,
      rotation: 0,
      fontFamily: 'Caveat, cursive',
      textAlign: 'left',
      fontSize: 36,
    };

    const measureText = () => 80;
    expect(getBoundingBox(textElement, measureText)).toEqual({
      x: 100,
      y: 84,
      w: 80,
      h: 46,
    });
    expect(hitTest(textElement, 120, 100, measureText)).toBe(true);
    expect(hitTest(textElement, 10, 10, measureText)).toBe(false);
  });

  it('translates line geometry', () => {
    const line: CanvasElement = {
      id: 'line-1',
      type: 'line',
      color: '#111',
      fill: 'none',
      edges: 'sharp',
      size: 2,
      opacity: 1,
      rotation: 0,
      arrowType: 'straight',
      x1: 10,
      y1: 15,
      x2: 30,
      y2: 40,
    };

    expect(translateElement(line, 5, -10)).toMatchObject({
      x1: 15,
      y1: 5,
      x2: 35,
      y2: 30,
    });
  });

  it('calculates marquee containment and content bounds', () => {
    const rect: CanvasElement = {
      id: 'rect-1',
      type: 'rect',
      color: '#111',
      fill: 'none',
      edges: 'sharp',
      size: 2,
      opacity: 1,
      rotation: 0,
      x1: 10,
      y1: 20,
      x2: 70,
      y2: 80,
    };
    const ellipse: CanvasElement = {
      id: 'ellipse-1',
      type: 'ellipse',
      color: '#111',
      fill: '#eee',
      size: 2,
      opacity: 1,
      rotation: 0,
      x1: 90,
      y1: 100,
      x2: 130,
      y2: 180,
    };
    const marquee = toMarqueeBounds({ x: 0, y: 0 }, { x: 80, y: 90 });

    expect(isBoundingBoxWithinMarquee(getBoundingBox(rect)!, marquee)).toBe(true);
    expect(isBoundingBoxWithinMarquee(getBoundingBox(ellipse)!, marquee)).toBe(false);
    expect(getContentBounds([rect, ellipse])).toEqual({
      x: 10,
      y: 20,
      w: 120,
      h: 160,
    });
  });

  it('zooms relative to a screen point', () => {
    const nextViewport = zoomViewportAtPoint(
      { zoom: 1, panX: 0, panY: 0 },
      0.5,
      200,
      150,
    );

    expect(nextViewport.zoom).toBe(1.5);
    expect(nextViewport.panX).toBeCloseTo(-100);
    expect(nextViewport.panY).toBeCloseTo(-75);
  });

  it('supports rotated bounds and transform controls', () => {
    const rect: CanvasElement = {
      id: 'rect-rotate',
      type: 'rect',
      color: '#111',
      fill: 'none',
      edges: 'sharp',
      size: 2,
      opacity: 1,
      rotation: Math.PI / 4,
      x1: 0,
      y1: 0,
      x2: 100,
      y2: 50,
    };

    const controls = getSelectionControls(rect, undefined, 1);

    expect(controls).not.toBeNull();
    expect(getBoundingBox(rect)!.w).toBeGreaterThan(100);
    expect(detectTransformHandleAtPoint(rect, controls!.handles.rotate, undefined, 1)).toBe(
      'rotate',
    );
    expect(hitTest(rect, 50, 25)).toBe(true);
  });

  it('resizes from a transform handle', () => {
    const rect: CanvasElement = {
      id: 'rect-resize',
      type: 'rect',
      color: '#111',
      fill: 'none',
      edges: 'sharp',
      size: 2,
      opacity: 1,
      rotation: 0,
      x1: 0,
      y1: 0,
      x2: 100,
      y2: 60,
    };

    const resized = resizeElementFromHandle(rect, 'se', { x: 160, y: 90 });
    expect(resized.type).toBe('rect');
    if (resized.type === 'rect') {
      expect(resized.x2).toBeGreaterThan(100);
      expect(resized.y2).toBeGreaterThan(60);
    }
  });
});
