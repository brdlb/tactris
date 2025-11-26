import React from 'react';
import './GameBoard.css';

const GameGrid = ({
    grid,
    roomId,
    boardRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
                ref={boardRef}
                className="game-board"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
            >
                {grid.map((row, y) =>
                    row.map((cell, x) => (
                        <div
                            key={`${x}-${y}`}
                            className="grid-cell"
                            style={{
                                backgroundColor: cell ? (cell.state === 'drawing' ? cell.color : 'var(--occupied-pixel-color)') : 'var(--cell-bg)',
                                touchAction: 'none', // Prevent scrolling and zooming on touch
                            }}
                        />
                    ))
                )}
            </div>
            <div style={{
                fontSize: '0.75rem',
                marginTop: '4px',
                color: 'var(--text-secondary)',
                alignSelf: 'flex-end'
            }}>
                #{roomId}
            </div>
        </div>
    );
};

export default GameGrid;
