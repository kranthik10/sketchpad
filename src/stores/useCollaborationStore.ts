import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface CollaborationState {
  displayName: string;
  userId: string;
  userColor: string;
  hostTokens: Record<string, string>;
  currentRoomId: string | null;
  modalOpen: boolean;
  sessionMessage: string | null;
}

interface CollaborationActions {
  setDisplayName: (displayName: string) => void;
  setCurrentRoomId: (roomId: string | null) => void;
  setModalOpen: (modalOpen: boolean) => void;
  setSessionMessage: (sessionMessage: string | null) => void;
  rememberHostToken: (roomId: string, hostToken: string) => void;
  forgetHostToken: (roomId: string) => void;
  handleSessionEnded: (sessionMessage: string) => void;
  resetCollaborationUi: () => void;
}

export type CollaborationStore = CollaborationState & CollaborationActions;

const colorPalette = [
  '#3a7be8',
  '#e8503a',
  '#2dbe6c',
  '#f0a500',
  '#9b59b6',
  '#1a1a2e',
];

function createUserId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `user-${Date.now()}`;
}

function selectUserColor(userId: string): string {
  let hash = 0;

  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash << 5) - hash + userId.charCodeAt(index);
    hash |= 0;
  }

  return colorPalette[Math.abs(hash) % colorPalette.length] ?? colorPalette[0]!;
}

function createDefaultPersistentState(): Pick<
  CollaborationState,
  'displayName' | 'userId' | 'userColor' | 'hostTokens'
> {
  const userId = createUserId();

  return {
    displayName: '',
    userId,
    userColor: selectUserColor(userId),
    hostTokens: {},
  };
}

const initialPersistentState = createDefaultPersistentState();

function normalizeCollaborationState(
  state: Partial<CollaborationState> | undefined,
): CollaborationState {
  const userId = state?.userId?.trim() || initialPersistentState.userId;

  return {
    displayName: state?.displayName ?? '',
    userId,
    userColor: state?.userColor ?? selectUserColor(userId),
    hostTokens: state?.hostTokens ?? {},
    currentRoomId: null,
    modalOpen: false,
    sessionMessage: null,
  };
}

const COLLABORATION_STORAGE_KEY = 'sketchpad-collaboration-store';

export const useCollaborationStore = create<CollaborationStore>()(
  persist(
    (set) => ({
      ...normalizeCollaborationState(initialPersistentState),
      setDisplayName: (displayName) => set({ displayName }),
      setCurrentRoomId: (currentRoomId) => set({ currentRoomId }),
      setModalOpen: (modalOpen) => set({ modalOpen }),
      setSessionMessage: (sessionMessage) => set({ sessionMessage }),
      rememberHostToken: (roomId, hostToken) =>
        set((state) => ({
          hostTokens: {
            ...state.hostTokens,
            [roomId]: hostToken,
          },
        })),
      forgetHostToken: (roomId) =>
        set((state) => {
          const nextTokens = { ...state.hostTokens };
          delete nextTokens[roomId];

          return {
            hostTokens: nextTokens,
          };
        }),
      handleSessionEnded: (sessionMessage) =>
        set({
          currentRoomId: null,
          modalOpen: true,
          sessionMessage,
        }),
      resetCollaborationUi: () =>
        set({
          currentRoomId: null,
          modalOpen: false,
          sessionMessage: null,
        }),
    }),
    {
      name: COLLABORATION_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        displayName: state.displayName,
        userId: state.userId,
        userColor: state.userColor,
        hostTokens: state.hostTokens,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...normalizeCollaborationState(
          persistedState as Partial<CollaborationState> | undefined,
        ),
      }),
    },
  ),
);
