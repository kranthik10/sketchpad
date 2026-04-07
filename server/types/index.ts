import { WebSocket } from 'ws';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';

export interface ActiveSession {
  roomId: string;
  hostUserId: string;
  hostToken: string;
  createdAt: number;
}

export interface SharedDoc {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Map<WebSocket, Set<number>>;
}

export interface StartSessionBody {
  userId?: string;
}

export interface StopSessionBody {
  roomId?: string;
  userId?: string;
  hostToken?: string;
}
