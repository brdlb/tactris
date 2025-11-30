import React from 'react';
import { useGameState } from '../hooks/useGameState';
import { useDrawingInteraction } from '../hooks/useDrawingInteraction';
import { useTheme } from '../hooks/useTheme';
import RoomManager from './RoomManager';
import ScoreBoard from './ScoreBoard';
import FiguresPanel from './FiguresPanel';
import GameBoard from './GameBoard';
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

    const {
        handleMouseDown,
        handleMouseEnter,
        handleInteraction
    } = useDrawingInteraction(gridRef, roomIdRef, gameOver, myFigures);

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
                        <FiguresPanel myFigures={myFigures} />
                    </div>
                )}

                <GameBoard
                    grid={grid}
                    roomId={roomId}
                    onMouseDown={handleMouseDown}
                    onMouseEnter={handleMouseEnter}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                />
            </div>
        </div>
    );
};

export default GameBoardMain;