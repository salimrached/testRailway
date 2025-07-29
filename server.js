const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Game state management
class GameRoom {
    constructor(id, size = 3, roomCode = null) {
        this.id = id;
        this.roomCode = roomCode || this.generateRoomCode();
        this.size = size;
        this.players = new Map();
        this.targetBoard = [];
        this.gameState = 'waiting'; // waiting, countdown, playing, finished
        this.winner = null;
        this.startTime = null;
        this.maxPlayers = 4;
        
        this.generateTargetBoard();
    }
    
    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    generateTargetBoard() {
        this.targetBoard = [];
        for (let row = 0; row < this.size; row++) {
            this.targetBoard[row] = [];
            for (let col = 0; col < this.size; col++) {
                this.targetBoard[row][col] = {
                    id: row * this.size + col,
                    colorIndex: row,
                    value: row * this.size + col
                };
            }
        }
    }
    
    addPlayer(playerId, playerName, socket) {
        if (this.players.size >= this.maxPlayers) {
            return false;
        }
        
        // Create scrambled board for the player
        const playerBoard = this.createScrambledBoard();
        
        this.players.set(playerId, {
            id: playerId,
            name: playerName,
            socket: socket,
            board: playerBoard,
            moves: 0,
            isReady: false,
            joinTime: Date.now()
        });
        
        return true;
    }
    
    removePlayer(playerId) {
        this.players.delete(playerId);
        if (this.players.size === 0) {
            // Room is empty, can be cleaned up
            return true;
        }
        return false;
    }
    
    createScrambledBoard() {
        // Start with target board
        let board = JSON.parse(JSON.stringify(this.targetBoard));
        
        // Apply random rotations to scramble
        const scrambleMoves = 15 + Math.floor(Math.random() * 10); // 15-25 moves
        
        for (let i = 0; i < scrambleMoves; i++) {
            const moveType = Math.floor(Math.random() * 4);
            const index = Math.floor(Math.random() * this.size);
            
            switch (moveType) {
                case 0:
                    this.rotateColumnDown(board, index);
                    break;
                case 1:
                    this.rotateColumnUp(board, index);
                    break;
                case 2:
                    this.rotateRowRight(board, index);
                    break;
                case 3:
                    this.rotateRowLeft(board, index);
                    break;
            }
        }
        
        return board;
    }
    
    // Board manipulation methods (same logic as client)
    rotateColumnDown(board, colIndex) {
        if (colIndex < 0 || colIndex >= this.size) return;
        const temp = board[this.size - 1][colIndex];
        for (let row = this.size - 1; row > 0; row--) {
            board[row][colIndex] = board[row - 1][colIndex];
        }
        board[0][colIndex] = temp;
    }
    
    rotateColumnUp(board, colIndex) {
        if (colIndex < 0 || colIndex >= this.size) return;
        const temp = board[0][colIndex];
        for (let row = 0; row < this.size - 1; row++) {
            board[row][colIndex] = board[row + 1][colIndex];
        }
        board[this.size - 1][colIndex] = temp;
    }
    
    rotateRowRight(board, rowIndex) {
        if (rowIndex < 0 || rowIndex >= this.size) return;
        const temp = board[rowIndex][this.size - 1];
        for (let col = this.size - 1; col > 0; col--) {
            board[rowIndex][col] = board[rowIndex][col - 1];
        }
        board[rowIndex][0] = temp;
    }
    
    rotateRowLeft(board, rowIndex) {
        if (rowIndex < 0 || rowIndex >= this.size) return;
        const temp = board[rowIndex][0];
        for (let col = 0; col < this.size - 1; col++) {
            board[rowIndex][col] = board[rowIndex][col + 1];
        }
        board[rowIndex][this.size - 1] = temp;
    }
    
    applyMove(playerId, moveType, index) {
        const player = this.players.get(playerId);
        if (!player || this.gameState !== 'playing') {
            return false;
        }
        
        // Apply the move to player's board
        switch (moveType) {
            case 'columnDown':
                this.rotateColumnDown(player.board, index);
                break;
            case 'columnUp':
                this.rotateColumnUp(player.board, index);
                break;
            case 'rowRight':
                this.rotateRowRight(player.board, index);
                break;
            case 'rowLeft':
                this.rotateRowLeft(player.board, index);
                break;
            default:
                return false;
        }
        
        player.moves++;
        
        // Check if player won
        if (this.checkWin(player.board)) {
            this.winner = playerId;
            this.gameState = 'finished';
            return 'win';
        }
        
        return 'move';
    }
    
    checkWin(playerBoard) {
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (playerBoard[row][col].colorIndex !== this.targetBoard[row][col].colorIndex) {
                    return false;
                }
            }
        }
        return true;
    }
    
    startGame() {
        if (this.players.size < 1) return false;
        
        this.gameState = 'countdown';
        this.startTime = Date.now();
        
        // Start countdown, then switch to playing
        setTimeout(() => {
            this.gameState = 'playing';
        }, 3000); // 3 second countdown
        
        return true;
    }
    
    getGameState() {
        return {
            id: this.id,
            roomCode: this.roomCode,
            size: this.size,
            gameState: this.gameState,
            targetBoard: this.targetBoard,
            players: Array.from(this.players.values()).map(p => ({
                id: p.id,
                name: p.name,
                moves: p.moves,
                board: p.board
            })),
            winner: this.winner,
            startTime: this.startTime
        };
    }
}

