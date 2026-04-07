import type { ComponentProps, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CanvasArea, type CanvasAreaHandle } from './components/CanvasArea';
import { CollaborationControls } from './components/CollaborationControls';
import { HelperPopup } from './components/HelperPopup';
import { PropertiesPanel } from './components/PropertiesPanel';
import { TopBar } from './components/TopBar';
import { CollaborativeCanvasProvider } from './providers/CollaborativeCanvasProvider';
import { YjsRoomProvider, useYjsRoom } from './providers/YjsRoomProvider';
import { useCanvasStore } from './stores/useCanvasStore';
import { useCollaborationStore } from './stores/useCollaborationStore';
import { useUiStore } from './stores/useUiStore';
import type { CollaborationParticipant } from './types/collaboration';

function getRoomIdFromUrl(): string | null {
  const url = new URL(window.location.href);
  return url.searchParams.get('room');
}

function syncRoomIdToUrl(roomId: string | null): void {
  const url = new URL(window.location.href);
  const currentRoomId = url.searchParams.get('room');

  if (roomId) {
    if (currentRoomId === roomId) {
      return;
    }

    url.searchParams.set('room', roomId);
  } else if (currentRoomId) {
    url.searchParams.delete('room');
  } else {
    return;
  }

  window.history.replaceState({}, '', url);
}

function buildShareUrl(roomId: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set('room', roomId);
  return url.toString();
}

interface AppShellProps {
  collaborationControls: ReactNode;
}

function AppShell({ collaborationControls }: AppShellProps) {
  const canvasBg = useUiStore((state) => state.canvasBg);
  const activeTool = useUiStore((state) => state.activeTool);
  const canvasAreaRef = useRef<CanvasAreaHandle | null>(null);

  useEffect(() => {
    document.body.dataset.tool = activeTool;
  }, [activeTool]);

  useEffect(() => {
    document.body.style.backgroundColor = canvasBg;
  }, [canvasBg]);

  return (
    <div id="app-shell">
      <TopBar
        collaborationControls={collaborationControls}
        onExport={() => canvasAreaRef.current?.exportImage()}
      />
      <div id="canvas-stage">
        <CanvasArea ref={canvasAreaRef} />
        <PropertiesPanel />
      </div>
      <HelperPopup />
    </div>
  );
}

interface ConnectedAppShellProps {
  collaborationControls: Omit<
    ComponentProps<typeof CollaborationControls>,
    'participants' | 'connectionLabel'
  >;
  fallbackParticipant: CollaborationParticipant;
}

function ConnectedAppShell({
  collaborationControls,
  fallbackParticipant,
}: ConnectedAppShellProps) {
  const { awarenessUsers, isConnected } = useYjsRoom();

  const participants = useMemo<CollaborationParticipant[]>(() => {
    const nextParticipants: CollaborationParticipant[] = [];

    awarenessUsers.forEach((user) => {
      nextParticipants.push({
        id: user.userId,
        name: user.name,
        color: user.color,
        isSelf: user.userId === fallbackParticipant.id,
      });
    });

    if (nextParticipants.length === 0) {
      nextParticipants.push(fallbackParticipant);
    }

    return nextParticipants;
  }, [awarenessUsers, fallbackParticipant]);

  return (
    <AppShell
      collaborationControls={
        <CollaborationControls
          {...collaborationControls}
          connectionLabel={isConnected ? 'Connected' : 'Connecting'}
          participants={participants}
        />
      }
    />
  );
}

