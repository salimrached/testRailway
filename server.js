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
        this.gameState = 'waiting'; // waiting, countdown, playing, finished, matchFinished
        this.winner = null;
        this.matchWinner = null;
        this.startTime = null;
        this.maxPlayers = 4;
        this.currentRound = 1;
        this.maxRounds = 7; // Best of 7
        this.roundScores = new Map(); // Track wins per player
        
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
        // Create initial ordered board
        const initialBoard = [];
        for (let row = 0; row < this.size; row++) {
            initialBoard[row] = [];
            for (let col = 0; col < this.size; col++) {
                initialBoard[row][col] = {
                    id: row * this.size + col,
                    colorIndex: row,
                    value: row * this.size + col
                };
            }
        }
        
        // Create shuffled target board (this is what players need to match)
        this.targetBoard = JSON.parse(JSON.stringify(initialBoard));
        this.shuffleTargetBoard();
    }
    
    shuffleTargetBoard() {
        // Apply random rotations to create the target pattern
        const shuffleMoves = 20 + Math.floor(Math.random() * 15); // 20-35 moves for good scrambling
        
        for (let i = 0; i < shuffleMoves; i++) {
            const moveType = Math.floor(Math.random() * 4);
            const index = Math.floor(Math.random() * this.size);
            
            switch (moveType) {
                case 0:
                    this.rotateColumnDown(this.targetBoard, index);
                    break;
                case 1:
                    this.rotateColumnUp(this.targetBoard, index);
                    break;
                case 2:
                    this.rotateRowRight(this.targetBoard, index);
                    break;
                case 3:
                    this.rotateRowLeft(this.targetBoard, index);
                    break;
            }
        }
    }
    
    createInitialPlayerBoard() {
        // Players start with the initial ordered state
        const board = [];
        for (let row = 0; row < this.size; row++) {
            board[row] = [];
            for (let col = 0; col < this.size; col++) {
                board[row][col] = {
                    id: row * this.size + col,
                    colorIndex: row,
                    value: row * this.size + col
                };
            }
        }
        return board;
    }
    
    addPlayer(playerId, playerName, socket) {
        if (this.players.size >= this.maxPlayers) {
            return false;
        }
        
        // Create initial ordered board for the player (they start organized)
        const playerBoard = this.createInitialPlayerBoard();
        
        this.players.set(playerId, {
            id: playerId,
            name: playerName,
            socket: socket,
            board: playerBoard,
            moves: 0,
            roundWins: 0, // Track round wins
            isReady: false,
            joinTime: Date.now()
        });
        
        // Initialize score tracking
        this.roundScores.set(playerId, 0);
        
        return true;
    }
    
    removePlayer(playerId) {
        this.players.delete(playerId);
        this.roundScores.delete(playerId);
        if (this.players.size === 0) {
            // Room is empty, can be cleaned up
            return true;
        }
        return false;
    }
    
    getGameState() {
        return {
            id: this.id,
            roomCode: this.roomCode,
            size: this.size,
            gameState: this.gameState,
            currentRound: this.currentRound,
            maxRounds: this.maxRounds,
            targetBoard: this.targetBoard,
            players: Array.from(this.players.values()).map(p => ({
                id: p.id,
                name: p.name,
                moves: p.moves,
                roundWins: p.roundWins,
                board: p.board
            })),
            winner: this.winner,
            matchWinner: this.matchWinner,
            roundScores: Object.fromEntries(this.roundScores),
            startTime: this.startTime
        };
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
        
        // Check if player won this round
        if (this.checkWin(player.board)) {
            return this.handleRoundWin(playerId);
        }
        
        return 'move';
    }
    
    handleRoundWin(playerId) {
        const player = this.players.get(playerId);
        
        // Increment round wins
        player.roundWins++;
        this.roundScores.set(playerId, player.roundWins);
        
        this.winner = playerId;
        
        // Check if this player won the match (best of 7)
        const requiredWins = Math.ceil(this.maxRounds / 2); // 4 wins needed for best of 7
        
        if (player.roundWins >= requiredWins) {
            // Match winner!
            this.matchWinner = playerId;
            this.gameState = 'matchFinished';
            return 'matchWin';
        } else {
            // Round winner, but match continues
            this.gameState = 'roundFinished';
            return 'roundWin';
        }
    }
    
    startNextRound() {
        if (this.gameState !== 'roundFinished') {
            return false;
        }
        
        this.currentRound++;
        this.winner = null;
        
        // Generate new target pattern
        this.shuffleTargetBoard();
        
        // Reset all player boards to initial state
        this.players.forEach(player => {
            player.board = this.createInitialPlayerBoard();
            player.moves = 0;
        });
        
        // Start new round countdown
        this.gameState = 'countdown';
        this.startTime = Date.now();
        
        return true;
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
            currentRound: this.currentRound,
            maxRounds: this.maxRounds,
            targetBoard: this.targetBoard,
            players: Array.from(this.players.values()).map(p => ({
                id: p.id,
                name: p.name,
                moves: p.moves,
                roundWins: p.roundWins,
                board: p.board
            })),
            winner: this.winner,
            matchWinner: this.matchWinner,
            roundScores: Object.fromEntries(this.roundScores),
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
        
        if (result === 'matchWin') {
            // Player won the entire match!
            io.to(room.id).emit('matchWon', {
                winner: socket.id,
                winnerName: room.players.get(socket.id).name,
                finalScore: room.players.get(socket.id).roundWins,
                gameState: room.getGameState()
            });
        } else if (result === 'roundWin') {
            // Player won this round
            io.to(room.id).emit('roundWon', {
                winner: socket.id,
                winnerName: room.players.get(socket.id).name,
                roundNumber: room.currentRound,
                score: room.players.get(socket.id).roundWins,
                gameState: room.getGameState()
            });
            
            // Auto-start next round after 3 seconds
            setTimeout(() => {
                if (room.startNextRound()) {
                    io.to(room.id).emit('nextRoundStarting', {
                        roundNumber: room.currentRound,
                        countdown: 3,
                        gameState: room.getGameState()
                    });
                    
                    setTimeout(() => {
                        room.gameState = 'playing';
                        io.to(room.id).emit('gameStateUpdate', room.getGameState());
                    }, 3000);
                }
            }, 3000);
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
