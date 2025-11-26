import React, { useRef, useState } from 'react';
import useGameLogic from '../hooks/useGameLogic';
import SettingsModal from './SettingsModal';
import RoomControls from './RoomControls';
import FiguresPanel from './FiguresPanel';
import GameGrid from './GameGrid';
import './GameBoard.css';

const GameBoard = () => {
    const [showSettings, setShowSettings] = useState(false);
    const boardRef = useRef(null);

    const {
        grid,
        roomId,
        rooms,
        myFigures,
        score,
        gameOver,
        theme,
        toggleTheme,
        handleCreateRoom,
        handleJoinRoom,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handlePointerCancel
    } = useGameLogic(boardRef);

    const toggleSettings = () => {
        setShowSettings(!showSettings);
    };

    return (
        <div className="game-container">
            {/* Settings button */}
            <button className="settings-btn" onClick={toggleSettings} aria-label="Settings">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>

            <SettingsModal
                isOpen={showSettings}
                onClose={toggleSettings}
                theme={theme}
                onToggleTheme={toggleTheme}
            />

            <h1 className="game-title">Tactris</h1>

            {gameOver && (
                <div className="game-over-overlay">
                    <h2>Game Over!</h2>
                    <p>No more moves possible.</p>
                </div>
            )}

            {!roomId && (
                <RoomControls
                    rooms={rooms}
                    onCreateRoom={handleCreateRoom}
                    onJoinRoom={handleJoinRoom}
                />
            )}

            {roomId && (
                <div className="game-content">
                    <FiguresPanel score={score} figures={myFigures} />

                    <GameGrid
                        grid={grid}
                        roomId={roomId}
                        boardRef={boardRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerCancel}
                    />
                </div>
            )}
        </div>
    );
import React from 'react';

const GameBoard = ({ 
  grid, 
  roomId,
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
          {roomId && (
              <div className="room-id-display">
                  {roomId}
              </div>
          )}
      </div>
  );
};

export default GameBoard;
