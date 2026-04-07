import { useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { useCanvasStore } from '../stores/useCanvasStore';
import { useUiStore } from '../stores/useUiStore';
import type { CanvasElement } from '../types/canvas';
import { useYjsRoom } from '../providers/YjsRoomProvider';

/**
 * Syncs the Yjs document with the Zustand canvas store.
 *
 * - Yjs → Zustand: Observes Y.Map changes and updates local store
 * - Zustand → Yjs: Pushes local element changes to Yjs
 *
 * Yjs handles conflict resolution automatically via CRDTs,
 * so no locking is needed.
 */
export function useYjsSync(): void {
  const { doc, elements: yElements, metadata: yMetadata } = useYjsRoom();

  const setElements = useCanvasStore((s) => s.setElements);
  const elements = useCanvasStore((s) => s.elements);
  const canvasBg = useUiStore((s) => s.canvasBg);
  const setCanvasBg = useUiStore((s) => s.setCanvasBg);

  const isRemoteUpdate = useRef(false);
  const lastSyncedElementsRef = useRef<Map<string, CanvasElement>>(new Map());

  // Sync Yjs elements → Zustand (on initial load and remote changes)
  useEffect(() => {
    const observer = (_events: Y.YEvent<any>[], transaction: Y.Transaction) => {
      // Skip if this is our own change
      if (transaction.local) return;

      isRemoteUpdate.current = true;

      const newElements: CanvasElement[] = [];
      yElements.forEach((element) => {
        newElements.push(element);
      });

      setElements(newElements);
      lastSyncedElementsRef.current = new Map(
        newElements.map((el) => [el.id, el]),
      );

      isRemoteUpdate.current = false;
    };

    yElements.observeDeep(observer);

    // Initial sync
    const initialElements: CanvasElement[] = [];
    yElements.forEach((element) => {
      initialElements.push(element);
    });

    if (initialElements.length > 0) {
      setElements(initialElements);
      lastSyncedElementsRef.current = new Map(
        initialElements.map((el) => [el.id, el]),
      );
    }

    return () => {
      yElements.unobserveDeep(observer);
    };
  }, [yElements, setElements]);

  // Sync Yjs metadata → Zustand
  useEffect(() => {
    const observer = (_event: Y.YEvent<any>) => {
      const bg = yMetadata.get('canvasBg');
      if (bg) {
        setCanvasBg(bg);
      }
    };

    yMetadata.observe(observer);

    const bg = yMetadata.get('canvasBg');
    if (bg) {
      setCanvasBg(bg);
    }

    return () => {
      yMetadata.unobserve(observer);
    };
  }, [yMetadata, setCanvasBg]);

  // Sync Zustand → Yjs (push local changes)
  useEffect(() => {
    if (isRemoteUpdate.current) return;

    // Detect changes
    const hasChanges =
      elements.length !== lastSyncedElementsRef.current.size ||
      elements.some((el) => {
        const last = lastSyncedElementsRef.current.get(el.id);
        return !last || JSON.stringify(last) !== JSON.stringify(el);
      });

    if (hasChanges) {
      // Update Yjs
      const existingKeys = new Set(yElements.keys());
      const currentIds = new Set(elements.map((el) => el.id));

      // Remove deleted
      for (const key of existingKeys) {
        if (!currentIds.has(key)) {
          yElements.delete(key);
        }
      }

      // Add/update
      for (const element of elements) {
        yElements.set(element.id, element);
      }

      lastSyncedElementsRef.current = new Map(
        elements.map((el) => [el.id, el]),
      );
    }
  }, [elements, yElements]);

  // Sync canvas background → Yjs
  useEffect(() => {
    const currentBg = yMetadata.get('canvasBg');
    if (canvasBg !== currentBg) {
      yMetadata.set('canvasBg', canvasBg);
    }
  }, [canvasBg, yMetadata]);
}
