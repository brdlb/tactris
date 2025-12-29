export const checkLineClears = (grid) => {
    const clearedHorizontal = [];
    const clearedVertical = [];

    const height = grid.length;
    const width = grid[0]?.length || 0;

    // Check horizontal lines
    for (let y = 0; y < height; y++) {
        if (grid[y].every(cell => cell !== null)) {
            clearedHorizontal.push(y);
        }
    }

    // Check vertical lines
    for (let x = 0; x < width; x++) {
        let full = true;
        for (let y = 0; y < height; y++) {
            if (grid[y][x] === null) {
                full = false;
                break;
            }
        }
        if (full) {
            clearedVertical.push(x);
        }
    }

    return { clearedHorizontal, clearedVertical };
};

export const applyLineClears = (grid, horizontal, vertical) => {
    const newGrid = grid.map(row => [...row]);
    const width = grid[0]?.length || 0;

    horizontal.forEach(y => {
        newGrid[y] = Array(width).fill(null);
    });

    vertical.forEach(x => {
        for (let y = 0; y < grid.length; y++) {
            newGrid[y][x] = null;
        }
    });

    return newGrid;
};
