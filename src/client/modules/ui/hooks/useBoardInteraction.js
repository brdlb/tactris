import { useRef, useCallback, useEffect } from 'react';
import SocketManager from '../../network/SocketManager';
import { checkMatch } from '../../../utils/figureUtils';
import useCanvasCoords from './useCanvasCoords';
import { checkLineClears, applyLineClears } from '../../../utils/gridUtils';

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
    selectedPixelsRef
}) => {
    const selectedPixels = selectedPixelsRef || useRef([]);
    const isDrawing = useRef(false);
    const activePointerId = useRef(null);
    const lastPointerCell = useRef(null);
    const pointerCaptureTarget = useRef(null);

    const { getGridCoordinates } = useCanvasCoords(boardRef, gridRef);

    const userColorRef = useRef(personalColor);
    useEffect(() => {
        userColorRef.current = personalColor;
    }, [personalColor]);

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

                    const { clearedHorizontal, clearedVertical } = checkLineClears(newGrid);

                    if (clearedHorizontal.length > 0 || clearedVertical.length > 0) {
                        setClearingDetails({
                            horizontal: clearedHorizontal,
                            vertical: clearedVertical,
                            playerId: 'tutorial'
                        });

                        setTimeout(() => {
                            const gridAfterClear = applyLineClears(newGrid, clearedHorizontal, clearedVertical);
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

    const handlePointerDown = useCallback((event) => {
        if (gameOver || (!roomIdRef.current && !isTutorialActive)) return;
        if (activePointerId.current !== null && activePointerId.current !== event.pointerId) return;

        const coordinates = getGridCoordinates(event);
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
    }, [gameOver, roomIdRef, isTutorialActive, getGridCoordinates, handleInteraction]);

    const handlePointerMove = useCallback((event) => {
        if (!isDrawing.current || gameOver) return;
        if (activePointerId.current !== event.pointerId) return;

        const coordinates = getGridCoordinates(event);
        if (!coordinates) return;

        if (lastPointerCell.current && lastPointerCell.current.x === coordinates.x && lastPointerCell.current.y === coordinates.y) return;

        lastPointerCell.current = coordinates;
        event.preventDefault();
        handleInteraction(coordinates.x, coordinates.y);
    }, [gameOver, getGridCoordinates, handleInteraction]);

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

