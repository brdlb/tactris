import React, { useLayoutEffect, useRef, useCallback } from 'react';

const RoomPreview = ({ grid }) => {
    const canvasRef = useRef(null);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        const displayWidth = Math.floor(rect.width);
        const displayHeight = Math.floor(rect.height);

        if (canvas.width !== Math.floor(displayWidth * dpr) || canvas.height !== Math.floor(displayHeight * dpr)) {
            canvas.width = Math.floor(displayWidth * dpr);
            canvas.height = Math.floor(displayHeight * dpr);
        }

        ctx.save();
        ctx.scale(dpr, dpr);

        const computedStyle = getComputedStyle(canvas);
        const cellBg = computedStyle.getPropertyValue('--cell-bg').trim() || '#ffffff';
        const gridBg = computedStyle.getPropertyValue('--grid-bg').trim() || '#ccc';
        const occupiedColor = computedStyle.getPropertyValue('--occupied-pixel-color').trim() || '#000000';

        const rows = grid.length;
        const cols = grid[0]?.length || 0;

        if (cols === 0) {
            ctx.restore();
            return;
        }

        const cellW = displayWidth / cols;
        const cellH = displayHeight / rows;

        // Draw background
        ctx.fillStyle = gridBg;
        ctx.fillRect(0, 0, displayWidth, displayHeight);

        // Draw cells
        grid.forEach((row, y) => {
            row.forEach((cell, x) => {
                const px = x * cellW;
                const py = y * cellH;
                const pw = cellW - 0.5; // Smaller gap for lobby preview
                const ph = cellH - 0.5;

                if (cell) {
                    if (cell.state === 'drawing') {
                        ctx.fillStyle = cell.color;
                    } else {
                        ctx.fillStyle = occupiedColor;
                    }
                } else {
                    ctx.fillStyle = cellBg;
                }

                ctx.fillRect(px + 0.25, py + 0.25, pw, ph);
            });
        });

        ctx.restore();
    }, [grid]);

    useLayoutEffect(() => {
        draw();
    }, [draw]);

    return (
        <canvas
            ref={canvasRef}
            className="lobby-room-canvas"
            style={{
                width: '100%',
                height: '100%',
                display: 'block'
            }}
        />
    );
};

export default RoomPreview;
