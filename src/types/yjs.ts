import type * as Y from 'yjs';
import type { CanvasElement } from './canvas';

/**
 * Yjs document structure for the sketchpad collaboration:
 *
 * doc.getMap('elements') — Y.Map<CanvasElement> keyed by element ID
 * doc.getMap('metadata') — Y.Map<string> for canvasBg, etc.
 * Awareness — cursor position, selected element IDs, user info
 */

export interface YjsAwarenessUpdate {
  userId: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selectedIds: string[];
  currentDraft: CanvasElement | null;
}

export interface YjsDocSchema {
  elements: Y.Map<CanvasElement>;
  metadata: Y.Map<string>;
}

export function initYjsDocument(doc: Y.Doc): YjsDocSchema {
  const elements = doc.getMap<CanvasElement>('elements');
  const metadata = doc.getMap<string>('metadata');

  // Set defaults if empty
  if (!metadata.has('canvasBg')) {
    metadata.set('canvasBg', '#ffffff');
  }

  return { elements, metadata };
}

export function serializeElementsToYjs(
  yElements: Y.Map<CanvasElement>,
  elements: CanvasElement[],
): void {
  // Clear and repopulate
  const existingKeys = new Set(yElements.keys());
  const newIds = new Set(elements.map((el) => el.id));

  // Remove deleted
  for (const key of existingKeys) {
    if (!newIds.has(key)) {
      yElements.delete(key);
    }
  }

  // Add/update
  for (const element of elements) {
    yElements.set(element.id, element);
  }
}

export function deserializeElementsFromYjs(
  yElements: Y.Map<CanvasElement>,
): CanvasElement[] {
  const elements: CanvasElement[] = [];
  yElements.forEach((element) => {
    elements.push(element);
  });
  return elements;
}
