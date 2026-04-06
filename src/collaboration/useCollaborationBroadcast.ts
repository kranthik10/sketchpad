import { useCallback, useEffect } from 'react';
import { useBroadcastEvent, useEventListener, useOthers, useSelf } from '../liveblocks';
import { useCanvasStore } from '../stores/useCanvasStore';
import { useLockStore } from '../stores/useLockStore';
import type { CanvasElement } from '../types/canvas';
import type { CollaborationEvent } from '../types/collaboration';

/**
 * Module-level flag so the canvas store can check whether the current
 * mutation originated from a remote broadcast (and should skip its own
 * broadcast to avoid echo loops).
 */
export const isProcessingRemoteOperation = { current: false };

/**
 * Hook that bridges local canvas mutations to Liveblocks broadcast events.
 *
 * When the current user creates, updates, or deletes an element, it broadcasts
 * the operation so other participants can apply it to their local stores.
 *
 * Also listens to incoming broadcast events and applies them locally.
 */
export function useCollaborationBroadcast(): void {
  const broadcast = useBroadcastEvent();
  const self = useSelf();
  const others = useOthers();
  const selfId = self ? String(self.id) : null;

  const addElement = useCanvasStore((s) => s.addElement);
  const updateElement = useCanvasStore((s) => s.updateElement);
  const setElements = useCanvasStore((s) => s.setElements);

  const syncRemoteLocks = useLockStore((s) => s.syncRemoteLocks);

  // Sync remote locks whenever others change
  useEffect(() => {
    if (!selfId || !others) return;

    const othersArray = Array.isArray(others) ? others : [];
    const mappedOthers = othersArray.map((o) => ({
      id: o.id,
      presence: ((o as Record<string, unknown>).presence as { lockedElementIds?: string[] | unknown } | undefined) ?? {},
      info: o.info,
    }));
    syncRemoteLocks(mappedOthers, selfId);
  }, [others, selfId, syncRemoteLocks]);

  // Listen for incoming broadcast events
  const handleBroadcast = useCallback(
    ({ event }: { event: CollaborationEvent }) => {
      if (!selfId) return;

      switch (event.type) {
        case 'element-created': {
          isProcessingRemoteOperation.current = true;
          addElement(JSON.parse(event.element) as CanvasElement);
          isProcessingRemoteOperation.current = false;
          break;
        }

        case 'element-updated': {
          isProcessingRemoteOperation.current = true;
          updateElement(event.id, JSON.parse(event.element) as CanvasElement);
          isProcessingRemoteOperation.current = false;
          break;
        }

        case 'element-deleted': {
          isProcessingRemoteOperation.current = true;
          const currentElements = useCanvasStore.getState().elements;
          setElements(currentElements.filter((el) => el.id !== event.id));
          isProcessingRemoteOperation.current = false;
          break;
        }

        case 'elements-batch-updated': {
          isProcessingRemoteOperation.current = true;
          const currentElements = useCanvasStore.getState().elements;
          const elementsById = new Map(currentElements.map((el) => [el.id, el]));

          // Apply updates
          for (const updatedStr of event.elements) {
            const updated = JSON.parse(updatedStr) as CanvasElement;
            elementsById.set(updated.id, updated);
          }

          // Apply deletions
          for (const deletedId of event.deletedIds) {
            elementsById.delete(deletedId);
          }

          setElements(Array.from(elementsById.values()));
          isProcessingRemoteOperation.current = false;
          break;
        }

        case 'session-ended':
        case 'request-snapshot':
        case 'snapshot-response':
          // Handled by useCollaborationRoomSync
          break;

        default:
          break;
      }
    },
    [selfId, addElement, updateElement, setElements],
  );

  // Listen for incoming broadcast events
  useEventListener(handleBroadcast);
}

/**
 * Helper to broadcast an element operation. Should be called by the canvas
 * store after applying a local mutation.
 */
export function broadcastElementOperation(
  broadcastFn: (event: CollaborationEvent) => void,
  type: 'element-created' | 'element-updated' | 'element-deleted',
  elementOrId: CanvasElement | string,
  element?: CanvasElement,
): void {
  if (type === 'element-created') {
    broadcastFn({
      type: 'element-created',
      element: JSON.stringify(elementOrId),
    });
  } else if (type === 'element-updated') {
    broadcastFn({
      type: 'element-updated',
      id: elementOrId as string,
      element: JSON.stringify(element!),
    });
  } else {
    broadcastFn({
      type: 'element-deleted',
      id: elementOrId as string,
    });
  }
}
