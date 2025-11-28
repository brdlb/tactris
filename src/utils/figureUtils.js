const FIGURES = {
    I: [[0, 0], [1, 0], [2, 0], [3, 0]],
    O: [[0, 0], [1, 0], [0, 1], [1, 1]],
    T: [[0, 0], [1, 0], [2, 0], [1, 1]],
    S: [[1, 0], [2, 0], [0, 1], [1, 1]],
    Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
    J: [[1, 0], [1, 1], [1, 2], [0, 2]],
    L: [[0, 0], [0, 1], [0, 2], [1, 2]]
};

// Rotate figure 90 degrees clockwise: (x, y) -> (-y, x), then normalize
const rotateShape = (shape) => {
    const rotated = shape.map(([x, y]) => [-y, x]);
    const minX = Math.min(...rotated.map(p => p[0]));
    const minY = Math.min(...rotated.map(p => p[1]));
    return rotated.map(([x, y]) => [x - minX, y - minY]);
};

// Helper to normalize pixels to (0,0)
const normalizePixels = (pixels) => {
    if (pixels.length === 0) return [];
    const minX = Math.min(...pixels.map(p => p.x));
    const minY = Math.min(...pixels.map(p => p.y));
    return pixels.map(p => ({ x: p.x - minX, y: p.y - minY }));
};

// Check if pixels match a specific figure in any rotation
const matchFigure = (normalizedPixels, figure) => {
    if (!figure.cells || figure.cells.length !== normalizedPixels.length) return false;

    // Check all 4 rotations
    let currentShape = figure.cells;
    for (let r = 0; r < 4; r++) {
        const isSubset = normalizedPixels.every(p =>
            currentShape.some(fp => fp[0] === p.x && fp[1] === p.y)
        );

        if (isSubset) return true;

        currentShape = rotateShape(currentShape);
    }
    return false;
};

// Helper to check if pixels match any of the allowed figures (subset check)
const checkMatch = (pixels, figures) => {
    if (!pixels || pixels.length === 0) return -1;

    const normalized = normalizePixels(pixels);

    for (let i = 0; i < figures.length; i++) {
        if (matchFigure(normalized, figures[i])) {
            return i;
        }
    }
    return -1;
};

module.exports = {
    checkMatch,
    normalizePixels,
    rotateShape,
    matchFigure,
    FIGURES
};
 
