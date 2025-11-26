import React from 'react';

const ScoreBoard = ({ score }) => {
    return (
        <div className="score-board">
            <div className="score-display">
                Score: <span className="score-value">{score}</span>
            </div>
        </div>
    );
};

export default ScoreBoard;