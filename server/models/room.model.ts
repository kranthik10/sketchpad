import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import { WebSocket } from 'ws';
import { SharedDoc } from '../types/index.js';

// y-protocols message types
export const messageSync = 0;
export const messageAwareness = 1;

/**
 * In-memory storage for collaboration rooms.
 */
class RoomModel {
  private rooms = new Map<string, SharedDoc>();

  public getOrCreate(roomId: string): SharedDoc {
    let room = this.rooms.get(roomId);
    if (room) return room;

    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);
    awareness.setLocalState(null);

    room = { doc, awareness, conns: new Map() };
    this.rooms.set(roomId, room);

    // Document update listener
    doc.on('update', (update: Uint8Array, origin: unknown) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);

      const r = this.rooms.get(roomId);
      if (!r) return;
      for (const [conn] of r.conns) {
        if (conn !== origin && conn.readyState === WebSocket.OPEN) {
          conn.send(message);
        }
      }
    });

    // Awareness update listener
    awareness.on('update', ({ added, updated, removed }: { added: number[], updated: number[], removed: number[] }, origin: unknown) => {
      const changedClients = [...added, ...updated, ...removed];
      if (changedClients.length === 0) return;

      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients));
      const message = encoding.toUint8Array(encoder);

      const r = this.rooms.get(roomId);
      if (!r) return;
      for (const [conn] of r.conns) {
        if (conn.readyState === WebSocket.OPEN) {
          conn.send(message);
        }
      }
    });

    return room;
  }

  public get(roomId: string): SharedDoc | undefined {
    return this.rooms.get(roomId);
  }

  public getStats(): { totalRooms: number; totalUsers: number; rooms: { roomId: string; users: number }[] } {
    const rooms: { roomId: string; users: number }[] = [];
    let totalUsers = 0;

    for (const [roomId, room] of this.rooms) {
      const count = room.conns.size;
      rooms.push({ roomId, users: count });
      totalUsers += count;
    }

    return { totalRooms: this.rooms.size, totalUsers, rooms };
  }

  public destroy(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.awareness.destroy();
    room.doc.destroy();
    this.rooms.delete(roomId);
  }
}

export const roomModel = new RoomModel();
