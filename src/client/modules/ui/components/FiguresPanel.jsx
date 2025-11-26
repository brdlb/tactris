import React from 'react';
import { FIGURES } from '../../../constants/figures';

const FiguresPanel = ({ score, figures }) => {
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
                    {figures.map((type, i) => (
                        <div key={i} style={{ marginRight: '10px' }}>
                            {renderFigure(type)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FiguresPanel;
