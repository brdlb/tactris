import React, { useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import './GameBoard.css';

const GameGrid = ({
    grid,
    roomId,
    boardRef,
    theme,
    clearingDetails,
    onAnimationComplete,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    tutorialHintPixels
}) => {
    const animationsRef = useRef(new Map()); // Key: "x,y", Value: { progress, target, color, state, x, y, tx, ty }
    const requestRef = useRef();
    const styleCacheRef = useRef({ cellBg: '', gridBg: '', occupiedColor: '' });
    const dimensionsRef = useRef({ width: 0, height: 0, dpr: 1 });

    const updateStyles = useCallback(() => {
        const canvas = boardRef.current;
        if (!canvas) return;
        const computedStyle = getComputedStyle(canvas);
        styleCacheRef.current = {
            cellBg: computedStyle.getPropertyValue('--cell-bg').trim() || (document.documentElement.getAttribute('data-theme') === 'dark' ? '#000000' : '#ffffff'),
            gridBg: computedStyle.getPropertyValue('--grid-bg').trim() || '#ccc',
            occupiedColor: computedStyle.getPropertyValue('--occupied-pixel-color').trim() || (document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#000000')
        };
    }, [boardRef, theme]);

    const updateDimensions = useCallback(() => {
        const canvas = boardRef.current;
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const displayWidth = Math.floor(rect.width);
        const displayHeight = Math.floor(rect.height);

        if (canvas.width !== Math.floor(displayWidth * dpr) || canvas.height !== Math.floor(displayHeight * dpr)) {
            canvas.width = Math.floor(displayWidth * dpr);
            canvas.height = Math.floor(displayHeight * dpr);
        }
        dimensionsRef.current = { width: displayWidth, height: displayHeight, dpr };
    }, [boardRef]);

    const draw = useCallback(() => {
        const canvas = boardRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const { width, height, dpr } = dimensionsRef.current;
        const { cellBg, gridBg, occupiedColor } = styleCacheRef.current;

        ctx.save();
        ctx.scale(dpr, dpr);

        const rows = grid.length;
        const cols = grid[0]?.length || 0;

        if (cols === 0) {
            ctx.restore();
            return;
        }

        const cellW = width / cols;
        const cellH = height / rows;

        // Clear and draw grid background
        ctx.fillStyle = gridBg;
        ctx.fillRect(0, 0, width, height);

        // Draw empty cells background
        ctx.fillStyle = cellBg;
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                ctx.fillRect(x * cellW + 0.5, y * cellH + 0.5, cellW - 1, cellH - 1);
            }
        }

        // Helper to interpolate between two RGB colors
        const lerpColor = (color1, color2, t) => {
            const parse = (s) => (s.match(/\d+/g) || [255, 255, 255]).map(Number);
            const [r1, g1, b1] = parse(color1);
            const [r2, g2, b2] = parse(color2);
            const r = Math.round(r1 + (r2 - r1) * t);
            const g = Math.round(g1 + (g2 - g1) * t);
            const b = Math.round(b1 + (b2 - b1) * t);
            return `rgb(${r}, ${g}, ${b})`;
        };

        animationsRef.current.forEach((anim) => {
            if (anim.progress <= 0 && anim.target === 0) return;

            const px = anim.x * cellW;
            const py = anim.y * cellH;
            const pw = cellW - 1;
            const ph = cellH - 1;

            ctx.save();

            if (anim.state === 'drawing') {
                // Fade from white to user color for drawing state
                ctx.fillStyle = lerpColor('rgb(255, 255, 255)', anim.color, anim.progress);
                ctx.globalAlpha = 1; // Keep opaque for color transition effect
            } else {
                ctx.fillStyle = occupiedColor;
                ctx.globalAlpha = anim.progress; // Alpha for solid blocks
            }

            const centerX = px + cellW / 2;
            const centerY = py + cellH / 2;

            ctx.translate(centerX, centerY);
            const currentScale = anim.target === 0 ? anim.progress : 1;
            ctx.scale(currentScale, currentScale);
            ctx.translate(-centerX, -centerY);

            ctx.fillRect(px + 0.5, py + 0.5, pw, ph);
            ctx.restore();
        });

        // Draw tutorial hints
        if (tutorialHintPixels && tutorialHintPixels.length > 0) {
            ctx.strokeStyle = occupiedColor;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            tutorialHintPixels.forEach(p => {
                const px = p.x * cellW;
                const py = p.y * cellH;
                ctx.strokeRect(px + 2, py + 2, cellW - 4, cellH - 4);
            });
            ctx.setLineDash([]);
        }

        ctx.restore();
    }, [grid, boardRef, tutorialHintPixels]);

    const animate = useCallback(() => {
        let needsUpdate = false;
        const speed = 0.3; // Base speed
        const moveSpeed = 0.2; // Speed for position interpolation

        let anyFading = false;
        let anyShifting = false;

        // Check if we are still in Phase 1 (fading)
        animationsRef.current.forEach((anim) => {
            if (anim.target === 0 && anim.progress > 0) {
                anyFading = true;
            }
        });

        // Trigger Phase 2 if Phase 1 is done
        if (!anyFading && clearingDetails) {
            animationsRef.current.forEach((anim, key) => {
                if (anim.isMoving) {
                    const [finalX, finalY] = key.split(',').map(Number);
                    anim.tx = finalX;
                    anim.ty = finalY;
                    anim.isMoving = false;
                }
            });
        }

        animationsRef.current.forEach((anim, key) => {
            let itemNeedsUpdate = false;

            // Progress interpolation
            const pDiff = anim.target - anim.progress;
            if (Math.abs(pDiff) > 0.001) {
                anim.progress += pDiff * speed;
                itemNeedsUpdate = true;
            } else {
                anim.progress = anim.target;
            }

            // Position interpolation
            const xDiff = anim.tx - anim.x;
            const yDiff = anim.ty - anim.y;
            if (Math.abs(xDiff) > 0.001 || Math.abs(yDiff) > 0.001) {
                anim.x += xDiff * moveSpeed;
                anim.y += yDiff * moveSpeed;
                itemNeedsUpdate = true;
                anyShifting = true;
            } else {
                anim.x = anim.tx;
                anim.y = anim.ty;
            }

            if (itemNeedsUpdate) {
                needsUpdate = true;
            } else if (anim.target === 0 && anim.progress === 0) {
                animationsRef.current.delete(key);
            }
        });

        if (needsUpdate || animationsRef.current.size > 0) {
            draw();
        }

        // Signal completion only when everything is stable
        if (clearingDetails && !needsUpdate && !anyFading && !anyShifting) {
            if (onAnimationComplete) onAnimationComplete();
        }

        requestRef.current = requestAnimationFrame(animate);
    }, [draw, clearingDetails, onAnimationComplete]);

    useEffect(() => {
        updateStyles();
        updateDimensions();
        draw();
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [animate, updateStyles, updateDimensions, draw]);

    useEffect(() => {
        const rows = grid.length;
        const cols = grid[0]?.length || 0;

        const nextAnimations = new Map();
        const currentAnimationKeys = new Set(animationsRef.current.keys());

        // Helper to find which block this is after a shift
        const getMove = (targetX, targetY) => {
            if (!clearingDetails || !clearingDetails.movingBlocks) return null;
            return clearingDetails.movingBlocks.find(m => m.toX === targetX && m.toY === targetY);
        };

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const cell = grid[y][x];
                const key = `${x},${y}`;
                if (cell) {
                    const move = getMove(x, y);
                    const sourceKey = move ? `${move.fromX},${move.fromY}` : key;

                    if (animationsRef.current.has(sourceKey)) {
                        const anim = animationsRef.current.get(sourceKey);
                        anim.target = 1;
                        anim.color = cell.color;
                        anim.state = cell.state;

                        if (move) {
                            // Phase 1: Keep it at the source position for now
                            anim.x = move.fromX;
                            anim.y = move.fromY;
                            anim.tx = move.fromX;
                            anim.ty = move.fromY;
                            anim.isMoving = true; // Mark for Phase 2
                        } else {
                            anim.tx = x;
                            anim.ty = y;
                        }

                        nextAnimations.set(key, anim);
                        currentAnimationKeys.delete(sourceKey);
                    } else {
                        // New block (e.g. just placed or drawing)
                        nextAnimations.set(key, {
                            x, y, tx: x, ty: y,
                            progress: 0,
                            target: 1,
                            color: cell.color,
                            state: cell.state
                        });
                    }
                }
            }
        }

        // Handle remaining blocks (fading out)
        currentAnimationKeys.forEach(oldKey => {
            const anim = animationsRef.current.get(oldKey);
            if (anim) {
                anim.target = 0;
                const clearingKey = oldKey.startsWith('clearing-') ? oldKey : `clearing-${oldKey}-${Date.now()}`;
                nextAnimations.set(clearingKey, anim);
            }
        });

        animationsRef.current = nextAnimations;
    }, [grid, clearingDetails]);

    useEffect(() => {
        const handleResize = () => {
            updateDimensions();
            draw();
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [draw, updateDimensions]);

    useEffect(() => {
        updateStyles();
    }, [updateStyles]);

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
