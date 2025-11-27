import React, { useRef, useState } from 'react';
import useGameLogic from '../hooks/useGameLogic';
import SocketManager from '../../network/SocketManager';
import SettingsModal from './SettingsModal';
import RoomControls from './RoomControls';
import FiguresPanel from './FiguresPanel';
import GameGrid from './GameGrid';
import Panel from './Panel';
import FigureRenderer from './FigureRenderer';
import './GameBoard.css';

const GameBoard = () => {
    const [showSettings, setShowSettings] = useState(false);
    const boardRef = useRef(null);

    const {
        grid,
        roomId,
        rooms,
        playersList,
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
        handlePointerCancel,
        handleHueChange,
        handleRestart
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
                onHueChange={handleHueChange}
            />

            <h1 className="game-title">Tactris</h1>

            {gameOver && (
                <div className="game-over-overlay">
                    <h2>Game Over!</h2>
                    <p>No more moves possible.</p>
                    <button className="restart-btn" onClick={handleRestart}>
                        Restart Game
                    </button>
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
                    <FiguresPanel 
                        score={score} 
                        figures={myFigures}
                        playerColor={playersList.find(p => p.id === SocketManager.getSocket()?.id)?.color}
                    />

                    <div className="game-board-wrapper">
                        {/* Display players in panels - excluding current user from panels since they see their own info in FiguresPanel */}
                        {playersList.filter(player => player.id !== SocketManager.getSocket()?.id).slice(0, 3).map((player, index) => {
                            const positions = ['top-right', 'bottom-right', 'bottom-left'];
                            const position = positions[index] || 'top-right';

                            // Helper to render figures for other players using the reusable FigureRenderer
                            const renderPlayerFigures = (figures) => {
                                if (!figures || figures.length === 0) return null;

                                return (
                                    <div style={{ display: 'flex', marginTop: '5px' }}>
                                        {figures.map((figure, i) => (
                                            <div key={i} style={{ marginRight: '5px' }}>
                                                <FigureRenderer 
                                                    figure={figure} 
                                                    color={player.color}
                                                    cellSize={8}
                                                    gap="1px"
                                                    margin="2px"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                );
                            };

                            return (
                                <Panel key={player.id} position={position}>
                                    <div className="panel-content">
                                        <div className="player-info">
                                            <div
                                                className="player-color"
                                                style={{ backgroundColor: player.color }}
                                            ></div>
                                            <div className="player-score">{player.score || 0}</div>
                                        </div>
                                        {renderPlayerFigures(player.figures)}
                                    </div>
                                </Panel>
                            );
                        })}

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
                </div>
            )}
        </div>
    );
};

export default GameBoard;
