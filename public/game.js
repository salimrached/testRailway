/**
 * Squareg Multiplayer - Client-Side Game Logic
 * Handles Socket.io communication and game rendering
 */

class SquaregMultiplayer {
    constructor() {
        this.socket = null;
        this.gameState = null;
        this.playerId = null;
        this.roomId = null;
        this.currentSize = 3;
        this.moveCount = 0;
        this.gameTimer = null;
        this.gameStartTime = null;
        
        this.initializeUI();
        this.connectToServer();
    }
    
    initializeUI() {
        // Lobby elements
        this.lobbyScreen = document.getElementById('lobbyScreen');
        this.gameScreen = document.getElementById('gameScreen');
        this.winScreen = document.getElementById('winScreen');
        this.countdownOverlay = document.getElementById('countdownOverlay');
        
        this.playerNameInput = document.getElementById('playerNameInput');
        this.joinGameBtn = document.getElementById('joinGameBtn');
        this.leaveGameBtn = document.getElementById('leaveGameBtn');
        this.playAgainBtn = document.getElementById('playAgainBtn');
        
        // Game elements
        this.gameBoard = document.getElementById('gameBoard');
        this.targetBoard = document.getElementById('targetBoard');
        this.topButtons = document.getElementById('topButtons');
        this.bottomButtons = document.getElementById('bottomButtons');
        this.leftButtons = document.getElementById('leftButtons');
        this.rightButtons = document.getElementById('rightButtons');
        
        // Info elements
        this.connectionStatus = document.getElementById('connectionStatus');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        this.roomIdDisplay = document.getElementById('roomId');
        this.gameStatusDisplay = document.getElementById('gameStatus');
        this.gameTimerDisplay = document.getElementById('gameTimer');
        this.playersList = document.getElementById('playersList');
        this.playerCount = document.getElementById('playerCount');
        this.moveCountDisplay = document.getElementById('moveCount');
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Lobby events
        this.joinGameBtn.addEventListener('click', () => this.joinGame());
        this.leaveGameBtn.addEventListener('click', () => this.leaveGame());
        this.playAgainBtn.addEventListener('click', () => this.playAgain());
        
        // Enter key to join
        this.playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.joinGame();
            }
        });
        
        // Grid size selection
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentSize = parseInt(e.target.dataset.size);
            });
        });
        
        // Game board interactions (event delegation)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('rotation-btn') && this.gameState?.gameState === 'playing') {
                this.handleMove(e.target);
            }
        });
    }
    
    connectToServer() {
        this.updateConnectionStatus('connecting', 'Connecting...');
        
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.updateConnectionStatus('connected', 'Connected');
        });
        
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateConnectionStatus('disconnected', 'Disconnected');
        });
        
        // Game events
        this.socket.on('gameJoined', (data) => {
            console.log('Game joined:', data);
            this.playerId = data.playerId;
            this.roomId = data.roomId;
            this.gameState = data.gameState;
            this.showGameScreen();
            this.updateGameDisplay();
        });
        
        this.socket.on('gameStateUpdate', (gameState) => {
            console.log('Game state updated:', gameState);
            this.gameState = gameState;
            this.updateGameDisplay();
        });
        
        this.socket.on('gameStarting', (data) => {
            console.log('Game starting:', data);
            this.gameState = data.gameState;
            this.showCountdown(data.countdown);
        });
        
        this.socket.on('gameWon', (data) => {
            console.log('Game won:', data);
            this.gameState = data.gameState;
            this.showWinScreen(data);
        });
        
        this.socket.on('playerLeft', (data) => {
            console.log('Player left:', data);
            this.gameState = data.gameState;
            this.updateGameDisplay();
        });
        
        this.socket.on('joinError', (data) => {
            alert(`Failed to join game: ${data.message}`);
        });
        
        this.socket.on('error', (data) => {
            console.error('Game error:', data);
            alert(`Error: ${data.message}`);
        });
        
        this.socket.on('invalidMove', (data) => {
            console.warn('Invalid move:', data);
        });
    }
    
    updateConnectionStatus(status, text) {
        this.statusIndicator.className = `status-indicator ${status}`;
        this.statusText.textContent = text;
    }
    
    joinGame() {
        const playerName = this.playerNameInput.value.trim() || `Player_${Math.floor(Math.random() * 1000)}`;
        
        this.socket.emit('joinGame', {
            playerName: playerName,
            gridSize: this.currentSize
        });
    }
    
    leaveGame() {
        this.socket.disconnect();
        this.socket.connect();
        this.showLobbyScreen();
        this.resetGame();
    }
    
    playAgain() {
        this.hideWinScreen();
        this.leaveGame();
    }
    
    handleMove(button) {
        let moveType, index;
        
        if (button.classList.contains('top-btn')) {
            moveType = 'columnDown';
            index = parseInt(button.dataset.col);
        } else if (button.classList.contains('bottom-btn')) {
            moveType = 'columnUp';
            index = parseInt(button.dataset.col);
        } else if (button.classList.contains('left-btn')) {
            moveType = 'rowRight';
            index = parseInt(button.dataset.row);
        } else if (button.classList.contains('right-btn')) {
            moveType = 'rowLeft';
            index = parseInt(button.dataset.row);
        } else {
            return;
        }
        
        // Animate button
        this.animateButton(button);
        
        // Send move to server
        this.socket.emit('makeMove', { moveType, index });
        
        // Update local move count
        this.moveCount++;
        this.updateMoveCount();
    }
    
    animateButton(button) {
        button.classList.add('clicked');
        setTimeout(() => button.classList.remove('clicked'), 300);
    }
    
    showLobbyScreen() {
        this.lobbyScreen.style.display = 'block';
        this.gameScreen.style.display = 'none';
        this.hideWinScreen();
        this.hideCountdown();
    }
    
    showGameScreen() {
        this.lobbyScreen.style.display = 'none';
        this.gameScreen.style.display = 'grid';
        this.hideWinScreen();
    }
    
    showWinScreen(winData) {
        this.winScreen.style.display = 'flex';
        
        const winTitle = document.getElementById('winTitle');
        const winnerInfo = document.getElementById('winnerInfo');
        const finalStats = document.getElementById('finalStats');
        
        if (winData.winner === this.playerId) {
            winTitle.textContent = '🎉 You Won! 🎉';
            winTitle.style.color = '#f39c12';
        } else {
            winTitle.textContent = 'Game Over';
            winTitle.style.color = '#e74c3c';
        }
        
        winnerInfo.innerHTML = `
            <h3>Winner: ${winData.winnerName}</h3>
            <p>Congratulations!</p>
        `;
        
        const winner = this.gameState.players.find(p => p.id === winData.winner);
        finalStats.innerHTML = `
            <h4>Final Stats:</h4>
            <p>Winner's Moves: ${winner?.moves || 'N/A'}</p>
            <p>Your Moves: ${this.moveCount}</p>
            <p>Players: ${this.gameState.players.length}</p>
        `;
    }
    
    hideWinScreen() {
        this.winScreen.style.display = 'none';
    }
    
    showCountdown(seconds) {
        this.countdownOverlay.style.display = 'flex';
        const countdownNumber = document.getElementById('countdownNumber');
        
        let remaining = seconds;
        countdownNumber.textContent = remaining;
        
        const countdownInterval = setInterval(() => {
            remaining--;
            if (remaining > 0) {
                countdownNumber.textContent = remaining;
                countdownNumber.style.animation = 'none';
                setTimeout(() => {
                    countdownNumber.style.animation = 'countdownPulse 1s ease-in-out';
                }, 10);
            } else {
                countdownNumber.textContent = 'GO!';
                setTimeout(() => {
                    this.hideCountdown();
                    this.startGameTimer();
                }, 1000);
                clearInterval(countdownInterval);
            }
        }, 1000);
    }
    
    hideCountdown() {
        this.countdownOverlay.style.display = 'none';
    }
    
    startGameTimer() {
        this.gameStartTime = Date.now();
        this.gameTimer = setInterval(() => {
            this.updateGameTimer();
        }, 1000);
    }
    
    stopGameTimer() {
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
    }
    
    updateGameTimer() {
        if (!this.gameStartTime) return;
        
        const elapsed = Math.floor((Date.now() - this.gameStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        this.gameTimerDisplay.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateGameDisplay() {
        if (!this.gameState) return;
        
        // Update room info
        this.roomIdDisplay.textContent = this.gameState.id.split('_')[1] || 'Unknown';
        this.gameStatusDisplay.textContent = this.gameState.gameState;
        
        // Update players list
        this.updatePlayersList();
        
        // Update boards
        this.renderTargetBoard();
        this.renderGameBoard();
        this.updateButtons();
        
        // Enable/disable controls based on game state
        this.updateControlsState();
        
        // Stop timer if game finished
        if (this.gameState.gameState === 'finished') {
            this.stopGameTimer();
        }
    }
    
    updatePlayersList() {
        if (!this.gameState) return;
        
        this.playerCount.textContent = this.gameState.players.length;
        this.playersList.innerHTML = '';
        
        this.gameState.players.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.className = 'player-card';
            
            if (player.id === this.playerId) {
                playerCard.classList.add('current-player');
            }
            
            if (player.id === this.gameState.winner) {
                playerCard.classList.add('winner');
            }
            
            playerCard.innerHTML = `
                <div class="player-name">${player.name}</div>
                <div class="player-moves">${player.moves} moves</div>
            `;
            
            this.playersList.appendChild(playerCard);
        });
    }
    
    renderTargetBoard() {
        if (!this.gameState) return;
        
        this.targetBoard.innerHTML = '';
        this.targetBoard.className = `target-board size-${this.gameState.size}`;
        
        for (let row = 0; row < this.gameState.size; row++) {
            for (let col = 0; col < this.gameState.size; col++) {
                const tile = this.gameState.targetBoard[row][col];
                const tileElement = document.createElement('div');
                tileElement.className = `target-tile color-${tile.colorIndex}`;
                tileElement.textContent = tile.value;
                this.targetBoard.appendChild(tileElement);
            }
        }
    }
    
    renderGameBoard() {
        if (!this.gameState) return;
        
        const currentPlayer = this.gameState.players.find(p => p.id === this.playerId);
        if (!currentPlayer) return;
        
        this.gameBoard.innerHTML = '';
        this.gameBoard.className = `game-board size-${this.gameState.size}`;
        
        for (let row = 0; row < this.gameState.size; row++) {
            for (let col = 0; col < this.gameState.size; col++) {
                const tile = currentPlayer.board[row][col];
                const tileElement = document.createElement('div');
                tileElement.className = `tile color-${tile.colorIndex}`;
                tileElement.textContent = tile.value;
                tileElement.dataset.row = row;
                tileElement.dataset.col = col;
                this.gameBoard.appendChild(tileElement);
            }
        }
        
        // Update move count
        this.moveCount = currentPlayer.moves;
        this.updateMoveCount();
    }
    
    updateButtons() {
        if (!this.gameState) return;
        
        const size = this.gameState.size;
        
        // Update top buttons
        this.topButtons.innerHTML = '';
        for (let i = 0; i < size; i++) {
            const btn = document.createElement('button');
            btn.className = 'rotation-btn top-btn';
            btn.dataset.col = i;
            btn.textContent = '↓';
            this.topButtons.appendChild(btn);
        }
        
        // Update bottom buttons
        this.bottomButtons.innerHTML = '';
        for (let i = 0; i < size; i++) {
            const btn = document.createElement('button');
            btn.className = 'rotation-btn bottom-btn';
            btn.dataset.col = i;
            btn.textContent = '↑';
            this.bottomButtons.appendChild(btn);
        }
        
        // Update left buttons
        this.leftButtons.innerHTML = '';
        for (let i = 0; i < size; i++) {
            const btn = document.createElement('button');
            btn.className = 'rotation-btn left-btn';
            btn.dataset.row = i;
            btn.textContent = '→';
            this.leftButtons.appendChild(btn);
        }
        
        // Update right buttons
        this.rightButtons.innerHTML = '';
        for (let i = 0; i < size; i++) {
            const btn = document.createElement('button');
            btn.className = 'rotation-btn right-btn';
            btn.dataset.row = i;
            btn.textContent = '←';
            this.rightButtons.appendChild(btn);
        }
    }
    
    updateControlsState() {
        const isPlaying = this.gameState?.gameState === 'playing';
        
        // Enable/disable rotation buttons
        document.querySelectorAll('.rotation-btn').forEach(btn => {
            btn.disabled = !isPlaying;
        });
    }
    
    updateMoveCount() {
        this.moveCountDisplay.textContent = this.moveCount;
    }
    
    resetGame() {
        this.gameState = null;
        this.playerId = null;
        this.roomId = null;
        this.moveCount = 0;
        this.stopGameTimer();
        this.gameStartTime = null;
        this.updateMoveCount();
    }
}

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new SquaregMultiplayer();
    
    // Make game globally available for debugging
    window.squaregGame = game;
    
    console.log('🎮 Squareg Multiplayer initialized!');
    console.log('Ready to connect to other players!');
});
