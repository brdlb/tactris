import { useState, useRef, useEffect } from 'react';
import SocketManager from '../../network/SocketManager';

const FIGURES = {
    I: [[0, 0], [1, 0], [2, 0], [3, 0]],
    O: [[0, 0], [1, 0], [0, 1], [1, 1]],
    T: [[0, 0], [1, 0], [2, 0], [1, 1]],
    S: [[1, 0], [2, 0], [0, 1], [1, 1]],
    Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
    J: [[1, 0], [1, 1], [1, 2], [0, 2]],
    L: [[0, 0], [0, 1], [0, 2], [1, 2]]
};

export const useDrawingInteraction = (gridRef, roomIdRef, gameOver, myFigures) => {
    const selectedPixels = useRef([]);
    const isDrawing = useRef(false);
    const drawMode = useRef(1); // 1 for placing, 0 for removing

    // Helper to check if pixels match any of the allowed figures (subset check)
    const checkMatch = (pixels, allowedTypes) => {
        if (pixels.length === 0) return true;

        // Normalize pixels to (0,0)
        const minX = Math.min(...pixels.map(p => p.x));
        const minY = Math.min(...pixels.map(p => p.y));
        const normalized = pixels.map(p => ({ x: p.x - minX, y: p.y - minY }));

        for (const type of allowedTypes) {
            const figure = FIGURES[type];
            if (!figure) continue;

            // Check all 4 rotations
            let currentShape = figure;
            for (let r = 0; r < 4; r++) {
                // Check if normalized pixels are a subset of currentShape
                const isSubset = normalized.every(p =>
                    currentShape.some(fp => fp[0] === p.x && fp[1] === p.y)
                );

                if (isSubset) return true;

                // Rotate shape 90 degrees
                // (x, y) -> (-y, x)
                // Then normalize again to keep it positive
                const rotated = currentShape.map(([x, y]) => [-y, x]);
                const rMinX = Math.min(...rotated.map(p => p[0]));
                const rMinY = Math.min(...rotated.map(p => p[1]));
                currentShape = rotated.map(([x, y]) => [x - rMinX, y - rMinY]);
            }
        }
        return false;
    };

    const handleInteraction = (x, y, setGrid) => {
        if (!roomIdRef.current || gameOver) return;

        const socketId = SocketManager.getSocket().id;
        let newGrid = [...gridRef.current];

        const ensureRow = (rowIndex) => {
            if (newGrid[rowIndex] === gridRef.current[rowIndex]) {
                newGrid[rowIndex] = [...gridRef.current[rowIndex]];
            }
        };

        if (drawMode.current === 1) {
            // Check if already selected to avoid duplicates
            if (selectedPixels.current.some(p => p.x === x && p.y === y)) return;

            const newPixel = { x, y };
            const nextPixels = [...selectedPixels.current, newPixel];

            // Check validity
            if (!checkMatch(nextPixels, myFigures)) {
                // Remove earliest
                const removed = selectedPixels.current.shift(); // Remove from tracking
                if (removed) {
                    ensureRow(removed.y);
                    newGrid[removed.y][removed.x] = null;
                    SocketManager.placePixel(roomIdRef.current, 0, removed);
                }
            }

            selectedPixels.current.push(newPixel);

            ensureRow(y);
            newGrid[y][x] = { playerId: socketId, color: 'red' };
            SocketManager.placePixel(roomIdRef.current, 1, newPixel);

        } else {
            // Removing
            if (selectedPixels.current.some(p => p.x === x && p.y === y)) {
                selectedPixels.current = selectedPixels.current.filter(p => p.x !== x || p.y !== y);

                ensureRow(y);
                newGrid[y][x] = null;
                SocketManager.placePixel(roomIdRef.current, 0, { x, y });
            } else if (gridRef.current[y][x]) {
                // It might be a pixel we placed but lost track of, or just clearing.
                ensureRow(y);
                newGrid[y][x] = null;
                SocketManager.placePixel(roomIdRef.current, 0, { x, y });
            }
        }

        gridRef.current = newGrid;
        setGrid(newGrid);
    };

    const handleMouseDown = (x, y, setGrid, e) => {
        if (e.button !== 0) return;
        e.preventDefault();

        if (!roomIdRef.current || gameOver) return;

        isDrawing.current = true;

        const currentCell = gridRef.current[y][x];
        const targetStatus = currentCell ? 0 : 1;
        drawMode.current = targetStatus;

        handleInteraction(x, y, setGrid);
    };

    const handleMouseEnter = (x, y, setGrid) => {
        if (!isDrawing.current || !roomIdRef.current || gameOver) return;

        // Only interact if the cell state matches what we want to change
        // e.g. if adding, only add to empty cells.
        const currentCell = gridRef.current[y][x];
        const currentStatus = currentCell ? 1 : 0;

        if (currentStatus !== drawMode.current) {
            handleInteraction(x, y, setGrid);
        }
    };

    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isDrawing.current && drawMode.current === 1) {
                if (selectedPixels.current.length >= 4) {
                    // Send the figure to the server
                    if (roomIdRef.current && !gameOver) {
                        SocketManager.placeFigure(roomIdRef.current, selectedPixels.current);
                    }
                    selectedPixels.current = [];
                }
            }
            isDrawing.current = false;
        };

        const handleGlobalTouchEnd = (e) => {
            e.preventDefault();
            if (isDrawing.current && drawMode.current === 1) {
                if (selectedPixels.current.length >= 4) {
                    // Send the figure to the server
                    if (roomIdRef.current && !gameOver) {
                        SocketManager.placeFigure(roomIdRef.current, selectedPixels.current);
                    }
                    selectedPixels.current = [];
                }
            }
            isDrawing.current = false;
        };

        window.addEventListener('mouseup', handleGlobalMouseUp);
        window.addEventListener('touchend', handleGlobalTouchEnd);
        
        return () => {
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            window.removeEventListener('touchend', handleGlobalTouchEnd);
        };
    }, [gameOver]);

    // Touch event handlers for buttons
    const handleCreateRoomTouch = (e) => {
        e.preventDefault();
        // This will be passed from parent component
    };

    const handleJoinRoomTouch = (e, roomId) => {
        e.preventDefault();
        // This will be passed from parent component
    };

    return {
        handleMouseDown,
        handleMouseEnter,
        handleCreateRoomTouch,
        handleJoinRoomTouch,
        handleInteraction,
        selectedPixels
    };
};