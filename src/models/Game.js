const FIGURES = {
    I: [[0, 0], [1, 0], [2, 0], [3, 0]],
    O: [[0, 0], [1, 0], [0, 1], [1, 1]],
    T: [[0, 0], [1, 0], [2, 0], [1, 1]],
    S: [[1, 0], [2, 0], [0, 1], [1, 1]],
    Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
    J: [[1, 0], [1, 1], [1, 2], [0, 2]],
    L: [[0, 0], [0, 1], [0, 2], [1, 2]]
};

class Game {
    constructor(id) {
        this.id = id;
        this.grid = Array(10).fill(null).map(() => Array(10).fill(null)); // 10x10 grid
        this.players = new Map();
        this.gameOver = false;
    }

    addPlayer(playerId) {
        if (!this.players.has(playerId)) {
            const figureKeys = Object.keys(FIGURES);
            const playerFigures = [
                figureKeys[Math.floor(Math.random() * figureKeys.length)],
                figureKeys[Math.floor(Math.random() * figureKeys.length)]
            ];
            this.players.set(playerId, {
                id: playerId,
                figures: playerFigures,
                score: 0
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

    placePixel(playerId, status, position) {
        if (this.gameOver) return false;
        const { x, y } = position;

        if (x < 0 || x >= 10 || y < 0 || y >= 10) {
            return false; // Out of bounds
        }

        if (status === 1) {
            // Only allow placing if empty or if it's own temporary pixel
            const cell = this.grid[y][x];
            if (cell === null) {
                this.grid[y][x] = { playerId, color: 'red', state: 'drawing' };
            } else if (cell.playerId === playerId && cell.state === 'drawing') {
                // Already own drawing pixel, do nothing or update
                this.grid[y][x] = { playerId, color: 'red', state: 'drawing' };
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

        return true;
    }

    placeFigure(playerId, pixels) {
        if (this.gameOver) return false;
        const player = this.players.get(playerId);
        if (!player) {
            this.clearTemporary(playerId);
            return false;
        }

        // 1. Validate geometry
        const matchedType = this.checkMatch(pixels, player.figures);
        if (!matchedType) {
            this.clearTemporary(playerId);
            return false;
        }

        // 2. Validate placement (bounds and collision)
        for (const p of pixels) {
            if (p.x < 0 || p.x >= 10 || p.y < 0 || p.y >= 10) {
                this.clearTemporary(playerId);
                return false;
            }
            const cell = this.grid[p.y][p.x];
            // Collision if cell is not null AND (not owned by player OR not drawing state)
            if (cell !== null) {
                if (cell.playerId !== playerId || cell.state !== 'drawing') {
                    this.clearTemporary(playerId);
                    return false;
                }
            }
        }

        // 3. Place pixels (Solidify)
        // First, clear any temporary pixels that might be leftover (though usually they are part of the figure)
        // Actually, we should just overwrite the pixels in the figure with solid ones.
        // But we should also clean up any "stray" drawing pixels if the user drew extra stuff.
        this.clearTemporary(playerId);

        for (const p of pixels) {
            this.grid[p.y][p.x] = { playerId, color: 'red' }; // No 'state' means solid
        }

        // 4. Remove figure from player
        const figIndex = player.figures.indexOf(matchedType);
        if (figIndex > -1) {
            player.figures.splice(figIndex, 1);
            // Refill figures to keep the game going
            const figureKeys = Object.keys(FIGURES);
            player.figures.push(figureKeys[Math.floor(Math.random() * figureKeys.length)]);
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

        return true;
    }

    clearTemporary(playerId) {
        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 10; x++) {
                const cell = this.grid[y][x];
                if (cell && cell.playerId === playerId && cell.state === 'drawing') {
                    this.grid[y][x] = null;
                }
            }
        }
    }

    checkMatch(pixels, allowedTypes) {
        if (!pixels || pixels.length === 0) return null;

        // Normalize pixels
        const minX = Math.min(...pixels.map(p => p.x));
        const minY = Math.min(...pixels.map(p => p.y));
        const normalized = pixels.map(p => ({ x: p.x - minX, y: p.y - minY }));

        for (const type of allowedTypes) {
            const figure = FIGURES[type];
            if (!figure) continue;
            if (figure.length !== pixels.length) continue;

            const match = figure.every(fp =>
                normalized.some(p => p.x === fp[0] && p.y === fp[1])
            );

            if (match) return type;
        }
        return null;
    }

    checkLines() {
        const fullRowIndices = [];
        const fullColIndices = [];

        // 1. Identify full rows
        for (let y = 0; y < 10; y++) {
            if (this.grid[y].every(cell => cell !== null)) {
                fullRowIndices.push(y);
            }
        }

        // 2. Identify full cols
        for (let x = 0; x < 10; x++) {
            let colFilled = true;
            for (let y = 0; y < 10; y++) {
                if (this.grid[y][x] === null) {
                    colFilled = false;
                    break;
                }
            }
            if (colFilled) fullColIndices.push(x);
        }

        if (fullRowIndices.length === 0 && fullColIndices.length === 0) {
            return;
        }

        // 3. Process Rows (Shift to Center)
        let topRows = this.grid.slice(0, 5);
        let bottomRows = this.grid.slice(5, 10);

        // Filter out full rows from top and unshift empty rows
        topRows = topRows.filter((_, index) => !fullRowIndices.includes(index));
        while (topRows.length < 5) {
            topRows.unshift(Array(10).fill(null));
        }

        // Filter out full rows from bottom and push empty rows
        bottomRows = bottomRows.filter((_, index) => !fullRowIndices.includes(index + 5));
        while (bottomRows.length < 5) {
            bottomRows.push(Array(10).fill(null));
        }

        this.grid = [...topRows, ...bottomRows];

        // 4. Process Columns (Shift to Center)
        for (let y = 0; y < 10; y++) {
            let row = this.grid[y];
            let leftHalf = row.slice(0, 5);
            let rightHalf = row.slice(5, 10);

            // Filter out full cols from left and unshift nulls
            leftHalf = leftHalf.filter((_, index) => !fullColIndices.includes(index));
            while (leftHalf.length < 5) {
                leftHalf.unshift(null);
            }

            // Filter out full cols from right and push nulls
            rightHalf = rightHalf.filter((_, index) => !fullColIndices.includes(index + 5));
            while (rightHalf.length < 5) {
                rightHalf.push(null);
            }

            this.grid[y] = [...leftHalf, ...rightHalf];
        }

        return fullRowIndices.length + fullColIndices.length;
    }

    checkGameOver() {
        for (const player of this.players.values()) {
            for (const figureType of player.figures) {
                if (this.canPlaceFigure(player.id, figureType)) {
                    return false;
                }
            }
        }
        this.gameOver = true;
        return true;
    }

    canPlaceFigure(playerId, figureType) {
        const figure = FIGURES[figureType];
        if (!figure) return false;

        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 10; x++) {
                let fits = true;
                for (const [dx, dy] of figure) {
                    const targetX = x + dx;
                    const targetY = y + dy;

                    if (targetX < 0 || targetX >= 10 || targetY < 0 || targetY >= 10) {
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
}

module.exports = { Game, FIGURES };
