const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Store connected users
const connectedUsers = new Map();

// Generate random user colors
const userColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D2B4DE'
];

function getRandomColor() {
    return userColors[Math.floor(Math.random() * userColors.length)];
}

function generateUsername() {
    const adjectives = ['Creative', 'Artistic', 'Swift', 'Bright', 'Cool', 'Smart', 'Quick', 'Bold', 'Calm', 'Wise'];
    const nouns = ['Artist', 'Painter', 'Drawer', 'Creator', 'Sketcher', 'Designer', 'Brush', 'Pen', 'Canvas', 'Color'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 999) + 1;
    return `${adj}${noun}${num}`;
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // Create user profile
    const userProfile = {
        id: socket.id,
        username: generateUsername(),
        color: getRandomColor(),
        joinedAt: new Date()
    };
    
    connectedUsers.set(socket.id, userProfile);
    
    // Send user their profile
    socket.emit('userProfile', userProfile);
    
    // Send current user count to all clients
    io.emit('userCount', io.engine.clientsCount);
    
    // Broadcast new user joined
    socket.broadcast.emit('userJoined', {
        username: userProfile.username,
        color: userProfile.color
    });
    
    // Handle drawing events
    socket.on('draw', (data) => {
        const user = connectedUsers.get(socket.id);
        if (user) {
            // Add user info to drawing data
            const drawData = {
                ...data,
                username: user.username,
                userColor: user.color
            };
            socket.broadcast.emit('draw', drawData);
        }
    });
    
    // Handle clear canvas events
    socket.on('clear', () => {
        const user = connectedUsers.get(socket.id);
        socket.broadcast.emit('clear', {
            clearedBy: user ? user.username : 'Unknown'
        });
    });
    
    socket.on('disconnect', () => {
        const user = connectedUsers.get(socket.id);
        console.log('Client disconnected:', socket.id, user ? user.username : '');
        
        if (user) {
            // Broadcast user left
            socket.broadcast.emit('userLeft', {
                username: user.username,
                color: user.color
            });
        }
        
        connectedUsers.delete(socket.id);
        
        // Send updated user count to all remaining clients
        io.emit('userCount', io.engine.clientsCount);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});