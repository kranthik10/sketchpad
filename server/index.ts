import cors from 'cors';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from './config/index.js';
import appRouter from './routes/index.js';
import { sessionModel } from './models/session.model.js';
import { setupConnection } from './sockets/connection.socket.js';

const app = express();
const server = http.createServer(app);

// -- Middleware --
app.use(
  cors({
    origin: config.frontendOrigin,
  }),
);
app.use(express.json());

// -- API Routes --
app.use('/api', appRouter);

// -- Static file serving for production builds --
const indexHtml = path.join(config.distRoot, 'index.html');

if (existsSync(indexHtml)) {
  app.use(express.static(config.distRoot));

  app.use((_request, response) => {
    response.sendFile(indexHtml);
  });
}

// -- WebSocket server for Yjs collaboration --
const wss = new WebSocketServer({ server });

wss.on('connection', (socket: WebSocket, request) => {
  const url = new URL(request.url!, `http://${request.headers.host}`);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const roomId = pathSegments[0];

  console.log(`[WS] Connection attempt - room: ${roomId}`);

  if (!roomId || !sessionModel.exists(roomId)) {
    console.log(`[WS] Rejecting - active sessions: ${sessionModel.getAllRoomIds().join(', ')}`);
    socket.close(1008, `Invalid or expired session (roomId=${roomId})`);
    return;
  }

  setupConnection(socket, roomId);
});

// -- Start Server --
server.listen(config.port, '0.0.0.0', () => {
  console.log(`Sketchpad server listening on port ${config.port}`);
  console.log(`WebSocket collaboration on ws://0.0.0.0:${config.port}`);
});
