import React, { useRef, useState, useEffect } from 'react';
import useGameLogic from '../hooks/useGameLogic';
import SocketManager from '../../network/SocketManager';
import SettingsModal from './SettingsModal';
import StatsModal from './StatsModal';
import RoomControls from './RoomControls';
import FiguresPanel from './FiguresPanel';
import GameGrid from './GameGrid';
import PlayerPanels from './PlayerPanels';
import { getUserColor } from '../../../utils/colorUtils';
import './GameBoard.css';

const DEFAULT_STATS = {
    total_games: 0,
    total_wins: 0,
    win_rate: 0,
    total_score: 0,
    average_score: 0,
    best_score: 0,
    total_lines_cleared: 0,
    average_lines_cleared: 0,
    best_lines_cleared: 0,
    total_figures_placed: 0,
    total_play_time_seconds: 0,
    average_lines_per_game: 0,
    rating: 1000
};

const GameBoard = () => {
    const [showSettings, setShowSettings] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [statsData, setStatsData] = useState(null);
    const boardRef = useRef(null);

    const {
        grid,
        roomId,
        rooms,
        roomStates,
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

    const showStatsModal = async () => {
        try {
            // Get the user_id from localStorage
            const userId = localStorage.getItem('userId');

            if (!userId) {
                console.log('📊 [GameBoard] No user_id found, using default stats');
                setStatsData(DEFAULT_STATS);
                setShowStats(true);
                return;
            }

            // Make an API call to get user statistics using public endpoint
            const response = await fetch(`/api/user/stats/public?user_id=${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('📊 [GameBoard] Statistics data received from API:', data);
                setStatsData(data);
            } else {
                // If the API call fails, set default stats
                console.log('📊 [GameBoard] API call failed, using default stats');
                setStatsData(DEFAULT_STATS);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
            // Set default stats in case of error
            setStatsData(DEFAULT_STATS);
        }

        setShowStats(true);
    };

    // Set the player color as a CSS variable for buttons to use
    const currentPlayerColor = playersList.find(p => p.id === SocketManager.getSocket()?.id)?.color;
    React.useEffect(() => {
        if (currentPlayerColor) {
            document.documentElement.style.setProperty('--player-color', currentPlayerColor);
        } else {
            // Reset to default when no player color is available
            document.documentElement.style.setProperty('--player-color', getUserColor());
        }
    }, [currentPlayerColor]);

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
                onShowStats={showStatsModal}
            />

            <StatsModal
                isOpen={showStats}
                onClose={() => setShowStats(false)}
                statsData={statsData}
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
                    roomStates={roomStates}
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
                        <PlayerPanels
                            playersList={playersList}
                            currentSocketId={SocketManager.getSocket()?.id}
                        />

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
