import React, { useRef, useState } from 'react';
import useGameLogic from '../hooks/useGameLogic';
import SettingsModal from './SettingsModal';
import RoomControls from './RoomControls';
import FiguresPanel from './FiguresPanel';
import GameGrid from './GameGrid';
import Panel from './Panel';
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

                    <div className="game-board-wrapper">
                        <Panel position="top-right">
                            <div className="panel-content">Панель 1</div>
                        </Panel>
                        
                        <Panel position="bottom-right">
                            <div className="panel-content">Панель 2</div>
                        </Panel>
                        
                        <Panel position="bottom-left">
                            <div className="panel-content">Панель 3</div>
                        </Panel>

                        <GameGrid
                            grid={grid}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerCancel}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameBoard;
