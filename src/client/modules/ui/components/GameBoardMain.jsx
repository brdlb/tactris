import React from 'react';
import { useGameState } from '../hooks/useGameState';
import { useDrawingInteraction } from '../hooks/useDrawingInteraction';
import { useTheme } from '../hooks/useTheme';
import { getUserColor } from '../../../utils/colorUtils.js';
import RoomManager from './RoomManager';
import ScoreBoard from './ScoreBoard';
import FiguresPanel from './FiguresPanel';
import GameOverOverlay from './GameOverOverlay';
import SettingsModal from './SettingsModal';

const GameBoardMain = () => {
    const {
        grid,
        roomId,
        rooms,
        myFigures,
        score,
        gameOver,
        createRoom,
        joinRoom,
        gridRef,
        roomIdRef
    } = useGameState();

    const { theme, toggleTheme } = useTheme();
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

    const playerColor = React.useMemo(() => getUserColor(), []);

    const {
        handleMouseDown,
        handleMouseEnter,
        handleInteraction
    } = useDrawingInteraction(gridRef, roomIdRef, gameOver, myFigures);

    const [previewKey, setPreviewKey] = React.useState(0);

    const setGridPreview = React.useCallback((newGrid) => {
      gridRef.current = newGrid;
      setPreviewKey((prev) => prev + 1);
    }, []);

    // Touch handlers that work with the new GameBoard component
    const handleTouchStart = (x, y) => {
        // Simulate mouse down behavior for touch
        const fakeEvent = { button: 0, preventDefault: () => {} };
        handleMouseDown(x, y, fakeEvent);
    };

    const handleTouchMove = (x, y) => {
        // Simulate mouse enter behavior for touch
        handleMouseEnter(x, y);
    };

    const handleTouchEnd = () => {
        // Handle touch end logic
        // This will trigger the global touch end handler in useDrawingInteraction
    };

    const handleSettingsToggle = () => {
        setIsSettingsOpen(!isSettingsOpen);
    };

    const handleThemeChange = (newTheme) => {
        toggleTheme(newTheme);
    };

    return (
        <div className="game-container">
            {/* Settings Button */}
            <button className="settings-button" onClick={handleSettingsToggle}>
                ⚙️
            </button>

            {/* Settings Modal */}
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                theme={theme}
                onThemeChange={handleThemeChange}
            />

            {gameOver && <GameOverOverlay />}

            {!roomId && (
                <RoomManager
                    rooms={rooms}
                    onCreateRoom={createRoom}
                    onJoinRoom={joinRoom}
                    onCreateRoomTouch={(e) => e.preventDefault()}
                    onJoinRoomTouch={(e, roomId) => e.preventDefault()}
                />
            )}
            


            <div className="game-content">
                {roomId && (
                    <div className="game-sidebar">
                        <ScoreBoard score={score} />
                        <FiguresPanel myFigures={myFigures} score={score} playerColor={playerColor} />
                    </div>
                )}

                <div
                  key={previewKey}
                  ref={gridRef}
                  className="game-board"
                  onMouseDown={(e) => {
                    if (!gridRef.current) return;
                    e.preventDefault();
                    const rect = gridRef.current.getBoundingClientRect();
                    const x = Math.floor((e.clientX - rect.left) * 10 / rect.width);
                    const y = Math.floor((e.clientY - rect.top) * 10 / rect.height);
                    handleMouseDown(x, y, setGridPreview, e);
                  }}
                  onMouseEnter={(e) => {
                    if (!gridRef.current) return;
                    const rect = gridRef.current.getBoundingClientRect();
                    const x = Math.floor((e.clientX - rect.left) * 10 / rect.width);
                    const y = Math.floor((e.clientY - rect.top) * 10 / rect.height);
                    handleMouseEnter(x, y, setGridPreview);
                  }}
                  onTouchStart={(e) => {
                    if (!gridRef.current || e.touches.length === 0) return;
                    e.preventDefault();
                    const touch = e.touches[0];
                    const rect = gridRef.current.getBoundingClientRect();
                    const x = Math.floor((touch.clientX - rect.left) * 10 / rect.width);
                    const y = Math.floor((touch.clientY - rect.top) * 10 / rect.height);
                    const fakeEvent = { button: 0, preventDefault: () => {} };
                    handleMouseDown(x, y, setGridPreview, fakeEvent);
                  }}
                  onTouchMove={(e) => {
                    if (!gridRef.current || e.touches.length === 0) return;
                    e.preventDefault();
                    const touch = e.touches[0];
                    const rect = gridRef.current.getBoundingClientRect();
                    const x = Math.floor((touch.clientX - rect.left) * 10 / rect.width);
                    const y = Math.floor((touch.clientY - rect.top) * 10 / rect.height);
                    handleMouseEnter(x, y, setGridPreview);
                  }}
                  onTouchEnd={handleTouchEnd}
                  style={{ touchAction: 'none' }}
                >
                  {grid.map((row, rowIndex) =>
                    row.map((cell, colIndex) => (
                      <div
                        key={`${colIndex}-${rowIndex}`}
                        className="grid-cell"
                        style={{
                          backgroundColor: cell
                            ? (cell.state === 'drawing' ? (cell.color || 'red') : 'var(--occupied-pixel-color)')
                            : 'var(--cell-bg)',
                        }}
                      />
                    ))
                  )}
                </div>
            </div>
        </div>
    );
};

export default GameBoardMain;