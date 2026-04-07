import { randomBytes, randomUUID } from 'node:crypto';
import { ActiveSession } from '../types/index.js';

class SessionModel {
  private activeSessions = new Map<string, ActiveSession>();

  public create(userId: string): { roomId: string; hostToken: string } {
    const roomId = `sketchpad-${randomUUID()}`;
    const hostToken = randomBytes(32).toString('hex');

    this.activeSessions.set(roomId, {
      roomId,
      hostUserId: userId,
      hostToken,
      createdAt: Date.now(),
    });

    return { roomId, hostToken };
  }

  public get(roomId: string): ActiveSession | undefined {
    return this.activeSessions.get(roomId);
  }

  public exists(roomId: string): boolean {
    return this.activeSessions.has(roomId);
  }

  public delete(roomId: string): boolean {
    return this.activeSessions.delete(roomId);
  }

  public getAllRoomIds(): string[] {
    return Array.from(this.activeSessions.keys());
  }
}

export const sessionModel = new SessionModel();
