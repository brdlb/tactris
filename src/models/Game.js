const FIGURES = {
    I: [[0, 0], [1, 0], [2, 0], [3, 0]],
    O: [[0, 0], [1, 0], [0, 1], [1, 1]],
    T: [[0, 0], [1, 0], [2, 0], [1, 1]],
    S: [[1, 0], [2, 0], [0, 1], [1, 1]],
    Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
    J: [[1, 0], [1, 1], [1, 2], [0, 2]],
    L: [[0, 0], [0, 1], [0, 2], [1, 2]]
};

const FIGURE_ROTATIONS = {
    I: 2, O: 1, T: 4, S: 2, Z: 2, J: 4, L: 4
};

// Rotate figure 90 degrees clockwise once
function rotateFigure(cells) {
    // (x, y) → (y, -x) then normalize
    const rotated = cells.map(([x, y]) => [y, -x]);
    return normalizeFigure(rotated);
}

// Shift cells to upper-left corner (min x=0, min y=0)
function normalizeFigure(cells) {
    const minX = Math.min(...cells.map(c => c[0]));
    const minY = Math.min(...cells.map(c => c[1]));
    return cells.map(([x, y]) => [x - minX, y - minY]);
}

// Generate new figure excluding certain types
function generateNewFigure(excludeTypes = []) {
    // 1. Filter available types (not in excludeTypes)
    const availableTypes = Object.keys(FIGURE_ROTATIONS).filter(type => !excludeTypes.includes(type));
    if (availableTypes.length === 0) {
        // If all types are excluded, fallback to any random type
        availableTypes.push(...Object.keys(FIGURE_ROTATIONS));
    }
    
    // 2. Pick random type
    const randomType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    
    // 3. Get rotation count for that type
    const rotationCount = FIGURE_ROTATIONS[randomType];
    
    // 4. Pick random rotation (0 to count-1)
    const randomRotation = Math.floor(Math.random() * rotationCount);
    
    // 5. Apply rotations
    let cells = FIGURES[randomType].map(cell => [...cell]);
    for (let i = 0; i < randomRotation; i++) {
        cells = rotateFigure(cells);
    }
    
    // 6. Normalize to upper-left
    cells = normalizeFigure(cells);
    
    // 7. Return {type, cells}
    return { type: randomType, cells };
}

class Game {
    constructor(id) {
        this.id = id;
        this.gridWidth = 10;
        this.gridHeight = 10;
        this.grid = Array(this.gridHeight).fill(null).map(() => Array(this.gridWidth).fill(null)); // 10x10 grid
        this.initialGrid = Array(this.gridHeight).fill(null).map(() => Array(this.gridWidth).fill(null)); // Initial empty grid
        this.players = new Map();
        this.gameOver = false;
        this.startTime = Date.now(); // Track game start time for duration
        this.linesCleared = 0; // Track total lines cleared
        this.figuresPlaced = 0; // Track total figures placed
        this.moves = []; // Track game moves for session data
    }

    addPlayer(playerId, color = 'red') {
        if (!this.players.has(playerId)) {
            const playerFigures = [
                generateNewFigure(),
                generateNewFigure()
            ];
            this.players.set(playerId, {
                id: playerId,
                figures: playerFigures,
                score: 0,
                color: color
            });
        }
    }

    getState() {
        return {
            id: this.id,
            grid: this.grid,
            players: Object.fromEntries(this.players),
            gameOver: this.gameOver
        };
    }

    removePlayer(playerId) {
        if (this.players.has(playerId)) {
            this.players.delete(playerId);
            // Clear any temporary pixels placed by this player
            this.clearTemporary(playerId);
            return true;
        }
        return false;
    }

    getPlayersList() {
        return Array.from(this.players.values()).map(player => ({
            id: player.id,
            color: player.color,
            score: player.score,
            figures: player.figures
        }));
    }

    updatePlayerColor(playerId, newColor) {
        const player = this.players.get(playerId);
        if (player) {
            player.color = newColor;
            return true;
        }
        return false;
    }

