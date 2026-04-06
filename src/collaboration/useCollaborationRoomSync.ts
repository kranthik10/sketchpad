import { useCallback, useEffect, useRef } from 'react';
import {
  parseBoardSnapshot,
  serializeBoardSnapshot,
  useBroadcastEvent,
  useEventListener,
  useMutation,
  useStorage,
  useUpdateMyPresence,
} from '../liveblocks';
import { useCanvasStore } from '../stores/useCanvasStore';
import { useCollaborationStore } from '../stores/useCollaborationStore';
import { useLockStore } from '../stores/useLockStore';
import { useUiStore } from '../stores/useUiStore';
import type { CanvasElement } from '../types/canvas';
import type { BoardSnapshot, CollaborationEvent } from '../types/collaboration';

/**
 * Hook that handles initial board state synchronization when joining a room.
 *
 * This does NOT continuously sync element changes — that's handled by
 * useCollaborationBroadcast via broadcast events. This hook only:
 *  - Writes the initial snapshot when the room is first created
 *  - Reads the snapshot when a new user joins
 *  - Handles snapshot request/response for late joiners
 *  - Handles session-ended events
 */
export function useCollaborationRoomSync(): void {
  const canvasBg = useUiStore((state) => state.canvasBg);
  const showToast = useUiStore((state) => state.showToast);
  const handleSessionEnded = useCollaborationStore((state) => state.handleSessionEnded);
  const userId = useCollaborationStore((state) => state.userId);

  const setElements = useCanvasStore((state) => state.setElements);
  const clearSelection = useCanvasStore((state) => state.clearSelection);
  const elements = useCanvasStore((state) => state.elements);

  const updateMyPresence = useUpdateMyPresence();
  const storageSnapshot = useStorage((root) => root.snapshot);
  const broadcast = useBroadcastEvent();
  const writeSnapshot = useMutation(({ storage }, snapshot: string) => {
    storage.set('snapshot', snapshot);
  }, []);

  const hasHydratedRef = useRef(false);

  // Sync locked element IDs to presence whenever they change
  const myLockedIds = useLockStore((state) => state.myLockedIds);

  useEffect(() => {
    updateMyPresence({
      lockedElementIds: Array.from(myLockedIds),
    });
  }, [myLockedIds, updateMyPresence]);

  // Handle incoming broadcast events relevant to room lifecycle
  useEventListener(({ event }) => {
    if (event.type === 'session-ended') {
      handleSessionEnded('Session ended by host.');
      showToast('Session ended');
      return;
    }

    if (event.type === 'request-snapshot' && event.requestedBy !== userId) {
      // Another user joined and requested the current snapshot — respond
      const currentElements = useCanvasStore.getState().elements;
      const currentBg = useUiStore.getState().canvasBg;
      const snapshot = serializeBoardSnapshot(currentElements, currentBg);

      broadcast({
        type: 'snapshot-response',
        snapshot,
        sentBy: userId,
      });
      return;
    }

    if (event.type === 'snapshot-response' && event.sentBy !== userId) {
      // We received a snapshot response (we were the late joiner)
      if (!hasHydratedRef.current) {
        hasHydratedRef.current = true;
        const parsed = parseBoardSnapshot(event.snapshot);
        setElements(parsed.elements);
        clearSelection();
        useUiStore.getState().setCanvasBg(parsed.canvasBg);
      }
      return;
    }
  });

  // On initial join: if storage is empty, write current board; if storage has data, read it
  useEffect(() => {
    if (hasHydratedRef.current) return;

    if (storageSnapshot === null) {
      // Storage is empty — request a snapshot from others
      broadcast({
        type: 'request-snapshot',
        requestedBy: userId,
      });

      // If no one responds within 1.5s, assume we're the first user
      const timeout = setTimeout(() => {
        if (!hasHydratedRef.current) {
          hasHydratedRef.current = true;
          const snapshot = serializeBoardSnapshot(elements, canvasBg);
          writeSnapshot(snapshot);
        }
      }, 1500);

      return () => clearTimeout(timeout);
    }

    // Storage has data — hydrate from it
    hasHydratedRef.current = true;
    const parsed = parseBoardSnapshot(storageSnapshot);
    setElements(parsed.elements);
    clearSelection();
    useUiStore.getState().setCanvasBg(parsed.canvasBg);
  }, [storageSnapshot, elements, canvasBg, userId, broadcast, setElements, clearSelection, writeSnapshot]);
}