//s Game rooms management
const gameRooms = new Map();
const roomCodeMap = new Map(); // Map room codes to room IDs
const playerRooms = new Map(); // Track which room each player is in

function createRoom(size = 3) {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newRoom = new GameRoom(roomId, size);
    gameRooms.set(roomId, newRoom);
    roomCodeMap.set(newRoom.roomCode, roomId);
    return newRoom;
}

function findRoomByCode(roomCode) {
    const roomId = roomCodeMap.get(roomCode.toUpperCase());
    return roomId ? gameRooms.get(roomId) : null;
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    
    socket.on('createGame', (data) => {
        const { playerName, gridSize } = data;
        const size = gridSize || 3;
        
        // Create new room
        const room = createRoom(size);
        
        // Add player to room
        if (room.addPlayer(socket.id, playerName || `Player_${socket.id.substr(0, 4)}`, socket)) {
            socket.join(room.id);
            playerRooms.set(socket.id, room.id);
            
            console.log(`Player ${socket.id} created room ${room.id} with code ${room.roomCode}`);
            
            // Send room creation confirmation
            socket.emit('gameCreated', {
                roomId: room.id,
                roomCode: room.roomCode,
                playerId: socket.id,
                gameState: room.getGameState()
            });
            
            // Broadcast updated game state to all players in room
            io.to(room.id).emit('gameStateUpdate', room.getGameState());
        } else {
            socket.emit('joinError', { message: 'Failed to create room' });
        }
    });
    
    socket.on('joinGame', (data) => {
        const { playerName, roomCode } = data;
        
        if (!roomCode) {
            socket.emit('joinError', { message: 'Room code is required' });
            return;
        }
        
        // Find room by code
        const room = findRoomByCode(roomCode);
        
        if (!room) {
            socket.emit('joinError', { message: 'Room not found. Please check the room code.' });
            return;
        }
        
        if (room.gameState !== 'waiting') {
            socket.emit('joinError', { message: 'Game already in progress' });
            return;
        }
        
        // Add player to room
        if (room.addPlayer(socket.id, playerName || `Player_${socket.id.substr(0, 4)}`, socket)) {
            socket.join(room.id);
            playerRooms.set(socket.id, room.id);
            
            console.log(`Player ${socket.id} joined room ${room.id} with code ${room.roomCode}`);
            
            // Send initial game state to player
            socket.emit('gameJoined', {
                roomId: room.id,
                roomCode: room.roomCode,
                playerId: socket.id,
                gameState: room.getGameState()
            });
            
            // Broadcast updated game state to all players in room
            io.to(room.id).emit('gameStateUpdate', room.getGameState());
            
            // Auto-start if room has 2+ players (for testing)
            if (room.players.size >= 2 && room.gameState === 'waiting') {
                setTimeout(() => {
                    if (room.startGame()) {
                        io.to(room.id).emit('gameStarting', {
                            countdown: 3,
                            gameState: room.getGameState()
                        });
                        
                        setTimeout(() => {
                            io.to(room.id).emit('gameStateUpdate', room.getGameState());
                        }, 3000);
                    }
                }, 2000); // 2 second delay before starting
            }
        } else {
            socket.emit('joinError', { message: 'Room is full' });
        }
    });
    
    socket.on('makeMove', (data) => {
        const roomId = playerRooms.get(socket.id);
        const room = gameRooms.get(roomId);
        
        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }
        
        const { moveType, index } = data;
        const result = room.applyMove(socket.id, moveType, index);
        
        if (result === 'win') {
            // Player won!
            io.to(room.id).emit('gameWon', {
                winner: socket.id,
                winnerName: room.players.get(socket.id).name,
                gameState: room.getGameState()
            });
        } else if (result === 'move') {
            // Valid move, broadcast update
            io.to(room.id).emit('gameStateUpdate', room.getGameState());
        } else {
            socket.emit('invalidMove', { message: 'Invalid move' });
        }
    });
    
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        
        const roomId = playerRooms.get(socket.id);
        if (roomId) {
            const room = gameRooms.get(roomId);
            if (room) {
                const isEmpty = room.removePlayer(socket.id);
                
                if (isEmpty) {
                    // Clean up empty room
                    gameRooms.delete(roomId);
                    roomCodeMap.delete(room.roomCode);
                    console.log(`Room ${roomId} deleted (empty)`);
                } else {
                    // Broadcast updated game state
                    io.to(roomId).emit('playerLeft', {
                        playerId: socket.id,
                        gameState: room.getGameState()
                    });
                }
            }
            playerRooms.delete(socket.id);
        }
    });
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        rooms: gameRooms.size,
        totalPlayers: Array.from(gameRooms.values()).reduce((sum, room) => sum + room.players.size, 0)
    });
});

// Get port from environment variable or default to 3000
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`🎮 Squareg Multiplayer Server running on port ${PORT}`);
    console.log(`🌐 Ready for Railway deployment!`);
});