    placePixel(playerId, status, position) {
      if (this.gameOver) return false;
      const { x, y } = position;

      if (x < 0 || x >= 10 || y < 0 || y >= 10) {
        return false; // Out of bounds
      }

      const player = this.players.get(playerId);
      const playerColor = player ? player.color : 'red';

      if (status === 1) {
        // Only allow placing if empty or if it's own temporary pixel
        const cell = this.grid[y][x];
        if (cell === null) {
          this.grid[y][x] = { playerId, color: playerColor, state: 'drawing' };
        } else if (cell.playerId === playerId && cell.state === 'drawing') {
          // Already own drawing pixel, do nothing or update
          this.grid[y][x] = { playerId, color: playerColor, state: 'drawing' };
        } else {
          return false; // Occupied by solid or other player
        }
      } else if (status === 0) {
        // Only allow removing own temporary pixels
        const cell = this.grid[y][x];
        if (cell && cell.playerId === playerId && cell.state === 'drawing') {
          this.grid[y][x] = null;
        } else {
          return false;
        }
      }

      // Add move to game history
      this.addMove(playerId, 'place_pixel', {
        position: { x, y },
        status
      });

      return true;
    }

    placeFigure(playerId, pixels, roomId = null, io = null) {
        if (this.gameOver) return false;
        const player = this.players.get(playerId);
        if (!player) {
            this.clearTemporary(playerId);
            return false;
        }

        // 1. Validate geometry
        const matchedFigureIndex = this.checkMatch(pixels, player.figures);
        if (matchedFigureIndex === -1) {
            this.clearTemporary(playerId, roomId, io);
            return false;
        }

        // 2. Validate placement (bounds and collision)
        for (const p of pixels) {
            if (p.x < 0 || p.x >= 10 || p.y < 0 || p.y >= 10) {
                this.clearTemporary(playerId, roomId, io);
                return false;
            }
            const cell = this.grid[p.y][p.x];
            // Collision if cell is not null AND (not owned by player OR not drawing state)
            if (cell !== null) {
                if (cell.playerId !== playerId || cell.state !== 'drawing') {
                    this.clearTemporary(playerId, roomId, io);
                    return false;
                }
            }
        }

        // 3. Place pixels (Solidify)
        // First, clear any temporary pixels that might be leftover (though usually they are part of the figure)
        // Actually, we should just overwrite the pixels in the figure with solid ones.
        // But we should also clean up any "stray" drawing pixels if the user drew extra stuff.
        this.clearTemporary(playerId, roomId, io);

        for (const p of pixels) {
            this.grid[p.y][p.x] = { playerId, color: player.color }; // No 'state' means solid
        }

        // 4. Replace figure at the same index (don't change order)
        const matchedFigure = player.figures[matchedFigureIndex];
        const placedType = matchedFigure.type;
        const remainingTypes = player.figures
            .filter((_, index) => index !== matchedFigureIndex)
            .map(fig => fig.type);
        const excludeTypes = [placedType, ...remainingTypes];
        
        if (matchedFigureIndex > -1) {
            // Generate new figure excluding placed type and remaining types
            const newFigure = generateNewFigure(excludeTypes);
            player.figures[matchedFigureIndex] = newFigure;
        }

        // 5. Check lines
        const linesCleared = this.checkLines();

        // 6. Update Score
        // +4 for placing figure
        player.score += 4;

        // +10 per line
        if (linesCleared > 0) {
            player.score += 10 * linesCleared;
            // Bonus if > 1 line
            if (linesCleared > 1) {
                player.score += 10 * linesCleared;
            }
        }

        // Increment counters for tracking game statistics
        this.incrementFiguresPlaced();
        if (linesCleared > 0) {
            this.incrementLinesCleared(linesCleared);
        }

        // Add move to game history
        this.addMove(playerId, 'place_figure', {
            figure: matchedFigure.type,
            linesCleared,
            scoreIncrease: 4 + (linesCleared > 0 ? 10 * linesCleared + (linesCleared > 1 ? 10 * linesCleared : 0) : 0)
        });

        return true;
    }

