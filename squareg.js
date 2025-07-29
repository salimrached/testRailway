/**
 * Squareg Base - JavaScript Implementation
 * Simple web-based version of the core Squareg board mechanics
 */

class SquaregBoard {
    constructor(size = 3) {
        this.size = size;
        this.board = [];
        this.gameBoard = document.getElementById('gameBoard');
        
        this.initializeBoard();
        this.setupEventListeners();
        this.renderBoard();
    }
    
    /**
     * Initialize the board with tiles
     */
    initializeBoard() {
        this.board = [];
        for (let row = 0; row < this.size; row++) {
            this.board[row] = [];
            for (let col = 0; col < this.size; col++) {
                // Create tiles with colors based on row (similar to C++ version)
                this.board[row][col] = {
                    id: row * this.size + col,
                    colorIndex: row,
                    value: row * this.size + col
                };
            }
        }
    }
    
    /**
     * Render the board to DOM
     */
    renderBoard() {
        this.gameBoard.innerHTML = '';
        this.gameBoard.className = `game-board size-${this.size}`;
        
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const tile = this.board[row][col];
                const tileElement = document.createElement('div');
                tileElement.className = `tile color-${tile.colorIndex}`;
                tileElement.textContent = tile.value;
                tileElement.dataset.row = row;
                tileElement.dataset.col = col;
                this.gameBoard.appendChild(tileElement);
            }
        }
        
        this.updateButtons();
    }
    
    /**
     * Update button layout based on grid size
     */
    updateButtons() {
        // Update top buttons
        const topButtons = document.querySelector('.top-buttons');
        topButtons.innerHTML = '';
        for (let i = 0; i < this.size; i++) {
            const btn = document.createElement('button');
            btn.className = 'rotation-btn top-btn';
            btn.dataset.col = i;
            btn.textContent = '↓';
            topButtons.appendChild(btn);
        }
        
        // Update bottom buttons
        const bottomButtons = document.querySelector('.bottom-buttons');
        bottomButtons.innerHTML = '';
        for (let i = 0; i < this.size; i++) {
            const btn = document.createElement('button');
            btn.className = 'rotation-btn bottom-btn';
            btn.dataset.col = i;
            btn.textContent = '↑';
            bottomButtons.appendChild(btn);
        }
        
        // Update left buttons
        const leftButtons = document.querySelector('.left-buttons');
        leftButtons.innerHTML = '';
        for (let i = 0; i < this.size; i++) {
            const btn = document.createElement('button');
            btn.className = 'rotation-btn left-btn';
            btn.dataset.row = i;
            btn.textContent = '→';
            leftButtons.appendChild(btn);
        }
        
        // Update right buttons
        const rightButtons = document.querySelector('.right-buttons');
        rightButtons.innerHTML = '';
        for (let i = 0; i < this.size; i++) {
            const btn = document.createElement('button');
            btn.className = 'rotation-btn right-btn';
            btn.dataset.row = i;
            btn.textContent = '←';
            rightButtons.appendChild(btn);
        }
    }
    
    /**
     * Rotate a column down (like the top button in C++ version)
     */
    rotateColumnDown(colIndex) {
        if (colIndex < 0 || colIndex >= this.size) return;
        
        // Store the bottom tile
        const temp = this.board[this.size - 1][colIndex];
        
        // Move tiles down
        for (let row = this.size - 1; row > 0; row--) {
            this.board[row][colIndex] = this.board[row - 1][colIndex];
        }
        
        // Place the bottom tile at the top
        this.board[0][colIndex] = temp;
        
        this.animateColumn(colIndex);
        this.renderBoard();
    }
    
    /**
     * Rotate a column up (like the bottom button in C++ version)
     */
    rotateColumnUp(colIndex) {
        if (colIndex < 0 || colIndex >= this.size) return;
        
        // Store the top tile
        const temp = this.board[0][colIndex];
        
        // Move tiles up
        for (let row = 0; row < this.size - 1; row++) {
            this.board[row][colIndex] = this.board[row + 1][colIndex];
        }
        
        // Place the top tile at the bottom
        this.board[this.size - 1][colIndex] = temp;
        
        this.animateColumn(colIndex);
        this.renderBoard();
    }
    
    /**
     * Rotate a row right (like the left button in C++ version)
     */
    rotateRowRight(rowIndex) {
        if (rowIndex < 0 || rowIndex >= this.size) return;
        
        // Store the rightmost tile
        const temp = this.board[rowIndex][this.size - 1];
        
        // Move tiles right
        for (let col = this.size - 1; col > 0; col--) {
            this.board[rowIndex][col] = this.board[rowIndex][col - 1];
        }
        
        // Place the rightmost tile at the left
        this.board[rowIndex][0] = temp;
        
        this.animateRow(rowIndex);
        this.renderBoard();
    }
    
    /**
     * Rotate a row left (like the right button in C++ version)
     */
    rotateRowLeft(rowIndex) {
        if (rowIndex < 0 || rowIndex >= this.size) return;
        
        // Store the leftmost tile
        const temp = this.board[rowIndex][0];
        
        // Move tiles left
        for (let col = 0; col < this.size - 1; col++) {
            this.board[rowIndex][col] = this.board[rowIndex][col + 1];
        }
        
        // Place the leftmost tile at the right
        this.board[rowIndex][this.size - 1] = temp;
        
        this.animateRow(rowIndex);
        this.renderBoard();
    }
    
    /**
     * Animate column rotation
     */
    animateColumn(colIndex) {
        const tiles = this.gameBoard.querySelectorAll(`[data-col="${colIndex}"]`);
        tiles.forEach(tile => {
            tile.classList.add('rotating');
            setTimeout(() => tile.classList.remove('rotating'), 300);
        });
    }
    
    /**
     * Animate row rotation
     */
    animateRow(rowIndex) {
        const tiles = this.gameBoard.querySelectorAll(`[data-row="${rowIndex}"]`);
        tiles.forEach(tile => {
            tile.classList.add('rotating');
            setTimeout(() => tile.classList.remove('rotating'), 300);
        });
    }
    
    /**
     * Animate button click
     */
    animateButton(button) {
        button.classList.add('clicked');
        setTimeout(() => button.classList.remove('clicked'), 300);
    }
    
    /**
     * Shuffle the board randomly
     */
    shuffle() {
        const moves = 20; // Number of random moves
        for (let i = 0; i < moves; i++) {
            const moveType = Math.floor(Math.random() * 4);
            const index = Math.floor(Math.random() * this.size);
            
            switch (moveType) {
                case 0:
                    this.rotateColumnDown(index);
                    break;
                case 1:
                    this.rotateColumnUp(index);
                    break;
                case 2:
                    this.rotateRowRight(index);
                    break;
                case 3:
                    this.rotateRowLeft(index);
                    break;
            }
        }
        // Final render after all moves
        setTimeout(() => this.renderBoard(), 100);
    }
    
    /**
     * Reset board to initial state
     */
    reset() {
        this.initializeBoard();
        this.renderBoard();
    }
    
    /**
     * Change board size
     */
    changeSize(newSize) {
        this.size = newSize;
        this.initializeBoard();
        this.renderBoard();
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Use event delegation for dynamically created buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('rotation-btn')) {
                this.animateButton(e.target);
                
                if (e.target.classList.contains('top-btn')) {
                    // Top button rotates column down
                    const col = parseInt(e.target.dataset.col);
                    this.rotateColumnDown(col);
                } else if (e.target.classList.contains('bottom-btn')) {
                    // Bottom button rotates column up
                    const col = parseInt(e.target.dataset.col);
                    this.rotateColumnUp(col);
                } else if (e.target.classList.contains('left-btn')) {
                    // Left button rotates row right
                    const row = parseInt(e.target.dataset.row);
                    this.rotateRowRight(row);
                } else if (e.target.classList.contains('right-btn')) {
                    // Right button rotates row left
                    const row = parseInt(e.target.dataset.row);
                    this.rotateRowLeft(row);
                }
            }
        });
        
        // Control buttons
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.reset();
        });
        
        document.getElementById('shuffleBtn').addEventListener('click', () => {
            this.shuffle();
        });
        
        // Size buttons
        document.getElementById('size3').addEventListener('click', (e) => {
            this.setActiveSize(e.target);
            this.changeSize(3);
        });
        
        document.getElementById('size4').addEventListener('click', (e) => {
            this.setActiveSize(e.target);
            this.changeSize(4);
        });
        
        document.getElementById('size5').addEventListener('click', (e) => {
            this.setActiveSize(e.target);
            this.changeSize(5);
        });
    }
    
    /**
     * Set active size button
     */
    setActiveSize(activeButton) {
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        activeButton.classList.add('active');
    }
}

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new SquaregBoard(3);
    
    // Make game globally available for debugging
    window.squaregGame = game;
    
    console.log('Squareg Base initialized!');
    console.log('Try the rotation buttons or use squaregGame object in console for debugging');
});
