import React from 'react';

const GameBoard = ({ 
  grid, 
  onMouseDown, 
  onMouseEnter, 
  onTouchStart, 
  onTouchMove, 
  onTouchEnd 
}) => {
  // Helper function to convert touch coordinates to grid coordinates
  const getGridCoordinatesFromTouch = (touch, gameBoardElement) => {
      const rect = gameBoardElement.getBoundingClientRect();
      const cellWidth = rect.width / 10;
      const cellHeight = rect.height / 10;
      
      const x = Math.floor((touch.clientX - rect.left) / cellWidth);
      const y = Math.floor((touch.clientY - rect.top) / cellHeight);
      
      return { x: Math.max(0, Math.min(9, x)), y: Math.max(0, Math.min(9, y)) };
  };

  const handleTouchStart = (e) => {
      e.preventDefault();
      // Handle first touch
      if (e.touches.length > 0) {
          const touch = e.touches[0];
          const gameBoardElement = document.querySelector('.game-board');
          if (gameBoardElement) {
              const { x, y } = getGridCoordinatesFromTouch(touch, gameBoardElement);
              onTouchStart(x, y);
          }
      }
  };

  const handleTouchMove = (e) => {
      e.preventDefault();
      // Only handle the first touch
      if (e.touches.length > 0) {
          const touch = e.touches[0];
          const gameBoardElement = document.querySelector('.game-board');
          if (gameBoardElement) {
              const { x, y } = getGridCoordinatesFromTouch(touch, gameBoardElement);
              onTouchMove(x, y);
          }
      }
  };

  const handleTouchEnd = (e) => {
      e.preventDefault();
      onTouchEnd();
  };

  return (
      <div className="game-board">
          {grid.map((row, y) =>
              row.map((cell, x) => (
                  <div
                      key={`${x}-${y}`}
                      className="grid-cell"
                      onMouseDown={(e) => onMouseDown(x, y, e)}
                      onMouseEnter={() => onMouseEnter(x, y)}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      style={{
                          backgroundColor: cell ? cell.color : 'white',
                          touchAction: 'none', // Prevent scrolling and zooming on touch
                      }}
                  />
              ))
          )}
      </div>
  );
};

export default GameBoard;