    clearTemporary(playerId, roomId = null, io = null) {
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const cell = this.grid[y][x];
                if (cell && cell.playerId === playerId && cell.state === 'drawing') {
                    this.grid[y][x] = null;
                }
            }
        }
        
        // Send update to all players if roomId and io are provided
        if (roomId && io) {
            const gameState = this.getState();
            io.to(roomId).emit('game_update', gameState);
        }
    }

    checkMatch(pixels, figures) {
        if (!pixels || pixels.length === 0) return -1;

        // Normalize pixels
        const minX = Math.min(...pixels.map(p => p.x));
        const minY = Math.min(...pixels.map(p => p.y));
        const normalized = pixels.map(p => ({ x: p.x - minX, y: p.y - minY }));

        for (let i = 0; i < figures.length; i++) {
            const figure = figures[i];
            if (!figure.cells) continue;
            if (figure.cells.length !== pixels.length) continue;

            const match = figure.cells.every(fp =>
                normalized.some(p => p.x === fp[0] && p.y === fp[1])
            );

            if (match) return i;
        }
        return -1;
    }

    checkLines() {
        const fullRowIndices = [];
        const fullColIndices = [];

        // 1. Identify full rows
        for (let y = 0; y < this.gridHeight; y++) {
            if (this.grid[y].every(cell => cell !== null)) {
                fullRowIndices.push(y);
            }
        }

        // 2. Identify full cols
        for (let x = 0; x < this.gridWidth; x++) {
            let colFilled = true;
            for (let y = 0; y < this.gridHeight; y++) {
                if (this.grid[y][x] === null) {
                    colFilled = false;
                    break;
                }
            }
            if (colFilled) fullColIndices.push(x);
        }

        if (fullRowIndices.length === 0 && fullColIndices.length === 0) {
            return 0; // Return 0 instead of undefined
        }

        // 3. Process Rows (Shift to Center) - For a 10x10 grid, center is at row 5
        const centerRow = Math.floor(this.gridHeight / 2);
        let topRows = this.grid.slice(0, centerRow);
        let bottomRows = this.grid.slice(centerRow, this.gridHeight);

        // Filter out full rows from top and unshift empty rows
        topRows = topRows.filter((_, index) => !fullRowIndices.includes(index));
        while (topRows.length < centerRow) {
            topRows.unshift(Array(this.gridWidth).fill(null));
        }

        // Filter out full rows from bottom and push empty rows
        bottomRows = bottomRows.filter((_, index) => !fullRowIndices.includes(index + centerRow));
        while (bottomRows.length < (this.gridHeight - centerRow)) {
            bottomRows.push(Array(this.gridWidth).fill(null));
        }

        this.grid = [...topRows, ...bottomRows];

        // 4. Process Columns (Shift to Center) - For a 10x10 grid, center is at column 5
        const centerCol = Math.floor(this.gridWidth / 2);
        for (let y = 0; y < this.gridHeight; y++) {
            let row = this.grid[y];
            let leftHalf = row.slice(0, centerCol);
            let rightHalf = row.slice(centerCol, this.gridWidth);

            // Filter out full cols from left and unshift nulls
            leftHalf = leftHalf.filter((_, index) => !fullColIndices.includes(index));
            while (leftHalf.length < centerCol) {
                leftHalf.unshift(null);
            }

            // Filter out full cols from right and push nulls
            rightHalf = rightHalf.filter((_, index) => !fullColIndices.includes(index + centerCol));
            while (rightHalf.length < (this.gridWidth - centerCol)) {
                rightHalf.push(null);
            }

            this.grid[y] = [...leftHalf, ...rightHalf];
        }

        const totalLinesCleared = fullRowIndices.length + fullColIndices.length;
        if (totalLinesCleared > 0) {
            this.incrementLinesCleared(totalLinesCleared);
        }
        return totalLinesCleared;
    }

    checkGameOver() {
        for (const player of this.players.values()) {
            for (const figure of player.figures) {
                if (this.canPlaceFigure(player.id, figure)) {
                    return false;
                }
            }
        }
        this.gameOver = true;
        return true;
    }

    canPlaceFigure(playerId, figure) {
        if (!figure || !figure.cells) return false;

        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                let fits = true;
                for (const [dx, dy] of figure.cells) {
                    const targetX = x + dx;
                    const targetY = y + dy;

                    if (targetX < 0 || targetX >= this.gridWidth || targetY < 0 || targetY >= this.gridHeight) {
                        fits = false;
                        break;
                    }

                    const cell = this.grid[targetY][targetX];
                    if (cell !== null) {
                        if (cell.playerId === playerId && cell.state === 'drawing') {
                            // Treat as empty
                        } else {
                            fits = false;
                            break;
                        }
                    }
                }
                if (fits) return true;
            }
        }
        return false;
    }

    restart() {
        // Clear the grid
        this.grid = Array(10).fill(null).map(() => Array(10).fill(null));
        
        // Reset game over state
        this.gameOver = false;
        
        // Reset all players' scores and figures
        for (const player of this.players.values()) {
            player.score = 0;
            player.figures = [
                generateNewFigure(),
                generateNewFigure()
            ];
        }
        
        // Reset game tracking properties
        this.startTime = Date.now();
        this.linesCleared = 0;
        this.figuresPlaced = 0;
        this.moves = [];
    }

    /**
     * Get the duration of the game in seconds
     * @returns {number} Duration in seconds
     */
    getDuration() {
        return Math.floor((Date.now() - this.startTime) / 1000);
    }

    /**
     * Get the total lines cleared in the game
     * @returns {number} Total lines cleared
     */
    getLinesCleared() {
        return this.linesCleared;
    }

    /**
     * Get the total figures placed in the game
     * @returns {number} Total figures placed
     */
    getFiguresPlaced() {
        return this.figuresPlaced;
    }

    /**
     * Get the score for a specific player
     * @param {string} playerId - The player ID
     * @returns {number} Player's score
     */
    getScore(playerId) {
        const player = this.players.get(playerId);
        return player ? player.score : 0;
    }

    /**
     * Get the game result for a specific player
     * @param {string} playerId - The player ID
     * @returns {string} Game result ('win', 'loss', 'draw', or 'unknown')
     */
    getGameResult(playerId) {
        if (!this.gameOver) {
            return 'in_progress';
        }

        // Determine the result based on player scores
        const player = this.players.get(playerId);
        if (!player) {
            return 'unknown';
        }

        // For multiplayer, determine win/loss/draw based on relative scores
        if (this.players.size === 1) {
            // Single player - always consider as win for now
            return 'win';
        }

        // For multiplayer, find the highest score
        let highestScore = -1;
        let playersWithHighestScore = [];
        
        for (const [id, p] of this.players) {
            if (p.score > highestScore) {
                highestScore = p.score;
                playersWithHighestScore = [id];
            } else if (p.score === highestScore) {
                playersWithHighestScore.push(id);
            }
        }

        if (playersWithHighestScore.includes(playerId)) {
            if (playersWithHighestScore.length === 1) {
                return 'win';
            } else {
                // Multiple players with the same highest score - draw
                return 'draw';
            }
        } else {
            return 'loss';
        }
    }

    /**
     * Add a move to the game history
     * @param {string} playerId - The player ID making the move
     * @param {string} action - The action type (e.g., 'place_figure', 'place_pixel')
     * @param {Object} details - Additional details about the move
     */
    addMove(playerId, action, details) {
        this.moves.push({
            playerId,
            action,
            details,
            timestamp: Date.now()
        });
    }

    /**
     * Increment the figures placed counter
     */
    incrementFiguresPlaced() {
        this.figuresPlaced++;
    }

    /**
     * Increment the lines cleared counter
     * @param {number} count - Number of lines cleared
     */
    incrementLinesCleared(count = 1) {
        this.linesCleared += count;
    }

    /**
     * Get initial grid state
     * @returns {Array} Initial grid state
     */
    getInitialGrid() {
        return this.initialGrid || Array(10).fill(null).map(() => Array(10).fill(null));
    }
}

module.exports = { Game, FIGURES };
