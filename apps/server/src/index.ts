import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

interface User {
  socketId: string;
  userId: string;
  roomId: string;
}

interface ChatMessage {
  roomId: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
}

const users = new Map<string, User>();
// Her oda için mesajları tutan Map
const roomMessages = new Map<string, ChatMessage[]>();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ roomId, userId }) => {
    console.log(`User ${userId} joining room ${roomId}`);
    
    // Store user info
    users.set(socket.id, { socketId: socket.id, userId, roomId });
    
    // Join socket.io room
    socket.join(roomId);
    
    // Notify others in the room
    socket.to(roomId).emit('user-joined', { userId });
    
    // Get list of other users in the room
    const otherUsers = Array.from(users.values())
      .filter(user => user.roomId === roomId && user.socketId !== socket.id)
      .map(user => user.userId);
    
    // Send list of other users to the joining user
    socket.emit('room-users', { users: otherUsers });

    // Odanın mevcut mesajlarını gönder
    const messages = roomMessages.get(roomId) || [];
    socket.emit('chat-history', { messages });
  });

  socket.on('leave-room', ({ roomId, userId }) => {
    console.log(`User ${userId} leaving room ${roomId}`);
    
    // Remove user from storage
    users.delete(socket.id);
    
    // Leave socket.io room
    socket.leave(roomId);
    
    // Notify others
    socket.to(roomId).emit('user-left', { userId });
  });

  // Chat mesajlarını işle
  socket.on('chat-message', (message: ChatMessage) => {
    const user = users.get(socket.id);
    if (!user) return;

    // Mesajı odanın mesaj geçmişine ekle
    const messages = roomMessages.get(message.roomId) || [];
    messages.push(message);
    roomMessages.set(message.roomId, messages);

    // Odadaki herkese mesajı gönder (gönderen dahil)
    io.to(message.roomId).emit('chat-message', message);
  });

  // WebRTC Signaling
  socket.on('offer', ({ to, offer }) => {
    const user = users.get(socket.id);
    if (user) {
      socket.to(user.roomId).emit('offer', { from: user.userId, offer });
    }
  });

  socket.on('answer', ({ to, answer }) => {
    const user = users.get(socket.id);
    if (user) {
      socket.to(user.roomId).emit('answer', { from: user.userId, answer });
    }
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    const user = users.get(socket.id);
    if (user) {
      socket.to(user.roomId).emit('ice-candidate', { from: user.userId, candidate });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const user = users.get(socket.id);
    if (user) {
      socket.to(user.roomId).emit('user-left', { userId: user.userId });
      users.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 