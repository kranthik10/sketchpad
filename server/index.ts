import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(serverRoot, '..');
const envPath = existsSync(path.join(projectRoot, '.env'))
  ? path.join(projectRoot, '.env')
  : path.join(projectRoot, '.env.example');

dotenv.config({
  path: envPath,
});

const port = Number(process.env.PORT ?? 8787);
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';

// y-protocols message types (matches what WebsocketProvider sends)
const messageSync = 0;
const messageAwareness = 1;

// Ping interval for connection health checks (30 seconds)
const pingTimeout = 30000;

interface ActiveSession {
  roomId: string;
  hostUserId: string;
  hostToken: string;
  createdAt: number;
}

interface StartSessionBody {
  userId?: string;
}

interface StopSessionBody {
  roomId?: string;
  userId?: string;
  hostToken?: string;
}

const activeSessions = new Map<string, ActiveSession>();

// -- Shared Yjs document per room --

interface SharedDoc {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Map<WebSocket, Set<number>>;
}

const rooms = new Map<string, SharedDoc>();

function getOrCreateRoom(roomId: string): SharedDoc {
  let room = rooms.get(roomId);
  if (room) return room;

  const doc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(doc);

  // Remove awareness state when a client's state becomes outdated
  awareness.setLocalState(null);

  room = { doc, awareness, conns: new Map() };
  rooms.set(roomId, room);

  // Broadcast document updates to all connected clients
  doc.on('update', (update: Uint8Array, origin: unknown) => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeUpdate(encoder, update);
    const message = encoding.toUint8Array(encoder);

    const r = rooms.get(roomId);
    if (!r) return;
    for (const [conn] of r.conns) {
      if (conn !== origin && conn.readyState === WebSocket.OPEN) {
        conn.send(message);
      }
    }
  });

  // Broadcast awareness updates to all connected clients
  awareness.on(
    'update',
    ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
      const changedClients = [...added, ...updated, ...removed];
      if (changedClients.length === 0) return;

      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients),
      );
      const message = encoding.toUint8Array(encoder);

      const r = rooms.get(roomId);
      if (!r) return;
      for (const [conn] of r.conns) {
        if (conn.readyState === WebSocket.OPEN) {
          conn.send(message);
        }
      }
    },
  );

  return room;
}

function destroyRoom(roomId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;
  room.awareness.destroy();
  room.doc.destroy();
  rooms.delete(roomId);
}

function createRoomId(): string {
  return `sketchpad-${randomUUID()}`;
}

function createHostToken(): string {
  return randomBytes(32).toString('hex');
}

// -- Express app --

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: frontendOrigin,
  }),
);
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
  });
});

app.post(
  '/api/collab/start-session',
  (
    request: express.Request<Record<string, never>, unknown, StartSessionBody>,
    response,
  ) => {
    const userId = request.body.userId?.trim();

    if (!userId) {
      response.status(400).json({
        error: 'A userId is required to start a collaboration session.',
      });
      return;
    }

    const roomId = createRoomId();
    const hostToken = createHostToken();

    activeSessions.set(roomId, {
      roomId,
      hostUserId: userId,
      hostToken,
      createdAt: Date.now(),
    });

    response.status(201).json({
      roomId,
      hostToken,
    });
  },
);

app.post(
  '/api/collab/stop-session',
  (
    request: express.Request<Record<string, never>, unknown, StopSessionBody>,
    response,
  ) => {
    const roomId = request.body.roomId?.trim();
    const userId = request.body.userId?.trim();
    const hostToken = request.body.hostToken?.trim();

    if (!roomId || !userId || !hostToken) {
      response.status(400).json({
        error: 'roomId, userId, and hostToken are required.',
      });
      return;
    }

    const sessionRecord = activeSessions.get(roomId);

    if (!sessionRecord) {
      response.status(404).json({
        error: 'This collaboration session is no longer available.',
      });
      return;
    }

    if (
      sessionRecord.hostUserId !== userId ||
      sessionRecord.hostToken !== hostToken
    ) {
      response.status(403).json({
        error: 'Only the session host can stop this collaboration session.',
      });
      return;
    }

    activeSessions.delete(roomId);

    // Delay cleanup so remaining clients can gracefully disconnect
    setTimeout(() => {
      destroyRoom(roomId);
    }, 5000);

    response.status(204).end();
  },
);

// -- WebSocket server for Yjs collaboration --

const wss = new WebSocketServer({ server });

