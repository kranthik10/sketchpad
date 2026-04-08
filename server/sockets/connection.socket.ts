import { WebSocket } from 'ws';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { roomModel, messageSync, messageAwareness } from '../models/room.model.js';
import { sessionModel } from '../models/session.model.js';

const pingTimeout = 30000;

export function setupConnection(socket: WebSocket, roomId: string, isReadOnly = false): void {
  const room = roomModel.getOrCreate(roomId);
  const { doc, awareness, conns } = room;

  conns.set(socket, new Set());

  socket.on('message', (rawData: Buffer) => {
    try {
      const data = new Uint8Array(rawData);
      const decoder = decoding.createDecoder(data);
      const msgType = decoding.readVarUint(decoder);

      switch (msgType) {
        case messageSync: {
          // Read-only clients receive sync state but cannot push document changes
          if (isReadOnly) {
            break;
          }
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, messageSync);
          const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, doc, socket);
          if (encoding.length(encoder) > 1) {
            socket.send(encoding.toUint8Array(encoder));
          }
          if (syncMessageType === syncProtocol.messageYjsSyncStep2) {
            if (awareness.getStates().size > 0) {
              const awarenessEncoder = encoding.createEncoder();
              encoding.writeVarUint(awarenessEncoder, messageAwareness);
              encoding.writeVarUint8Array(
                awarenessEncoder,
                awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awareness.getStates().keys())),
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

    const controlledIds = conns.get(socket);
    conns.delete(socket);

    if (controlledIds && controlledIds.size > 0) {
      awarenessProtocol.removeAwarenessStates(awareness, Array.from(controlledIds), null);
    }

    console.log(`[WS] Client disconnected from room ${roomId} (${conns.size} remaining)`);

    if (conns.size === 0) {
      setTimeout(() => {
        const currentRoom = roomModel.get(roomId);
        if (currentRoom && currentRoom.conns.size === 0 && !sessionModel.exists(roomId)) {
          roomModel.destroy(roomId);
        }
      }, 30000);
    }
  });

  socket.on('error', (error: Error) => {
    console.error('[WS] WebSocket error:', error);
  });

  // Initial handshake
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
      awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awareness.getStates().keys())),
    );
    socket.send(encoding.toUint8Array(encoder));
  }

  console.log(`[WS] Client connected to room ${roomId} (${conns.size} total)`);
}
