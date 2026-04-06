import { createClient } from '@liveblocks/client';
import { createRoomContext } from '@liveblocks/react';
import { useCollaborationStore } from './stores/useCollaborationStore';
import type { CanvasElement } from './types/canvas';
import type {
  BoardSnapshot,
  CollaborationEvent,
  CollaborationPresence,
  CollaborationStorage,
  CollaborationUserMeta,
} from './types/collaboration';

function getCollaborationErrorMessage(response: Response, fallback: string): Promise<string> {
  return response
    .json()
    .then((payload: unknown) => {
      if (
        payload &&
        typeof payload === 'object' &&
        'error' in payload &&
        typeof payload.error === 'string'
      ) {
        return payload.error;
      }

      return fallback;
    })
    .catch(() => fallback);
}

const client = createClient<CollaborationUserMeta>({
  authEndpoint: async (roomId) => {
    const store = useCollaborationStore.getState();
    const activeRoomId = roomId ?? store.currentRoomId;
    const displayName = store.displayName.trim();

    if (!activeRoomId || !displayName) {
      throw new Error('A room and display name are required for collaboration.');
    }

    const response = await fetch('/api/liveblocks-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId: activeRoomId,
        userId: store.userId,
        userInfo: {
          name: displayName,
          color: store.userColor,
        },
      }),
    });

    if (!response.ok) {
      const message = await getCollaborationErrorMessage(
        response,
        'Unable to join the collaboration session.',
      );

      if (response.status === 404 || response.status === 403) {
        store.handleSessionEnded(message);
      } else {
        store.setModalOpen(true);
        store.setSessionMessage(message);
      }

      throw new Error(message);
    }

    return (await response.json()) as { token: string };
  },
});

export const {
  RoomProvider,
  useBroadcastEvent,
  useEventListener,
  useMutation,
  useOthers,
  useSelf,
  useStatus,
  useStorage,
  useUpdateMyPresence,
} = createRoomContext<
  CollaborationPresence,
  CollaborationStorage,
  CollaborationUserMeta,
  CollaborationEvent
>(client);

export function serializeBoardSnapshot(
  elements: CanvasElement[],
  canvasBg: string,
): string {
  const snapshot: BoardSnapshot = {
    elements,
    canvasBg,
  };

  return JSON.stringify(snapshot);
}

export function parseBoardSnapshot(snapshot: string | null): BoardSnapshot {
  if (!snapshot) {
    return {
      elements: [],
      canvasBg: '#ffffff',
    };
  }

  try {
    const parsed = JSON.parse(snapshot) as Partial<BoardSnapshot>;

    return {
      elements: Array.isArray(parsed.elements)
        ? (parsed.elements as CanvasElement[])
        : [],
      canvasBg:
        typeof parsed.canvasBg === 'string' ? parsed.canvasBg : '#ffffff',
    };
  } catch {
    return {
      elements: [],
      canvasBg: '#ffffff',
    };
  }
}