export function App() {
  const showToast = useUiStore((state) => state.showToast);
  const welcomeShownRef = useRef(false);
  const currentRoomId = useCollaborationStore((state) => state.currentRoomId);
  const displayName = useCollaborationStore((state) => state.displayName);
  const userId = useCollaborationStore((state) => state.userId);
  const userColor = useCollaborationStore((state) => state.userColor);
  const hostTokens = useCollaborationStore((state) => state.hostTokens);
  const setCurrentRoomId = useCollaborationStore((state) => state.setCurrentRoomId);
  const setModalOpen = useCollaborationStore((state) => state.setModalOpen);
  const setSessionMessage = useCollaborationStore((state) => state.setSessionMessage);
  const rememberHostToken = useCollaborationStore((state) => state.rememberHostToken);
  const forgetHostToken = useCollaborationStore((state) => state.forgetHostToken);
  const handleSessionEnded = useCollaborationStore((state) => state.handleSessionEnded);

  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isStoppingSession, setIsStoppingSession] = useState(false);
  const [roomUrlReady, setRoomUrlReady] = useState(false);
  const hasIdentity = displayName.trim().length > 0;
  const canStopSession = Boolean(currentRoomId && hostTokens[currentRoomId]);
  const shareUrl = currentRoomId ? buildShareUrl(currentRoomId) : null;
  const fallbackParticipant = useMemo<CollaborationParticipant>(
    () => ({
      id: userId,
      name: displayName.trim() || 'You',
      color: userColor,
      isSelf: true,
    }),
    [displayName, userColor, userId],
  );

  useEffect(() => {
    if (welcomeShownRef.current) {
      return;
    }

    welcomeShownRef.current = true;
    showToast('Welcome to Sketchpad ✏️');
  }, [showToast]);

  useEffect(() => {
    const syncFromUrl = (): void => {
      const nextRoomId = getRoomIdFromUrl();
      if (useCollaborationStore.getState().currentRoomId !== nextRoomId) {
        setCurrentRoomId(nextRoomId);
      }
      setRoomUrlReady(true);
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);

    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [setCurrentRoomId]);

  useEffect(() => {
    if (!roomUrlReady) {
      return;
    }

    syncRoomIdToUrl(currentRoomId);
  }, [currentRoomId, roomUrlReady]);

  useEffect(() => {
    if (currentRoomId && !hasIdentity) {
      // Auto-join with a guest name -- user can change later from the session panel
      useCollaborationStore.getState().setDisplayName('Guest');
    }
  }, [currentRoomId, hasIdentity]);

  const startSession = useCallback(async (): Promise<void> => {
    if (!hasIdentity) {
      setModalOpen(true);
      setSessionMessage('Enter your name before starting a session.');
      return;
    }

    setIsStartingSession(true);
    setSessionMessage(null);

    try {
      const response = await fetch('/api/collab/start-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
        }),
      });

      const payload = (await response
        .json()
        .catch(() => ({ error: 'Unable to start the collaboration session.' }))) as {
        roomId?: string;
        hostToken?: string;
        error?: string;
      };

      if (!response.ok || !payload.roomId || !payload.hostToken) {
        throw new Error(
          payload.error ?? 'Unable to start the collaboration session.',
        );
      }

      rememberHostToken(payload.roomId, payload.hostToken);
      setCurrentRoomId(payload.roomId);
      setModalOpen(true);
      showToast('Session started');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to start the collaboration session.';
      setModalOpen(true);
      setSessionMessage(message);
    } finally {
      setIsStartingSession(false);
    }
  }, [
    hasIdentity,
    rememberHostToken,
    setCurrentRoomId,
    setModalOpen,
    setSessionMessage,
    showToast,
    userId,
  ]);

  const stopSession = useCallback(async (): Promise<void> => {
    if (!currentRoomId) {
      return;
    }

    const hostToken = hostTokens[currentRoomId];

    if (!hostToken) {
      setModalOpen(true);
      setSessionMessage('Only the host can stop this collaboration session.');
      return;
    }

    setIsStoppingSession(true);
    setSessionMessage(null);

    try {
      const response = await fetch('/api/collab/stop-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: currentRoomId,
          userId,
          hostToken,
        }),
      });

      if (!response.ok) {
        const payload = (await response
          .json()
          .catch(() => ({ error: 'Unable to stop the collaboration session.' }))) as {
          error?: string;
        };
        throw new Error(payload.error ?? 'Unable to stop the collaboration session.');
      }

      forgetHostToken(currentRoomId);
      handleSessionEnded('You ended the collaboration session.');
      showToast('Session ended');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to stop the collaboration session.';
      setModalOpen(true);
      setSessionMessage(message);
    } finally {
      setIsStoppingSession(false);
    }
  }, [
    currentRoomId,
    forgetHostToken,
    handleSessionEnded,
    hostTokens,
    setModalOpen,
    setSessionMessage,
    showToast,
    userId,
  ]);

  const collaborationControls = {
    roomId: currentRoomId,
    shareUrl,
    canStop: canStopSession,
    isStarting: isStartingSession,
    isStopping: isStoppingSession,
    onStartSession: startSession,
    onStopSession: stopSession,
  };

  if (currentRoomId) {
    return (
      <YjsRoomProvider roomId={currentRoomId}>
        <CollaborativeCanvasProvider>
          <ConnectedAppShell
            collaborationControls={collaborationControls}
            fallbackParticipant={fallbackParticipant}
          />
        </CollaborativeCanvasProvider>
      </YjsRoomProvider>
    );
  }

  return (
    <AppShell
      collaborationControls={
        <CollaborationControls
          {...collaborationControls}
          connectionLabel="Offline"
          participants={hasIdentity ? [fallbackParticipant] : []}
        />
      }
    />
  );
}
