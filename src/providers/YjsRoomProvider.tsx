import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useCollaborationStore } from '../stores/useCollaborationStore';
import type { CanvasElement } from '../types/canvas';
import type { YjsAwarenessUpdate } from '../types/yjs';

interface YjsRoomContextValue {
  doc: Y.Doc;
  provider: WebsocketProvider | null;
  elements: Y.Map<CanvasElement>;
  metadata: Y.Map<string>;
  awarenessUsers: Map<number, YjsAwarenessUpdate>;
  updateAwareness: (update: Partial<YjsAwarenessUpdate>) => void;
  isConnected: boolean;
}

const YjsRoomContext = createContext<YjsRoomContextValue | null>(null);

export function useYjsRoom(): YjsRoomContextValue {
  const ctx = useContext(YjsRoomContext);
  if (!ctx) {
    throw new Error('useYjsRoom must be used within YjsRoomProvider');
  }
  return ctx;
}

export function useOptionalYjsRoom(): YjsRoomContextValue | null {
  return useContext(YjsRoomContext);
}

interface YjsRoomProviderProps {
  roomId: string;
  onSessionEnded?: () => void;
  children: ReactNode;
}

export function YjsRoomProvider({ roomId, onSessionEnded, children }: YjsRoomProviderProps) {
  const userId = useCollaborationStore((s) => s.userId);
  const displayName = useCollaborationStore((s) => s.displayName);
  const userColor = useCollaborationStore((s) => s.userColor);

  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [awarenessUsers, setAwarenessUsers] = useState<Map<number, YjsAwarenessUpdate>>(
    new Map(),
  );

  const doc = useMemo(() => new Y.Doc(), []);
  const onSessionEndedRef = useRef(onSessionEnded);
  onSessionEndedRef.current = onSessionEnded;

  // Initialize Yjs structures
  const elements = useMemo(() => doc.getMap<CanvasElement>('elements'), [doc]);
  const metadata = useMemo(() => doc.getMap<string>('metadata'), [doc]);

  // Track the provider ref for awareness updates
  const providerRef = useRef<WebsocketProvider | null>(null);

  // Set up WebSocket provider
  useEffect(() => {
    // In dev mode (Vite on port 5173), the WebSocket server is on localhost:8787.
    // In production, Express serves both frontend and WebSocket on the same host/port.
    const isDev = window.location.port === '5173';
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = isDev
      ? `${window.location.hostname}:8787`
      : window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}`;

    const wsProvider = new WebsocketProvider(wsUrl, roomId, doc);

    providerRef.current = wsProvider;
    setProvider(wsProvider);

    wsProvider.on('status', (event: { status: string }) => {
      console.log(`[YjsRoom] Status: ${event.status}, roomId: ${roomId}`);
      setIsConnected(event.status === 'connected');
    });

    // Listen for session-ended close code (4001) from the server
    // y-websocket exposes the underlying WebSocket via wsProvider.ws
    const checkSessionEnded = (): void => {
      const ws = wsProvider.ws;
      if (!ws) return;

      const prevOnClose = ws.onclose;
      ws.onclose = (event: CloseEvent) => {
        if (event.code === 4001 || event.code === 1008) {
          // 4001: Host ended session
          // 1008: Invalid/Expired session (e.g. server restarted)
          // In both cases, stop reconnecting and notify the app
          wsProvider.shouldConnect = false;
          wsProvider.disconnect();
          onSessionEndedRef.current?.();
        }
        if (typeof prevOnClose === 'function') {
          prevOnClose.call(ws, event);
        }
      };
    };

    // The WebSocket instance is created asynchronously, so poll until available
    // then also re-check on each reconnect
    const pollId = setInterval(() => {
      if (wsProvider.ws) {
        checkSessionEnded();
        clearInterval(pollId);
      }
    }, 100);

    wsProvider.on('status', (event: { status: string }) => {
      if (event.status === 'connected') {
        checkSessionEnded();
      }
    });

    // Set up awareness
    const awareness = wsProvider.awareness;
    console.log(`[YjsRoom] Awareness initialized, clientID: ${awareness.clientID}`);

    awareness.on('change', () => {
      const states = awareness.getStates();
      const users = new Map<number, YjsAwarenessUpdate>();
      states.forEach((state, clientId) => {
        if (state) {
          users.set(clientId, state as YjsAwarenessUpdate);
        }
      });
      setAwarenessUsers(users);
    });

    return () => {
      clearInterval(pollId);
      wsProvider.destroy();
      providerRef.current = null;
    };
  }, [roomId, doc]);

  // Update awareness whenever user info changes
  useEffect(() => {
    if (!providerRef.current) return;

    const awareness = providerRef.current.awareness;
    const current = awareness.getLocalState() as YjsAwarenessUpdate | null;

    awareness.setLocalState({
      userId,
      name: displayName.trim() || 'You',
      color: userColor,
      cursor: (current?.cursor) ?? null,
      selectedIds: (current?.selectedIds) ?? [],
      currentDraft: (current?.currentDraft) ?? null,
    } as YjsAwarenessUpdate);
  }, [userId, displayName, userColor]);

  // Update awareness state
  const updateAwareness = useCallback(
    (update: Partial<YjsAwarenessUpdate>) => {
      if (!provider) return;
      const awareness = provider.awareness;
      const current = awareness.getLocalState() as YjsAwarenessUpdate | null;
      if (current) {
        awareness.setLocalState({ ...current, ...update });
      }
    },
    [provider],
  );

  const value = useMemo(
    () => ({
      doc,
      provider,
      elements,
      metadata,
      awarenessUsers,
      updateAwareness,
      isConnected,
    }),
    [doc, provider, elements, metadata, awarenessUsers, updateAwareness, isConnected],
  );

  return <YjsRoomContext.Provider value={value}>{children}</YjsRoomContext.Provider>;
}
