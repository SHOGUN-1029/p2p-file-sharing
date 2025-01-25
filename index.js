const http = require('http');
const express = require('express');
const { Server: SocketIO } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

const PORT = process.env.PORT || 8000;
const users = new Map();

io.on('connection', socket => {
    console.log(`User connected: ${socket.id}`);
    users.set(socket.id, socket.id);

    // Notify all users of a new connection
    socket.broadcast.emit('users:joined', socket.id);
    socket.emit('hello', { id: socket.id });

    // Handle WebRTC signaling
    socket.on('outgoing:call', data => {
        const { fromOffer, to } = data;
        socket.to(to).emit('incoming:call', { from: socket.id, offer: fromOffer });
    });

    socket.on('call:accepted', data => {
        const { answer, to } = data;
        socket.to(to).emit('incoming:answer', { from: socket.id, answer: answer });
    });

    // Handle ICE candidates
    socket.on('ice:candidate', data => {
        const { candidate, to } = data;
        socket.to(to).emit('ice:candidate', { from: socket.id, candidate });
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        users.delete(socket.id);
        socket.broadcast.emit('user:disconnect', socket.id);
    });
});

// Serve static files
app.use(express.static(path.resolve('./public')));

// Get list of connected users
app.get('/users', (req, res) => {
    return res.json(Array.from(users));
});

server.listen(PORT, () => console.log(`Server started at PORT:${PORT}`));