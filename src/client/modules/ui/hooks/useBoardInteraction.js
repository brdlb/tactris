import { useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import SocketManager from '../../network/SocketManager';
import { checkMatch } from '../../../utils/figureUtils';

const MIN_PIXELS_FOR_FIGURE = 4;

const useBoardInteraction = ({
    boardRef,
    gridRef,
    roomIdRef,
    gameOver,
    isTutorialActive,
    currentStep,
    nextStep,
    myFigures,
    roomRotateableRef,
    setGrid,
    setClearingDetails,
    personalColor,
    selectedPixelsRef // Pass the ref from outside
}) => {
    const selectedPixels = selectedPixelsRef || useRef([]);
    const isDrawing = useRef(false);
    const boardMetrics = useRef({ rect: null, cellWidth: 0, cellHeight: 0, lastUpdate: 0 });
    const activePointerId = useRef(null);
    const lastPointerCell = useRef(null);
    const pointerCaptureTarget = useRef(null);
    const isResizing = useRef(false);

    const userColorRef = useRef(personalColor);
    useEffect(() => {
        userColorRef.current = personalColor;
    }, [personalColor]);

    const updateBoardMetrics = useCallback((forceUpdate = false) => {
        if (!boardRef.current) return;

        const rect = boardRef.current.getBoundingClientRect();
        const columns = gridRef.current[0]?.length || 1;
        const rows = gridRef.current.length || 1;
        const now = Date.now();

        const shouldUpdate = forceUpdate ||
            !boardMetrics.current.rect ||
            isResizing.current ||
            now - boardMetrics.current.lastUpdate > 100;

        if (shouldUpdate) {
            boardMetrics.current = {
                rect,
                cellWidth: columns ? rect.width / columns : 0,
                cellHeight: rows ? rect.height / rows : 0,
                lastUpdate: now
            };
        }
    }, [boardRef, gridRef]);

    const getGridCoordinatesFromPointer = useCallback((event) => {
        if (!boardRef.current) return null;

        updateBoardMetrics(true);

        const { rect, cellWidth, cellHeight } = boardMetrics.current;

        if (!rect || !cellWidth || !cellHeight) return null;

        const x = Math.floor((event.clientX - rect.left) / cellWidth);
        const y = Math.floor((event.clientY - rect.top) / cellHeight);

        if (Number.isNaN(x) || Number.isNaN(y)) return null;

        const columns = gridRef.current[0]?.length || 1;
        const rows = gridRef.current.length || 1;

        return {
            x: Math.min(Math.max(x, 0), columns - 1),
            y: Math.min(Math.max(y, 0), rows - 1)
        };
    }, [boardRef, gridRef, updateBoardMetrics]);

    const removeFirstPixel = useCallback(() => {
        if (selectedPixels.current.length === 0) return;

        const removedPixel = selectedPixels.current.shift();
        let newGrid = [...gridRef.current];
        if (newGrid[removedPixel.y]) {
            newGrid[removedPixel.y] = [...newGrid[removedPixel.y]];
            newGrid[removedPixel.y][removedPixel.x] = null;
        }

        gridRef.current = newGrid;
        setGrid(newGrid);
    }, [gridRef, setGrid]);

    const clearAllSelectedPixels = useCallback(() => {
        if (selectedPixels.current.length === 0) return;

        let newGrid = [...gridRef.current];
        selectedPixels.current.forEach(p => {
            if (newGrid[p.y]) {
                newGrid[p.y] = [...newGrid[p.y]];
                newGrid[p.y][p.x] = null;
            }
        });

        selectedPixels.current = [];
        gridRef.current = newGrid;
        setGrid(newGrid);

        if (roomIdRef.current && !isTutorialActive) {
            SocketManager.updateDrawing(roomIdRef.current, []);
        }
    }, [gridRef, setGrid, roomIdRef, isTutorialActive]);

    const handleInteraction = useCallback((x, y) => {
        if ((!roomIdRef.current && !isTutorialActive) || gameOver) return;

        if (isTutorialActive && currentStep?.hintPixels) {
            const isInsideHint = currentStep.hintPixels.some(p => p.x === x && p.y === y);
            if (!isInsideHint) return;
        }

        const targetCell = gridRef.current[y]?.[x];
        if (targetCell !== null && targetCell !== undefined) {
            if (targetCell.state !== 'drawing') return;
            if (selectedPixels.current.some(p => p.x === x && p.y === y)) return;
        }

        const newPixel = { x, y };
        selectedPixels.current.push(newPixel);

        let newGrid = [...gridRef.current];
        newGrid[y] = [...newGrid[y]];
        newGrid[y][x] = {
            playerId: SocketManager.getSocket()?.id,
            color: userColorRef.current,
            state: 'drawing'
        };

        if (selectedPixels.current.length >= MIN_PIXELS_FOR_FIGURE) {
            const matchedFigureIndex = checkMatch(selectedPixels.current, myFigures, roomRotateableRef.current);
            if (matchedFigureIndex === -1) {
                removeFirstPixel();
            }
        }

        gridRef.current = newGrid;
        setGrid(newGrid);

        if (selectedPixels.current.length > 0 && !isTutorialActive && roomIdRef.current) {
            SocketManager.updateDrawing(roomIdRef.current, selectedPixels.current);
        }
    }, [roomIdRef, isTutorialActive, gameOver, currentStep, gridRef, myFigures, roomRotateableRef, removeFirstPixel, setGrid]);

    const finalizeDrawing = useCallback(() => {
        if (selectedPixels.current.length >= MIN_PIXELS_FOR_FIGURE && (roomIdRef.current || isTutorialActive) && !gameOver) {
            const matchedFigureIndex = checkMatch(selectedPixels.current, myFigures, roomRotateableRef.current);
            if (matchedFigureIndex !== -1) {
                if (isTutorialActive) {
                    let newGrid = [...gridRef.current];
                    selectedPixels.current.forEach(p => {
                        newGrid[p.y] = [...newGrid[p.y]];
                        newGrid[p.y][p.x] = {
                            playerId: 'tutorial',
                            color: userColorRef.current,
                            state: 'solid'
                        };
                    });

                    let clearedHorizontal = [];
                    let clearedVertical = [];

                    for (let y = 0; y < 10; y++) {
                        if (newGrid[y].every(cell => cell !== null)) clearedHorizontal.push(y);
                    }

                    for (let x = 0; x < 10; x++) {
                        let full = true;
                        for (let y = 0; y < 10; y++) {
                            if (newGrid[y][x] === null) {
                                full = false;
                                break;
                            }
                        }
                        if (full) clearedVertical.push(x);
                    }

                    if (clearedHorizontal.length > 0 || clearedVertical.length > 0) {
                        setClearingDetails({
                            horizontal: clearedHorizontal,
                            vertical: clearedVertical,
                            playerId: 'tutorial'
                        });

                        setTimeout(() => {
                            let gridAfterClear = newGrid.map(row => [...row]);
                            clearedHorizontal.forEach(y => { gridAfterClear[y] = Array(10).fill(null); });
                            clearedVertical.forEach(x => {
                                for (let y = 0; y < 10; y++) gridAfterClear[y][x] = null;
                            });
                            gridRef.current = gridAfterClear;
                            setGrid(gridAfterClear);
                            setClearingDetails(null);
                            nextStep();
                        }, 500);
                    } else {
                        gridRef.current = newGrid;
                        setGrid(newGrid);
                        nextStep();
                    }
                    selectedPixels.current = [];
                } else {
                    SocketManager.placeFigure(roomIdRef.current, selectedPixels.current);
                    selectedPixels.current = [];
                }
            } else {
                clearAllSelectedPixels();
            }
        }

        isDrawing.current = false;

        if (pointerCaptureTarget.current && activePointerId.current !== null) {
            try {
                pointerCaptureTarget.current.releasePointerCapture(activePointerId.current);
            } catch (e) { }
        }

        activePointerId.current = null;
        lastPointerCell.current = null;
        pointerCaptureTarget.current = null;
    }, [gameOver, myFigures, roomIdRef, isTutorialActive, gridRef, roomRotateableRef, setGrid, setClearingDetails, nextStep, clearAllSelectedPixels]);

    useEffect(() => {
        const handleWindowPointerEnd = () => finalizeDrawing();
        window.addEventListener('pointerup', handleWindowPointerEnd);
        window.addEventListener('pointercancel', handleWindowPointerEnd);
        return () => {
            window.removeEventListener('pointerup', handleWindowPointerEnd);
            window.removeEventListener('pointercancel', handleWindowPointerEnd);
        };
    }, [finalizeDrawing]);

    useLayoutEffect(() => {
        if (!boardRef.current) return;
        updateBoardMetrics(true);
        const handleResizeStart = () => { isResizing.current = true; };
        const handleResize = () => {
            isResizing.current = true;
            updateBoardMetrics(true);
            clearTimeout(handleResize.timeoutId);
            handleResize.timeoutId = setTimeout(() => {
                isResizing.current = false;
                updateBoardMetrics(true);
            }, 150);
        };
        window.addEventListener('resize', handleResizeStart, { passive: true });
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        let observer;
        if (typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(() => {
                isResizing.current = true;
                updateBoardMetrics(true);
            });
            observer.observe(boardRef.current);
        }

        return () => {
            window.removeEventListener('resize', handleResizeStart);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
            if (observer) observer.disconnect();
        };
    }, [boardRef, updateBoardMetrics]);

    const handlePointerDown = useCallback((event) => {
        if (gameOver || (!roomIdRef.current && !isTutorialActive)) return;
        if (activePointerId.current !== null && activePointerId.current !== event.pointerId) return;

        const coordinates = getGridCoordinatesFromPointer(event);
        if (!coordinates) return;

        event.preventDefault();
        activePointerId.current = event.pointerId;
        isDrawing.current = true;
        lastPointerCell.current = coordinates;

        if (event.currentTarget?.setPointerCapture) {
            event.currentTarget.setPointerCapture(event.pointerId);
            pointerCaptureTarget.current = event.currentTarget;
        }

        handleInteraction(coordinates.x, coordinates.y);
    }, [gameOver, roomIdRef, isTutorialActive, getGridCoordinatesFromPointer, handleInteraction]);

    const handlePointerMove = useCallback((event) => {
        if (!isDrawing.current || gameOver) return;
        if (activePointerId.current !== event.pointerId) return;

        const coordinates = getGridCoordinatesFromPointer(event);
        if (!coordinates) return;

        if (lastPointerCell.current && lastPointerCell.current.x === coordinates.x && lastPointerCell.current.y === coordinates.y) return;

        lastPointerCell.current = coordinates;
        event.preventDefault();
        handleInteraction(coordinates.x, coordinates.y);
    }, [gameOver, getGridCoordinatesFromPointer, handleInteraction]);

    const handlePointerUp = useCallback((event) => {
        if (activePointerId.current !== event.pointerId) return;
        event.preventDefault();
        finalizeDrawing();
    }, [finalizeDrawing]);

    const handlePointerCancel = useCallback((event) => {
        if (activePointerId.current !== event.pointerId) return;
        finalizeDrawing();
    }, [finalizeDrawing]);

    return {
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handlePointerCancel,
        selectedPixelsRef: selectedPixels
    };
};

export default useBoardInteraction;
