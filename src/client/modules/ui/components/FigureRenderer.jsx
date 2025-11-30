import React from 'react';

const FigureRenderer = ({ 
  figure, 
  color, 
  cellSize = 10, 
  gap = '1px', 
  margin = '5px',
  key: customKey 
}) => {
  // Render helper for individual figures
  if (!figure || !figure.cells) return null;

  const shape = figure.cells;

  // Create a 4x4 grid for the figure
  const w = 4, h = 4;
  const grid = Array(h).fill(null).map(() => Array(w).fill(false));
  shape.forEach(([x, y]) => {
    if (grid[y] && grid[y][x] !== undefined) {
      grid[y][x] = true;
    }
  });

  return (
    <div 
      style={{ 
        display: 'grid', 
        gridTemplateColumns: `repeat(${w}, ${cellSize}px)`, 
        gap: gap, 
        margin: margin 
      }}
      key={customKey || Math.random()}
    >
      {grid.map((row, y) => 
        row.map((filled, x) => (
          <div 
            key={`${x}-${y}`} 
            style={{ 
              width: `${cellSize}px`, 
              height: `${cellSize}px`, 
              backgroundColor: filled ? color : 'transparent' 
            }} 
          />
        ))
      )}
    </div>
  );
};

export default FigureRenderer;