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

interface RoomUser {
  socketId: string;
  userId: string;
  roomId: string;
}

const users: RoomUser[] = [];

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId: string) => {
    console.log(`User ${socket.id} joining room ${roomId}`);
    
    // Odadaki diğer kullanıcıları bul
    const usersInRoom = users.filter(user => user.roomId === roomId);
    
    // Yeni kullanıcıyı listeye ekle
    users.push({
      socketId: socket.id,
      userId: socket.id,
      roomId
    });

    // Odaya katıl
    socket.join(roomId);

    // Yeni kullanıcıya odadaki diğer kullanıcıların listesini gönder
    socket.emit('all-users', usersInRoom.map(user => user.socketId));
  });

  socket.on('sending-signal', ({ userToSignal, signal }) => {
    console.log(`User ${socket.id} sending signal to ${userToSignal}`);
    io.to(userToSignal).emit('user-joined', {
      signal,
      peerId: socket.id
    });
  });

  socket.on('returning-signal', ({ peerId, signal }) => {
    console.log(`User ${socket.id} returning signal to ${peerId}`);
    io.to(peerId).emit('receiving-returned-signal', {
      signal,
      peerId: socket.id
    });
  });

  socket.on('leave-room', (roomId: string) => {
    console.log(`User ${socket.id} leaving room ${roomId}`);
    
    // Kullanıcıyı listeden çıkar
    const index = users.findIndex(user => user.socketId === socket.id);
    if (index > -1) {
      users.splice(index, 1);
    }

    // Odadan çık
    socket.leave(roomId);

    // Odadaki diğer kullanıcılara bildir
    socket.to(roomId).emit('user-left', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Kullanıcının bulunduğu odayı bul
    const user = users.find(u => u.socketId === socket.id);
    if (user) {
      // Odadaki diğer kullanıcılara bildir
      socket.to(user.roomId).emit('user-left', socket.id);
      
      // Kullanıcıyı listeden çıkar
      const index = users.findIndex(u => u.socketId === socket.id);
      if (index > -1) {
        users.splice(index, 1);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 