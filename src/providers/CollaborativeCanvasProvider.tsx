import { createContext, useContext, type ReactNode } from 'react';
import { useYjsSync } from '../hooks/useYjsSync';
import { useCanvasStore } from '../stores/useCanvasStore';
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
}

const CollaborativeCanvasContext = createContext<CollaborativeCanvasContextValue | null>(
  null,
);

export function useCollaborativeCanvas(): CollaborativeCanvasContextValue {
  const ctx = useContext(CollaborativeCanvasContext);
  if (!ctx) {
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
    };
  }
  return ctx;
}

interface CollaborativeCanvasProviderProps {
  children: ReactNode;
}

export function CollaborativeCanvasProvider({ children }: CollaborativeCanvasProviderProps) {
  // Initialize Yjs sync
  useYjsSync();

  // Original canvas store actions
  const originalAddElement = useCanvasStore((s) => s.addElement);
  const originalUpdateElement = useCanvasStore((s) => s.updateElement);
  const originalSetElements = useCanvasStore((s) => s.setElements);
  const originalDeleteSelection = useCanvasStore((s) => s.deleteSelection);
  const originalDuplicateSelection = useCanvasStore((s) => s.duplicateSelection);
  const originalSetSelection = useCanvasStore((s) => s.setSelection);
  const originalClearSelection = useCanvasStore((s) => s.clearSelection);

  // With Yjs CRDT, all operations are directly synced without locking
  const collaborativeAddElement = (element: CanvasElement) => {
    originalAddElement(element);
  };

  const collaborativeUpdateElement = (id: string, element: CanvasElement) => {
    originalUpdateElement(id, element);
  };

  const collaborativeDeleteElement = (id: string) => {
    const currentElements = useCanvasStore.getState().elements;
    originalSetElements(currentElements.filter((el) => el.id !== id));
  };

  const collaborativeDeleteSelection = () => {
    originalDeleteSelection();
  };

  const collaborativeDuplicateSelection = () => {
    originalDuplicateSelection();
  };

  const collaborativeSetElements = (newElements: CanvasElement[]) => {
    originalSetElements(newElements);
  };

  const collaborativeSetSelection = (ids: string[]) => {
    originalSetSelection(ids);
  };

  const collaborativeClearSelection = () => {
    originalClearSelection();
  };

  const value: CollaborativeCanvasContextValue = {
    addElement: collaborativeAddElement,
    updateElement: collaborativeUpdateElement,
    deleteElement: collaborativeDeleteElement,
    deleteSelection: collaborativeDeleteSelection,
    duplicateSelection: collaborativeDuplicateSelection,
    setElements: collaborativeSetElements,
    setSelection: collaborativeSetSelection,
    clearSelection: collaborativeClearSelection,
  };

  return (
    <CollaborativeCanvasContext.Provider value={value}>
      {children}
    </CollaborativeCanvasContext.Provider>
  );
}
