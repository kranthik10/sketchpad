import { Request, Response, NextFunction } from 'express';
import { sessionModel } from '../models/session.model.js';
import { roomModel } from '../models/room.model.js';
import { StartSessionBody, StopSessionBody } from '../types/index.js';

export const startSession = (
  request: Request<Record<string, never>, unknown, StartSessionBody>,
  response: Response,
  _next: NextFunction,
) => {
  const userId = request.body.userId?.trim();

  if (!userId) {
    response.status(400).json({
      error: 'A userId is required to start a collaboration session.',
    });
    return;
  }

  const { roomId, hostToken } = sessionModel.create(userId);

  response.status(201).json({
    roomId,
    hostToken,
  });
};

export const stopSession = (
  request: Request<Record<string, never>, unknown, StopSessionBody>,
  response: Response,
  _next: NextFunction,
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

  const sessionRecord = sessionModel.get(roomId);

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

  sessionModel.delete(roomId);

  const room = roomModel.get(roomId);
  if (room) {
    for (const [conn] of room.conns) {
      try {
        conn.close(4001, 'session-ended');
      } catch {
        // Connection may already be closing
      }
    }
  }

  setTimeout(() => {
    roomModel.destroy(roomId);
  }, 3000);

  response.status(204).end();
};