function setupConnection(socket: WebSocket, roomId: string): void {
  const room = getOrCreateRoom(roomId);
  const { doc, awareness, conns } = room;

  // Track which awareness client IDs this connection controls
  conns.set(socket, new Set());

  // Handle incoming binary messages using the y-protocols wire format
  socket.on('message', (rawData: Buffer) => {
    try {
      const data = new Uint8Array(rawData);
      const decoder = decoding.createDecoder(data);
      const msgType = decoding.readVarUint(decoder);

      switch (msgType) {
        case messageSync: {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, messageSync);
          const syncMessageType = syncProtocol.readSyncMessage(
            decoder,
            encoder,
            doc,
            socket, // transactionOrigin -- used to skip broadcast back to sender
          );
          if (encoding.length(encoder) > 1) {
            // There is a response (e.g. SyncStep2 reply to SyncStep1)
            socket.send(encoding.toUint8Array(encoder));
          }
          if (syncMessageType === syncProtocol.messageYjsSyncStep2) {
            // Client has finished initial sync; send remaining awareness
            if (awareness.getStates().size > 0) {
              const awarenessEncoder = encoding.createEncoder();
              encoding.writeVarUint(awarenessEncoder, messageAwareness);
              encoding.writeVarUint8Array(
                awarenessEncoder,
                awarenessProtocol.encodeAwarenessUpdate(
                  awareness,
                  Array.from(awareness.getStates().keys()),
                ),
              );
              socket.send(encoding.toUint8Array(awarenessEncoder));
            }
          }
          break;
        }

        case messageAwareness: {
          const update = decoding.readVarUint8Array(decoder);
          awarenessProtocol.applyAwarenessUpdate(awareness, update, socket);
          break;
        }

        default:
          console.warn(`[WS] Unknown message type: ${msgType}`);
      }
    } catch (error) {
      console.error('[WS] Error processing message:', error);
    }
  });

  // Connection health check via ping/pong
  let pongReceived = true;
  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      socket.terminate();
      clearInterval(pingInterval);
      return;
    }
    pongReceived = false;
    try {
      socket.ping();
    } catch {
      socket.terminate();
      clearInterval(pingInterval);
    }
  }, pingTimeout);

  socket.on('pong', () => {
    pongReceived = true;
  });

  socket.on('close', () => {
    clearInterval(pingInterval);

    // Remove this client's awareness states
    const controlledIds = conns.get(socket);
    conns.delete(socket);

    if (controlledIds && controlledIds.size > 0) {
      awarenessProtocol.removeAwarenessStates(
        awareness,
        Array.from(controlledIds),
        null,
      );
    }

    console.log(`[WS] Client disconnected from room ${roomId} (${conns.size} remaining)`);

    // Destroy room if no active session and no clients remain
    if (conns.size === 0) {
      setTimeout(() => {
        const currentRoom = rooms.get(roomId);
        if (currentRoom && currentRoom.conns.size === 0 && !activeSessions.has(roomId)) {
          destroyRoom(roomId);
        }
      }, 30000);
    }
  });

  socket.on('error', (error: Error) => {
    console.error('[WS] WebSocket error:', error);
  });

  // -- Initial handshake: send SyncStep1 + awareness to the new client --
  {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, doc);
    socket.send(encoding.toUint8Array(encoder));
  }

  if (awareness.getStates().size > 0) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageAwareness);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(
        awareness,
        Array.from(awareness.getStates().keys()),
      ),
    );
    socket.send(encoding.toUint8Array(encoder));
  }

  console.log(`[WS] Client connected to room ${roomId} (${conns.size} total)`);
}

wss.on('connection', (socket: WebSocket, request) => {
  const url = new URL(request.url!, `http://${request.headers.host}`);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const roomId = pathSegments[0];

  console.log(`[WS] Connection attempt - room: ${roomId}`);

  if (!roomId || !activeSessions.has(roomId)) {
    console.log(`[WS] Rejecting - active sessions: ${Array.from(activeSessions.keys())}`);
    socket.close(1008, `Invalid or expired session (roomId=${roomId})`);
    return;
  }

  setupConnection(socket, roomId);
});

// -- Static file serving for production builds --

const distRoot = path.join(projectRoot, 'dist');
const indexHtml = path.join(distRoot, 'index.html');

if (existsSync(indexHtml)) {
  app.use(express.static(distRoot));

  app.use((_request, response) => {
    response.sendFile(indexHtml);
  });
}

server.listen(port, () => {
  console.log(`Sketchpad server listening on http://localhost:${port}`);
  console.log(`WebSocket collaboration on ws://localhost:${port}`);
});
