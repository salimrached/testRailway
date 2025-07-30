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
        this.roundWinScreen = document.getElementById('roundWinScreen');
        this.matchWinScreen = document.getElementById('matchWinScreen');
        this.countdownOverlay = document.getElementById('countdownOverlay');
        
        this.playerNameInput = document.getElementById('playerNameInput');
        this.createGameBtn = document.getElementById('createGameBtn');
        this.showJoinFormBtn = document.getElementById('showJoinFormBtn');
        this.joinGameForm = document.getElementById('joinGameForm');
        this.roomCodeInput = document.getElementById('roomCodeInput');
        this.joinGameBtn = document.getElementById('joinGameBtn');
        this.startGameBtn = document.getElementById('startGameBtn');
        this.backToMenuBtn = document.getElementById('backToMenuBtn');
        this.leaveGameBtn = document.getElementById('leaveGameBtn');
        this.playNewMatchBtn = document.getElementById('playNewMatchBtn');
        
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
        this.roomCodeDisplay = document.getElementById('roomCode');
        this.copyRoomCodeBtn = document.getElementById('copyRoomCodeBtn');
        this.gameStatusDisplay = document.getElementById('gameStatus');
        this.roundInfoDisplay = document.getElementById('roundInfo');
        this.gameTimerDisplay = document.getElementById('gameTimer');
        this.playersList = document.getElementById('playersList');
        this.playerCount = document.getElementById('playerCount');
        this.waitingMessage = document.getElementById('waitingMessage');
        this.moveCountDisplay = document.getElementById('moveCount');
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Lobby events
        this.createGameBtn.addEventListener('click', () => this.createGame());
        this.showJoinFormBtn.addEventListener('click', () => this.showJoinForm());
        this.joinGameBtn.addEventListener('click', () => this.joinGameWithCode());
        this.startGameBtn.addEventListener('click', () => this.startGame());
        this.backToMenuBtn.addEventListener('click', () => this.showMainMenu());
        this.leaveGameBtn.addEventListener('click', () => this.leaveGame());
        this.playNewMatchBtn.addEventListener('click', () => this.playNewMatch());
        this.copyRoomCodeBtn.addEventListener('click', () => this.copyRoomCode());
        
        // Enter key handlers
        this.playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (this.joinGameForm.style.display === 'none') {
                    this.createGame();
                } else {
                    this.joinGameWithCode();
                }
            }
        });
        
        this.roomCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.joinGameWithCode();
            }
        });
        
        // Format room code input
        this.roomCodeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
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
        this.socket.on('gameCreated', (data) => {
            console.log('Game created:', data);
            this.playerId = data.playerId;
            this.roomId = data.roomId;
            this.gameState = data.gameState;
            this.showGameScreen();
            this.updateGameDisplay();
            this.showRoomCode(data.roomCode);
        });
        
        this.socket.on('gameJoined', (data) => {
            console.log('Game joined:', data);
            this.playerId = data.playerId;
            this.roomId = data.roomId;
            this.gameState = data.gameState;
            this.showGameScreen();
            this.updateGameDisplay();
            if (data.roomCode) {
                this.showRoomCode(data.roomCode);
            }
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
        
        this.socket.on('roundWon', (data) => {
            console.log('Round won:', data);
            this.gameState = data.gameState;
            this.showRoundWinScreen(data);
        });
        
        this.socket.on('matchWon', (data) => {
            console.log('Match won:', data);
            this.gameState = data.gameState;
            this.showMatchWinScreen(data);
        });
        
        this.socket.on('nextRoundStarting', (data) => {
            console.log('Next round starting:', data);
            this.gameState = data.gameState;
            this.hideRoundWinScreen();
            this.showCountdown(data.countdown, `Round ${data.roundNumber} Starting...`);
            this.updateGameDisplay();
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
    
    createGame() {
        const playerName = this.playerNameInput.value.trim() || `Player_${Math.floor(Math.random() * 1000)}`;
        
        this.socket.emit('createGame', {
            playerName: playerName,
            gridSize: this.currentSize
        });
    }
    
    showJoinForm() {
        this.joinGameForm.style.display = 'block';
        this.roomCodeInput.focus();
    }
    
    showMainMenu() {
        this.joinGameForm.style.display = 'none';
        this.roomCodeInput.value = '';
    }
    
    joinGameWithCode() {
        const playerName = this.playerNameInput.value.trim() || `Player_${Math.floor(Math.random() * 1000)}`;
        const roomCode = this.roomCodeInput.value.trim().toUpperCase();
        
        if (!roomCode) {
            alert('Please enter a room code');
            return;
        }
        
        this.socket.emit('joinGame', {
            playerName: playerName,
            roomCode: roomCode
        });
    }
    
    copyRoomCode() {
        const roomCode = this.roomCodeDisplay.textContent;
        navigator.clipboard.writeText(roomCode).then(() => {
            const btn = this.copyRoomCodeBtn;
            const originalText = btn.textContent;
            btn.textContent = '✓ Copied!';
            btn.classList.add('copied');
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.classList.remove('copied');
            }, 2000);
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = roomCode;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            const btn = this.copyRoomCodeBtn;
            const originalText = btn.textContent;
            btn.textContent = '✓ Copied!';
            btn.classList.add('copied');
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.classList.remove('copied');
            }, 2000);
        });
    }
    
    leaveGame() {
        this.socket.disconnect();
        this.socket.connect();
        this.showLobbyScreen();
        this.resetGame();
    }
    
    playNewMatch() {
        this.hideMatchWinScreen();
        this.leaveGame();
    }
    
    startGame() {
        this.socket.emit('startGame', {});
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
        this.hideRoundWinScreen();
        this.hideMatchWinScreen();
        this.hideCountdown();
    }
    
    showGameScreen() {
        this.lobbyScreen.style.display = 'none';
        this.gameScreen.style.display = 'grid';
        this.hideRoundWinScreen();
        this.hideMatchWinScreen();
    }
    
    showRoomCode(roomCode) {
        this.roomCodeDisplay.textContent = roomCode;
        this.copyRoomCodeBtn.style.display = 'inline-block';
    }
    
    showRoundWinScreen(winData) {
        this.roundWinScreen.style.display = 'flex';
        
        const roundWinTitle = document.getElementById('roundWinTitle');
        const roundWinnerInfo = document.getElementById('roundWinnerInfo');
        const roundProgress = document.getElementById('roundProgress');
        
        if (winData.winner === this.playerId) {
            roundWinTitle.textContent = '🎉 You Won This Round! 🎉';
            roundWinTitle.style.color = '#f39c12';
        } else {
            roundWinTitle.textContent = 'Round Complete';
            roundWinTitle.style.color = '#e74c3c';
        }
        
        roundWinnerInfo.innerHTML = `
            <h3>${winData.winnerName} wins Round ${winData.roundNumber}!</h3>
            <p>Current Score: ${winData.score} rounds won</p>
        `;
        
        const requiredWins = Math.ceil(this.gameState.maxRounds / 2);
        roundProgress.innerHTML = `
            <h4>Match Progress (First to ${requiredWins} wins):</h4>
            ${this.getScoreboardHTML()}
        `;
        
        this.startNextRoundCountdown();
    }
    
    showMatchWinScreen(winData) {
        this.matchWinScreen.style.display = 'flex';
        
        const matchWinTitle = document.getElementById('matchWinTitle');
        const matchWinnerInfo = document.getElementById('matchWinnerInfo');
        const finalMatchStats = document.getElementById('finalMatchStats');
        
        if (winData.winner === this.playerId) {
            matchWinTitle.textContent = '🏆 YOU WON THE MATCH! 🏆';
            matchWinTitle.style.color = '#f39c12';
        } else {
            matchWinTitle.textContent = '🏆 MATCH COMPLETE 🏆';
            matchWinTitle.style.color = '#e74c3c';
        }
        
        matchWinnerInfo.innerHTML = `
            <h3>🎉 ${winData.winnerName} is the Champion! 🎉</h3>
            <p>Final Score: ${winData.finalScore} rounds won</p>
        `;
        
        finalMatchStats.innerHTML = `
            <h4>Final Scoreboard:</h4>
            ${this.getScoreboardHTML()}
            <p><strong>Match completed!</strong></p>
        `;
        
        this.stopGameTimer();
    }
    
    hideRoundWinScreen() {
        this.roundWinScreen.style.display = 'none';
    }
    
    hideMatchWinScreen() {
        this.matchWinScreen.style.display = 'none';
    }
    
    getScoreboardHTML() {
        if (!this.gameState || !this.gameState.players) return '';
        
        const sortedPlayers = [...this.gameState.players].sort((a, b) => b.roundWins - a.roundWins);
        
        return sortedPlayers.map(player => `
            <div class="score-line ${player.id === this.playerId ? 'current-player' : ''}">
                <span>${player.name}</span>
                <span class="score">${player.roundWins} wins</span>
            </div>
        `).join('');
    }
    
    startNextRoundCountdown() {
        const countdownElement = document.getElementById('nextRoundTimer');
        let remaining = 3;
        
        const countdownInterval = setInterval(() => {
            remaining--;
            if (remaining > 0) {
                countdownElement.textContent = remaining;
            } else {
                countdownElement.textContent = '0';
                clearInterval(countdownInterval);
            }
        }, 1000);
    }
    
    showCountdown(seconds, title = 'Game Starting In...') {
        this.countdownOverlay.style.display = 'flex';
        const countdownTitle = document.querySelector('.countdown-content h2');
        const countdownNumber = document.getElementById('countdownNumber');
        
        countdownTitle.textContent = title;
        
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
                    if (title.includes('Game Starting')) {
                        this.startGameTimer();
                    }
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
        this.gameStatusDisplay.textContent = this.gameState.gameState;
        this.roundInfoDisplay.textContent = `${this.gameState.currentRound}/${this.gameState.maxRounds}`;
        
        // Update players list
        this.updatePlayersList();
        
        // Update boards
        this.renderTargetBoard();
        this.renderGameBoard();
        this.updateButtons();
        
        // Enable/disable controls based on game state
        this.updateControlsState();
        
        // Stop timer if game finished
        if (this.gameState.gameState === 'matchFinished') {
            this.stopGameTimer();
        }
    }
    
    updatePlayersList() {
        if (!this.gameState) return;
        
        this.playerCount.textContent = this.gameState.players.length;
        
        // Show/hide waiting message
        if (this.gameState.gameState === 'waiting' && this.gameState.players.length < 2) {
            this.waitingMessage.style.display = 'block';
            this.playersList.style.display = 'none';
        } else {
            this.waitingMessage.style.display = 'none';
            this.playersList.style.display = 'block';
        }
        
        this.playersList.innerHTML = '';
        
        // Sort players by round wins (descending)
        const sortedPlayers = [...this.gameState.players].sort((a, b) => b.roundWins - a.roundWins);
        
        sortedPlayers.forEach((player, index) => {
            const playerCard = document.createElement('div');
            playerCard.className = 'player-card';
            
            if (player.id === this.playerId) {
                playerCard.classList.add('current-player');
            }
            
            if (player.id === this.gameState.winner) {
                playerCard.classList.add('winner');
            }
            
            if (player.id === this.gameState.matchWinner) {
                playerCard.classList.add('match-winner');
            }
            
            // Add ranking emoji
            let rankEmoji = '';
            if (index === 0 && player.roundWins > 0) rankEmoji = '🥇';
            else if (index === 1 && player.roundWins > 0) rankEmoji = '🥈';
            else if (index === 2 && player.roundWins > 0) rankEmoji = '🥉';
            
            playerCard.innerHTML = `
                <div class="player-name">${rankEmoji} ${player.name}</div>
                <div class="player-stats">
                    <div class="player-score">${player.roundWins} wins</div>
                    <div class="player-moves">${player.moves} moves</div>
                </div>
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
        const isWaiting = this.gameState?.gameState === 'waiting';
        const hasEnoughPlayers = this.gameState?.players?.length >= 2;
        
        // Enable/disable rotation buttons
        document.querySelectorAll('.rotation-btn').forEach(btn => {
            btn.disabled = !isPlaying;
        });
        
        // Show/hide start game button
        if (this.startGameBtn) {
            if (isWaiting && hasEnoughPlayers) {
                this.startGameBtn.style.display = 'inline-block';
            } else {
                this.startGameBtn.style.display = 'none';
            }
        }
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
