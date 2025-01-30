import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

interface RoomUser {
  socketId: string;
  userId: string;
  roomId: string;
}

const users: RoomUser[] = [];

io.on('connection', (socket) => {
  const { userId, roomId } = socket.handshake.auth;

  console.log(`User ${userId} connected to room ${roomId}`);

  // Join the room
  socket.join(roomId);

  // Notify others in the room
  socket.to(roomId).emit('userJoined', { userId });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User ${userId} disconnected from room ${roomId}`);
    socket.to(roomId).emit('userLeft', { userId });
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
}); 