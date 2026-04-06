import { create } from 'zustand';
import type { CollaborationParticipant } from '../types/collaboration';

interface LockInfo {
  elementId: string;
  lockedBy: CollaborationParticipant;
}

interface LockState {
  /** Map of elementId -> participant who locked it (from others' presence) */
  locksByOthers: Map<string, CollaborationParticipant>;
  /** Element IDs that the current user has locked */
  myLockedIds: Set<string>;
}

interface LockActions {
  /** Lock elements on behalf of the current user */
  lockElements: (elementIds: string[]) => void;
  /** Release locks held by the current user */
  unlockElements: (elementIds: string[]) => void;
  /** Release all locks held by the current user */
  unlockAll: () => void;
  /** Update locks from remote participants' presence */
  syncRemoteLocks: (
    others: Array<{ id: string; presence?: { lockedElementIds?: string[] | unknown }; info?: { name?: string; color?: string } }>,
    selfId: string,
  ) => void;
  /** Check if a specific element is locked by someone other than the current user */
  isElementLockedByOthers: (elementId: string) => boolean;
  /** Get lock info for a specific element */
  getLockInfo: (elementId: string) => LockInfo | null;
  /** Reset the lock store */
  resetLockStore: () => void;
}

export type LockStore = LockState & LockActions;

export const useLockStore = create<LockStore>()((set, get) => ({
  locksByOthers: new Map(),
  myLockedIds: new Set(),

  lockElements: (elementIds) => {
    set((state) => {
      const next = new Set(state.myLockedIds);
      for (const id of elementIds) {
        next.add(id);
      }
      return { myLockedIds: next };
    });
  },

  unlockElements: (elementIds) => {
    set((state) => {
      const next = new Set(state.myLockedIds);
      for (const id of elementIds) {
        next.delete(id);
      }
      return { myLockedIds: next };
    });
  },

  unlockAll: () => {
    set({ myLockedIds: new Set() });
  },

  syncRemoteLocks: (others, selfId) => {
    const newLocks = new Map<string, CollaborationParticipant>();

    for (const other of others) {
      const rawLockedIds = other.presence?.lockedElementIds;
      const lockedIds = Array.isArray(rawLockedIds) ? rawLockedIds : [];
      const participant: CollaborationParticipant = {
        id: other.id,
        name: other.info?.name ?? 'Unknown',
        color: other.info?.color ?? '#3a7be8',
        isSelf: other.id === selfId,
      };

      for (const elementId of lockedIds) {
        if (typeof elementId === 'string' && other.id !== selfId) {
          newLocks.set(elementId, participant);
        }
      }
    }

    set({ locksByOthers: newLocks });
  },

  isElementLockedByOthers: (elementId) => {
    return get().locksByOthers.has(elementId);
  },

  getLockInfo: (elementId) => {
    const lockedBy = get().locksByOthers.get(elementId);
    if (!lockedBy) {
      return null;
    }
    return { elementId, lockedBy };
  },

  resetLockStore: () => {
    set({ locksByOthers: new Map(), myLockedIds: new Set() });
  },
}));
