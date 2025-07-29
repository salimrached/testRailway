
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

let games = {};

io.on('connection', (socket) => {
    let currentGame = null;
    let playerSymbol = null;

    socket.on('createGame', () => {
        const gameId = Math.random().toString(36).substr(2, 6);
        games[gameId] = {
            board: Array(9).fill(null),
            players: [socket.id],
            turn: 'X',
            winner: null
        };
        currentGame = gameId;
        playerSymbol = 'X';
        socket.join(gameId);
        socket.emit('gameCreated', { gameId, symbol: 'X' });
    });

    socket.on('joinGame', (gameId) => {
        const game = games[gameId];
        if (game && game.players.length === 1) {
            game.players.push(socket.id);
            currentGame = gameId;
            playerSymbol = 'O';
            socket.join(gameId);
            io.to(gameId).emit('gameStart', { symbol: 'O' });
        } else {
            socket.emit('error', 'Game not found or already full');
        }
    });

    socket.on('makeMove', (index) => {
        const game = games[currentGame];
        if (!game || game.winner || game.board[index]) return;
        if ((game.turn === 'X' && playerSymbol !== 'X') || (game.turn === 'O' && playerSymbol !== 'O')) return;
        game.board[index] = playerSymbol;
        game.turn = playerSymbol === 'X' ? 'O' : 'X';
        game.winner = checkWinner(game.board);
        io.to(currentGame).emit('updateBoard', { board: game.board, turn: game.turn, winner: game.winner });
    });

    socket.on('disconnect', () => {
        if (currentGame && games[currentGame]) {
            io.to(currentGame).emit('error', 'A player disconnected. Game ended.');
            delete games[currentGame];
        }
    });
});

function checkWinner(board) {
    const lines = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];
    for (let line of lines) {
        const [a,b,c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    if (board.every(cell => cell)) return 'Draw';
    return null;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`TicTacToe server running on port ${PORT}`);
});