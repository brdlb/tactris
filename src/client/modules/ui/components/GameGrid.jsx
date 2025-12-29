import React, { useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import { getRenderer } from '../renderers';
import './GameBoard.css';

const GameGrid = ({
    grid,
    roomId,
    boardRef,
    theme,
    skin = 'classic',
    clearingDetails,
    onAnimationComplete,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    tutorialHintPixels
}) => {
    const renderer = useMemo(() => getRenderer(skin), [skin]);
    const requestRef = useRef();
    const dimensionsRef = useRef({ width: 0, height: 0, dpr: 1 });

    const updateStyles = useCallback(() => {
        const canvas = boardRef.current;
        if (!canvas) return;
        const computedStyle = getComputedStyle(canvas);
        renderer.updateStyles(computedStyle);
    }, [boardRef, renderer, theme]);

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

        renderer.render(ctx, grid, dimensionsRef.current, tutorialHintPixels);
    }, [grid, renderer, tutorialHintPixels, boardRef]);

    const animate = useCallback(() => {
        const { needsUpdate, isStable } = renderer.animate(clearingDetails);

        if (needsUpdate) {
            draw();
        }

        // Signal completion only when everything is stable
        if (clearingDetails && isStable) {
            if (onAnimationComplete) onAnimationComplete();
        }

        requestRef.current = requestAnimationFrame(animate);
    }, [draw, clearingDetails, onAnimationComplete, renderer]);

    useEffect(() => {
        updateStyles();
        updateDimensions();
        draw();
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [animate, updateStyles, updateDimensions, draw]);

    useEffect(() => {
        renderer.updateAnimationState(grid, clearingDetails);
    }, [grid, clearingDetails, renderer]);

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
