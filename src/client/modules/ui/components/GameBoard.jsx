import React, { useRef, useState, useEffect } from 'react';
import useGameLogic from '../hooks/useGameLogic';
import SocketManager from '../../network/SocketManager';
import SettingsModal from './SettingsModal';
import StatsModal from './StatsModal';
import LeaderboardModal from './LeaderboardModal';
import HelpModal from './HelpModal';
import RoomControls from './RoomControls';
import FiguresPanel from './FiguresPanel';
import GameGrid from './GameGrid';
import PlayerPanels from './PlayerPanels';
import { getUserColor } from '../../../utils/colorUtils';
import './GameBoard.css';

import useUserStats from '../hooks/useUserStats';

const GameBoard = () => {
    const [showSettings, setShowSettings] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

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
        handleRestart,
        clearingDetails,
        setClearingDetails,

        isTutorialActive,
        currentStep,
        currentStepIndex,
        totalSteps,
        skipTutorial,
        handleTutorialComplete,
        personalColor

    } = useGameLogic(boardRef);

    const toggleSettings = () => {
        setShowSettings(!showSettings);
    };

    const { statsData, fetchPublicStats } = useUserStats();

    const showStatsModal = async () => {
        const userId = localStorage.getItem('userId');
        await fetchPublicStats(userId);
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

    const [skin, setSkin] = useState(localStorage.getItem('gameSkin') || 'classic');

    const handleSkinChange = (newSkin) => {
        setSkin(newSkin);
        localStorage.setItem('gameSkin', newSkin);
    };

    return (
        <div className="game-container">
            {/* Leaderboard button */}
            <button className="leaderboard-btn" onClick={() => setShowLeaderboard(true)} aria-label="Leaderboard">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                    <path d="M4 22h16"></path>
                    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
                </svg>
            </button>

            {/* Help button */}
            <button className="help-btn" onClick={() => setShowHelp(true)} aria-label="Help">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
            </button>

            {/* Settings button */}
            <button className="settings-btn" onClick={toggleSettings} aria-label="Settings">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>

            <HelpModal
                isOpen={showHelp}
                onClose={() => setShowHelp(false)}
            />

            <SettingsModal
                isOpen={showSettings}
                onClose={toggleSettings}
                theme={theme}
                onToggleTheme={toggleTheme}
                onHueChange={handleHueChange}
                onShowStats={showStatsModal}
                skin={skin}
                onSkinChange={handleSkinChange}
            />

            <StatsModal
                isOpen={showStats}
                onClose={() => setShowStats(false)}
                statsData={statsData}
            />

            <LeaderboardModal
                isOpen={showLeaderboard}
                onClose={() => setShowLeaderboard(false)}
            />

            <h1 className="game-title">Tactris</h1>

            {gameOver && (
                <div className="game-over-overlay">
                    <h2 className="pixel-text">Game Over!</h2>
                    <p className="pixel-text">No more moves possible.</p>
                    <button className="restart-btn" onClick={handleRestart}>
                        Restart Game
                    </button>
                </div>
            )}

            {isTutorialActive && currentStep && (
                <div className="tutorial-overlay">
                    <div className="tutorial-content">
                        <h2>{currentStep.title}</h2>
                        <p>{currentStep.instruction}</p>
                        <div className="tutorial-progress">
                            Step {currentStepIndex + 1} of {totalSteps}
                        </div>
                        {currentStep.isFinal ? (
                            <button className="start-game-btn" onClick={handleTutorialComplete}>
                                Let's Play!
                            </button>
                        ) : (
                            <button className="skip-tutorial-btn" onClick={skipTutorial}>
                                Skip Tutorial
                            </button>
                        )}
                    </div>
                </div>
            )}

            {!roomId && !isTutorialActive && (
                <RoomControls
                    rooms={rooms}
                    roomStates={roomStates}
                    onCreateRoom={handleCreateRoom}
                    onJoinRoom={handleJoinRoom}
                    skin={skin}
                />
            )}

            {(roomId || isTutorialActive) && (
                <div className="game-content">
                    <FiguresPanel
                        score={score}
                        figures={myFigures}
                        playerColor={playersList.find(p => p.id === SocketManager.getSocket()?.id)?.color || personalColor || 'var(--player-color)'}
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
                            theme={theme}
                            skin={skin}
                            clearingDetails={clearingDetails}
                            onAnimationComplete={() => setClearingDetails(null)}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerCancel}
                            tutorialHintPixels={isTutorialActive ? currentStep?.hintPixels : null}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameBoard;
