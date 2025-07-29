
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static('public'));

let rooms = {};

// Generate random colors for users
const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD'];

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    let currentRoom = null;
    let userName = null;
    let userColor = null;

    // Create a new drawing room
    socket.on('createRoom', (data) => {
        const roomId = Math.random().toString(36).substr(2, 8).toUpperCase();
        userName = data.name || `User${Math.floor(Math.random() * 1000)}`;
        userColor = colors[Math.floor(Math.random() * colors.length)];
        
        rooms[roomId] = {
            id: roomId,
            users: [{
                id: socket.id,
                name: userName,
                color: userColor
            }],
            drawing: [], // Store drawing data
            createdAt: new Date()
        };
        
        currentRoom = roomId;
        socket.join(roomId);
        
        socket.emit('roomCreated', {
            roomId,
            userName,
            userColor,
            users: rooms[roomId].users
        });
        
        console.log(`Room created: ${roomId} by ${userName}`);
    });

    // Join an existing room
    socket.on('joinRoom', (data) => {
        const { roomId } = data;
        const room = rooms[roomId];
        
        if (!room) {
            socket.emit('error', 'Room not found');
            return;
        }
        
        if (room.users.length >= 10) { // Limit to 10 users per room
            socket.emit('error', 'Room is full');
            return;
        }
        
        userName = data.name || `User${Math.floor(Math.random() * 1000)}`;
        userColor = colors[Math.floor(Math.random() * colors.length)];
        
        // Add user to room
        room.users.push({
            id: socket.id,
            name: userName,
            color: userColor
        });
        
        currentRoom = roomId;
        socket.join(roomId);
        
        // Send current drawing state to new user
        socket.emit('roomJoined', {
            roomId,
            userName,
            userColor,
            users: room.users,
            drawing: room.drawing
        });
        
        // Notify other users
        socket.to(roomId).emit('userJoined', {
            user: { id: socket.id, name: userName, color: userColor },
            users: room.users
        });
        
        console.log(`${userName} joined room: ${roomId}`);
    });

    // Handle drawing events
    socket.on('startDrawing', (data) => {
        if (!currentRoom || !rooms[currentRoom]) return;
        
        const drawingData = {
            type: 'start',
            x: data.x,
            y: data.y,
            color: userColor,
            lineWidth: data.lineWidth || 2,
            userId: socket.id,
            userName: userName,
            timestamp: Date.now()
        };
        
        rooms[currentRoom].drawing.push(drawingData);
        socket.to(currentRoom).emit('drawing', drawingData);
    });

    socket.on('drawing', (data) => {
        if (!currentRoom || !rooms[currentRoom]) return;
        
        const drawingData = {
            type: 'draw',
            x: data.x,
            y: data.y,
            color: userColor,
            lineWidth: data.lineWidth || 2,
            userId: socket.id,
            userName: userName,
            timestamp: Date.now()
        };
        
        rooms[currentRoom].drawing.push(drawingData);
        socket.to(currentRoom).emit('drawing', drawingData);
    });

    socket.on('stopDrawing', () => {
        if (!currentRoom || !rooms[currentRoom]) return;
        
        const drawingData = {
            type: 'stop',
            userId: socket.id,
            userName: userName,
            timestamp: Date.now()
        };
        
        rooms[currentRoom].drawing.push(drawingData);
        socket.to(currentRoom).emit('drawing', drawingData);
    });

    // Clear canvas
    socket.on('clearCanvas', () => {
        if (!currentRoom || !rooms[currentRoom]) return;
        
        rooms[currentRoom].drawing = [];
        io.to(currentRoom).emit('canvasCleared', { clearedBy: userName });
    });

    // Handle chat messages
    socket.on('chatMessage', (message) => {
        if (!currentRoom || !rooms[currentRoom]) return;
        
        const chatData = {
            userName,
            userColor,
            message: message.trim(),
            timestamp: Date.now()
        };
        
        io.to(currentRoom).emit('chatMessage', chatData);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        
        if (currentRoom && rooms[currentRoom]) {
            const room = rooms[currentRoom];
            const userIndex = room.users.findIndex(user => user.id === socket.id);
            
            if (userIndex !== -1) {
                const disconnectedUser = room.users[userIndex];
                room.users.splice(userIndex, 1);
                
                // Notify remaining users
                socket.to(currentRoom).emit('userLeft', {
                    user: disconnectedUser,
                    users: room.users
                });
                
                // Delete room if empty
                if (room.users.length === 0) {
                    delete rooms[currentRoom];
                    console.log(`Room deleted: ${currentRoom}`);
                }
            }
        }
    });
});

// Clean up empty rooms periodically
setInterval(() => {
    const now = new Date();
    Object.keys(rooms).forEach(roomId => {
        const room = rooms[roomId];
        if (room.users.length === 0 || (now - room.createdAt) > 24 * 60 * 60 * 1000) { // 24 hours
            delete rooms[roomId];
            console.log(`Cleaned up room: ${roomId}`);
        }
    });
}, 60 * 60 * 1000); // Check every hour

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Multiplayer Drawing Board server running on port ${PORT}`);
});