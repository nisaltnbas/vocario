"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
    },
});
const users = [];
io.on('connection', (socket) => {
    const { userId, roomId } = socket.handshake.auth;
    console.log(`User ${userId} connected to room ${roomId}`);
    socket.join(roomId);
    socket.to(roomId).emit('userJoined', { userId });
    socket.on('disconnect', () => {
        console.log(`User ${userId} disconnected from room ${roomId}`);
        socket.to(roomId).emit('userLeft', { userId });
    });
});
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Socket.IO server running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map