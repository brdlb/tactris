import React from 'react';
import { FIGURES } from '../../../constants/figures';

const FiguresPanel = ({ score, figures }) => {
    // Render helper for figures
    const renderFigure = (figure) => {
        if (!figure || !figure.cells) return null;

        const shape = figure.cells;

        // Create a mini grid for the figure
        const w = 4, h = 4;
        const grid = Array(h).fill(null).map(() => Array(w).fill(false));
        shape.forEach(([x, y]) => {
            if (grid[y] && grid[y][x] !== undefined) grid[y][x] = true;
        });

        return (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${w}, 10px)`, gap: '1px', margin: '5px' }}>
                {grid.map((row, y) => row.map((filled, x) => (
                    <div key={`${x}-${y}`} style={{ width: '10px', height: '10px', backgroundColor: filled ? 'var(--text-primary)' : 'transparent' }} />
                )))}
            </div>
        );
    };

    return (
        <div className="figures-panel">
            <div style={{ marginBottom: '10px', fontSize: '1.2em', fontWeight: 'bold' }}>
                {score}
            </div>
            {figures.length > 0 && (
                <div style={{ display: 'flex' }}>
                    {figures.map((figure, i) => (
                        <div key={i} style={{ marginRight: '10px' }}>
                            {renderFigure(figure)}

const FIGURES = {
    I: [[0, 0], [1, 0], [2, 0], [3, 0]],
    O: [[0, 0], [1, 0], [0, 1], [1, 1]],
    T: [[0, 0], [1, 0], [2, 0], [1, 1]],
    S: [[1, 0], [2, 0], [0, 1], [1, 1]],
    Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
    J: [[1, 0], [1, 1], [1, 2], [0, 2]],
    L: [[0, 0], [0, 1], [0, 2], [1, 2]]
};

// Render helper for figures
const renderFigure = (type) => {
    const shape = FIGURES[type];
    if (!shape) return null;

    // Create a mini grid for the figure
    const w = 4, h = 4;
    const grid = Array(h).fill(null).map(() => Array(w).fill(false));
    shape.forEach(([x, y]) => {
        if (grid[y] && grid[y][x] !== undefined) grid[y][x] = true;
    });

    return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${w}, 10px)`, gap: '1px', margin: '5px' }}>
            {grid.map((row, y) => row.map((filled, x) => (
                <div key={`${x}-${y}`} style={{ width: '10px', height: '10px', backgroundColor: filled ? 'black' : '#eee' }} />
            )))}
        </div>
    );
};

const FiguresPanel = ({ myFigures }) => {
    return (
        <div className="figures-panel">
            <div style={{ marginBottom: '10px', fontSize: '1.2em', fontWeight: 'bold' }}>
                Available Figures:
            </div>
            {myFigures.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {myFigures.map((type, i) => (
                        <div key={`${type}-${i}`} style={{ marginRight: '10px' }}>
                            {renderFigure(type)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FiguresPanel;
