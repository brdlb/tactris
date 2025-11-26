import React from 'react';

const GameOverOverlay = () => {
    return (
        <div className="game-over-overlay">
            <h2>Game Over!</h2>
            <p>No more moves possible.</p>
            <button 
                onClick={() => window.location.reload()}
                className="restart-btn"
            >
                Play Again
            </button>
        </div>
    );
};

export default GameOverOverlay;