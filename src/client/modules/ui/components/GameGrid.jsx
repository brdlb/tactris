import React, { useEffect, useLayoutEffect, useCallback } from 'react';
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

    const draw = useCallback(() => {
        const canvas = boardRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        // Ensure the canvas buffer size matches its displayed size * DPR for crispness
        const displayWidth = Math.floor(rect.width);
        const displayHeight = Math.floor(rect.height);

        if (canvas.width !== Math.floor(displayWidth * dpr) || canvas.height !== Math.floor(displayHeight * dpr)) {
            canvas.width = Math.floor(displayWidth * dpr);
            canvas.height = Math.floor(displayHeight * dpr);
        }

        ctx.save();
        ctx.scale(dpr, dpr);

        // Get styles from CSS variables
        const computedStyle = getComputedStyle(canvas);
        const cellBg = computedStyle.getPropertyValue('--cell-bg').trim() || (document.documentElement.getAttribute('data-theme') === 'dark' ? '#000000' : '#ffffff');
        const gridBg = computedStyle.getPropertyValue('--grid-bg').trim() || '#ccc';
        const occupiedColor = computedStyle.getPropertyValue('--occupied-pixel-color').trim() || (document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#000000');

        const rows = grid.length;
        const cols = grid[0]?.length || 0;

        if (cols === 0) {
            ctx.restore();
            return;
        }

        const cellW = displayWidth / cols;
        const cellH = displayHeight / rows;

        // Clear and draw grid background
        ctx.fillStyle = gridBg;
        ctx.fillRect(0, 0, displayWidth, displayHeight);

        // Draw cells
        grid.forEach((row, y) => {
            row.forEach((cell, x) => {
                const px = x * cellW;
                const py = y * cellH;
                const pw = cellW - 1; // 1px gap effect
                const ph = cellH - 1;

                if (cell) {
                    if (cell.state === 'drawing') {
                        ctx.fillStyle = cell.color;
                    } else {
                        ctx.fillStyle = occupiedColor;
                    }
                } else {
                    ctx.fillStyle = cellBg;
                }

                // Add 0.5 offset to draw sharp 1px lines/gaps if needed, 
                // but here filling rects with 1px difference works well
                ctx.fillRect(px + 0.5, py + 0.5, pw, ph);
            });
        });

        ctx.restore();
    }, [grid, boardRef]);

    useLayoutEffect(() => {
        draw();
    }, [draw]);

    useEffect(() => {
        const handleResize = () => draw();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [draw]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <canvas
                ref={boardRef}
                className="game-board"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                style={{ touchAction: 'none' }}
            />
        </div>
    );
};

export default GameGrid;
