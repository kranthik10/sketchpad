import express from 'express';
import { roomModel } from '../models/room.model.js';
import { sessionModel } from '../models/session.model.js';

const router = express.Router();

router.get('/stats', (_request, response) => {
  const roomStats = roomModel.getStats();
  const activeSessions = sessionModel.getAllRoomIds();

  response.json({
    timestamp: new Date().toISOString(),
    activeSessions: activeSessions.length,
    activeRooms: roomStats.totalRooms,
    totalConnectedUsers: roomStats.totalUsers,
    rooms: roomStats.rooms.map((r) => ({
      roomId: r.roomId,
      users: r.users,
      hasActiveSession: activeSessions.includes(r.roomId),
    })),
  });
});

export default router;
