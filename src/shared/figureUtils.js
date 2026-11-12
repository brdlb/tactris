// Universal module format: works with both CommonJS (server) and ES modules (client via Vite)

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
const matchFigure = (normalizedPixels, figure, rotateable = false) => {
    if (!figure.cells || figure.cells.length !== normalizedPixels.length) return false;

    // If rotateable is true, check all 4 rotations; otherwise only check original orientation
    let currentShape = figure.cells;
    if (rotateable) {
        for (let r = 0; r < 4; r++) {
            const isSubset = normalizedPixels.every(p =>
                currentShape.some(fp => fp[0] === p.x && fp[1] === p.y)
            );

            if (isSubset) return true;

            currentShape = rotateShape(currentShape);
        }
    } else {
        // Only check original orientation
        const isSubset = normalizedPixels.every(p =>
            currentShape.some(fp => fp[0] === p.x && fp[1] === p.y)
        );
        if (isSubset) return true;
    }
    return false;
};

// Helper to check if pixels match any of the allowed figures (subset check)
const checkMatch = (pixels, figures, rotateable = false) => {
    if (!pixels || pixels.length === 0) return -1;

    const normalized = normalizePixels(pixels);

    for (let i = 0; i < figures.length; i++) {
        if (matchFigure(normalized, figures[i], rotateable)) {
            return i;
        }
    }
    return -1;
};

// CommonJS export for server and Vite alias resolution
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        checkMatch,
        normalizePixels,
        rotateShape,
        matchFigure,
        FIGURES,
        FIGURE_ROTATIONS,
        rotateFigure,
        normalizeFigure,
        generateNewFigure
    };
}

export {
    checkMatch,
    normalizePixels,
    rotateShape,
    matchFigure,
    FIGURES,
    FIGURE_ROTATIONS,
    rotateFigure,
    normalizeFigure,
    generateNewFigure
};
