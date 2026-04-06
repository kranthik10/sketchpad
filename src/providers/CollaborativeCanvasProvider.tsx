import { createContext, useContext, type ReactNode } from 'react';
import { useBroadcastEvent } from '../liveblocks';
import { useCollaborationBroadcast, isProcessingRemoteOperation } from '../collaboration/useCollaborationBroadcast';
import { useCanvasStore } from '../stores/useCanvasStore';
import { useLockStore } from '../stores/useLockStore';
import type { CanvasElement } from '../types/canvas';

interface CollaborativeCanvasContextValue {
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, element: CanvasElement) => void;
  deleteElement: (id: string) => void;
  deleteSelection: () => void;
  duplicateSelection: () => void;
  setElements: (elements: CanvasElement[]) => void;
  setSelection: (ids: string[]) => void;
  clearSelection: () => void;
  isElementLocked: (id: string) => boolean;
}

const CollaborativeCanvasContext = createContext<CollaborativeCanvasContextValue | null>(
  null,
);

export function useCollaborativeCanvas(): CollaborativeCanvasContextValue {
  const ctx = useContext(CollaborativeCanvasContext);
  if (!ctx) {
    // Fallback: return direct store actions (non-collaborative mode)
    return {
      addElement: useCanvasStore((s) => s.addElement),
      updateElement: useCanvasStore((s) => s.updateElement),
      deleteElement: (id) => {
        const elements = useCanvasStore.getState().elements;
        useCanvasStore.getState().setElements(elements.filter((el) => el.id !== id));
      },
      deleteSelection: useCanvasStore((s) => s.deleteSelection),
      duplicateSelection: useCanvasStore((s) => s.duplicateSelection),
      setElements: useCanvasStore((s) => s.setElements),
      setSelection: useCanvasStore((s) => s.setSelection),
      clearSelection: useCanvasStore((s) => s.clearSelection),
      isElementLocked: () => false,
    };
  }
  return ctx;
}

interface CollaborativeCanvasProviderProps {
  children: ReactNode;
}

export function CollaborativeCanvasProvider({ children }: CollaborativeCanvasProviderProps) {
  const broadcast = useBroadcastEvent();

  // Wire up broadcast listeners (listens for remote ops and applies them)
  useCollaborationBroadcast();

  // Original canvas store actions
  const originalAddElement = useCanvasStore((s) => s.addElement);
  const originalUpdateElement = useCanvasStore((s) => s.updateElement);
  const originalSetElements = useCanvasStore((s) => s.setElements);
  const originalDeleteSelection = useCanvasStore((s) => s.deleteSelection);
  const originalDuplicateSelection = useCanvasStore((s) => s.duplicateSelection);
  const originalSetSelection = useCanvasStore((s) => s.setSelection);
  const originalClearSelection = useCanvasStore((s) => s.clearSelection);

  // Lock store
  const isElementLockedByOthers = useLockStore((s) => s.isElementLockedByOthers);
  const lockElements = useLockStore((s) => s.lockElements);
  const unlockElements = useLockStore((s) => s.unlockElements);
  const unlockAll = useLockStore((s) => s.unlockAll);

  const collaborativeAddElement = (element: CanvasElement) => {
    if (isProcessingRemoteOperation.current) return;

    originalAddElement(element);
    broadcast({ type: 'element-created', element: JSON.stringify(element) });
  };

  const collaborativeUpdateElement = (id: string, element: CanvasElement) => {
    if (isProcessingRemoteOperation.current) return;
    if (isElementLockedByOthers(id)) return;

    originalUpdateElement(id, element);
    broadcast({ type: 'element-updated', id, element: JSON.stringify(element) });
  };

  const collaborativeDeleteElement = (id: string) => {
    if (isProcessingRemoteOperation.current) return;
    if (isElementLockedByOthers(id)) return;

    const currentElements = useCanvasStore.getState().elements;
    originalSetElements(currentElements.filter((el) => el.id !== id));
    broadcast({ type: 'element-deleted', id });
  };

  const collaborativeDeleteSelection = () => {
    if (isProcessingRemoteOperation.current) return;

    const selectedIds = useCanvasStore.getState().selectedIds;
    const hasLockedElement = selectedIds.some((id) => isElementLockedByOthers(id));
    if (hasLockedElement) return;

    const currentElements = useCanvasStore.getState().elements;
    const deletedElements = currentElements.filter((el) => selectedIds.includes(el.id));

    originalDeleteSelection();

    for (const element of deletedElements) {
      broadcast({ type: 'element-deleted', id: element.id });
    }
  };

  const collaborativeSetElements = (newElements: CanvasElement[]) => {
    if (isProcessingRemoteOperation.current) {
      originalSetElements(newElements);
      return;
    }

    // Detect changes by comparing with current elements
    const currentElements = useCanvasStore.getState().elements;
    const currentById = new Map(currentElements.map((el) => [el.id, el]));
    const newById = new Map(newElements.map((el) => [el.id, el]));

    // Broadcast new and updated elements
    for (const element of newElements) {
      const current = currentById.get(element.id);
      if (!current) {
        // New element
        broadcast({ type: 'element-created', element: JSON.stringify(element) });
      } else if (JSON.stringify(current) !== JSON.stringify(element)) {
        // Modified element
        broadcast({ type: 'element-updated', id: element.id, element: JSON.stringify(element) });
      }
    }

    // Broadcast deleted elements
    for (const element of currentElements) {
      if (!newById.has(element.id)) {
        broadcast({ type: 'element-deleted', id: element.id });
      }
    }

    originalSetElements(newElements);
  };

  const collaborativeSetSelection = (ids: string[]) => {
    unlockAll();
    lockElements(ids);
    originalSetSelection(ids);
  };

  const collaborativeClearSelection = () => {
    unlockAll();
    originalClearSelection();
  };

  const collaborativeDuplicateSelection = () => {
    if (isProcessingRemoteOperation.current) return;

    const selectedIds = useCanvasStore.getState().selectedIds;
    const hasLockedElement = selectedIds.some((id) => isElementLockedByOthers(id));
    if (hasLockedElement) return;

    const currentElements = useCanvasStore.getState().elements;
    const duplicatedElements: CanvasElement[] = [];

    // Get the result of duplication
    const result = useCanvasStore.getState();
    originalDuplicateSelection();

    // Find the new elements (they were added at the end)
    const newElements = useCanvasStore.getState().elements;
    const newIds = newElements.slice(currentElements.length);

    for (const element of newIds) {
      broadcast({ type: 'element-created', element: JSON.stringify(element) });
    }
  };

  const isElementLocked = isElementLockedByOthers;

  const value: CollaborativeCanvasContextValue = {
    addElement: collaborativeAddElement,
    updateElement: collaborativeUpdateElement,
    deleteElement: collaborativeDeleteElement,
    deleteSelection: collaborativeDeleteSelection,
    duplicateSelection: collaborativeDuplicateSelection,
    setElements: collaborativeSetElements,
    setSelection: collaborativeSetSelection,
    clearSelection: collaborativeClearSelection,
    isElementLocked,
  };

  return (
    <CollaborativeCanvasContext.Provider value={value}>
      {children}
    </CollaborativeCanvasContext.Provider>
  );
}
