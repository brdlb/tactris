import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import SocketManager from '../../network/SocketManager';
import { getUserColor } from '../../../utils/colorUtils';
import { FIGURES } from '../../../constants/figures';

const useGameLogic = (boardRefOverride = null) => {
    const [grid, setGrid] = useState(() => Array(10).fill(null).map(() => Array(10).fill(null)));
    const gridRef = useRef(grid);
    const [roomId, setRoomId] = useState(null);
    const roomIdRef = useRef(null);
    const [rooms, setRooms] = useState([]);
    const [myFigures, setMyFigures] = useState([]);
    const [score, setScore] = useState(0);

    const [gameOver, setGameOver] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

    const selectedPixels = useRef([]); // Queue of {x, y} to track order
    const isDrawing = useRef(false);
    const drawMode = useRef(1); // 1 for placing, 0 for removing
    const userColor = useRef(getUserColor()); // Personal color for this user
    const internalBoardRef = useRef(null);
    const boardRef = boardRefOverride ?? internalBoardRef;
    const boardMetrics = useRef({ rect: null, cellWidth: 0, cellHeight: 0 });
    const activePointerId = useRef(null);
    const lastPointerCell = useRef(null);
    const pointerCaptureTarget = useRef(null);

    // Apply theme to document
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        // Reset body styles for full screen layout
        document.body.style.margin = '0';
        document.body.style.overflow = 'hidden';
        document.body.style.backgroundColor = '#f0f0f0';

        const socket = SocketManager.connect();

        const updateGameState = (state) => {
            setGrid(state.grid);
            gridRef.current = state.grid;
            const myPlayer = state.players && state.players[socket.id];
            if (myPlayer) {
                if (myPlayer.figures) setMyFigures(myPlayer.figures);
                if (myPlayer.score !== undefined) setScore(myPlayer.score);
            }
            if (state.gameOver !== undefined) {
                setGameOver(state.gameOver);
            }
        };

        socket.on('room_created', ({ roomId, state }) => {
            setRoomId(roomId);
            roomIdRef.current = roomId;
            updateGameState(state);
            selectedPixels.current = []; // Reset selection on new game
            setGameOver(false);
            window.history.pushState({}, '', `?room=${roomId}`);
        });

        socket.on('room_joined', ({ roomId, state }) => {
            setRoomId(roomId);
            roomIdRef.current = roomId;
            updateGameState(state);
            selectedPixels.current = [];
            setGameOver(false);
            window.history.pushState({}, '', `?room=${roomId}`);
        });

        socket.on('game_update', (state) => {
            updateGameState(state);
        });

        socket.on('game_over', () => {
            setGameOver(true);
        });

        socket.on('rooms_list', (roomList) => {
            setRooms(roomList);
        });

        socket.on('error', (message) => {
            if (message === 'Invalid move') return;
            alert(message);
            if (message === 'Room not found') {
                // Clear the invalid room from URL
                window.history.pushState({}, '', window.location.pathname);
            }
        });

        // Request initial list
        SocketManager.getRooms();

        // Check for room in URL
        const urlParams = new URLSearchParams(window.location.search);
        const initialRoomId = urlParams.get('room');
        if (initialRoomId) {
            SocketManager.joinRoom(initialRoomId, userColor.current);
        }

        return () => {
            socket.off('room_created');
            socket.off('room_joined');
            socket.off('game_update');
            socket.off('game_over');
            socket.off('rooms_list');
            socket.off('error');
            // Cleanup styles
            document.body.style.margin = '';
            document.body.style.overflow = '';
            document.body.style.backgroundColor = '';
        };
    }, []);

    const updateBoardMetrics = useCallback(() => {
        if (!boardRef.current) return;
        const rect = boardRef.current.getBoundingClientRect();
        const columns = gridRef.current[0]?.length || 1;
        const rows = gridRef.current.length || 1;
        boardMetrics.current = {
            rect,
            cellWidth: columns ? rect.width / columns : 0,
            cellHeight: rows ? rect.height / rows : 0
        };
    }, [boardRef]);

    const getGridCoordinatesFromPointer = useCallback((event) => {
        if (!boardRef.current) return null;

        if (!boardMetrics.current.rect) {
            updateBoardMetrics();
        }

        const { rect, cellWidth, cellHeight } = boardMetrics.current;

        if (!rect || !cellWidth || !cellHeight) {
            return null;
        }

        const x = Math.floor((event.clientX - rect.left) / cellWidth);
        const y = Math.floor((event.clientY - rect.top) / cellHeight);

        if (Number.isNaN(x) || Number.isNaN(y)) {
            return null;
        }

        const columns = gridRef.current[0]?.length || 1;
        const rows = gridRef.current.length || 1;

        return {
            x: Math.min(Math.max(x, 0), columns - 1),
            y: Math.min(Math.max(y, 0), rows - 1)
        };
    }, [boardRef, updateBoardMetrics]);

    useLayoutEffect(() => {
        if (!boardRef.current) return;

        updateBoardMetrics();

        const handleResize = () => updateBoardMetrics();

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        let observer;
        if (typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(() => updateBoardMetrics());
            observer.observe(boardRef.current);
        }

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
            if (observer) {
                observer.disconnect();
            }
        };
    }, [boardRef, updateBoardMetrics]);

    const finalizeDrawing = useCallback(() => {
        if (isDrawing.current && drawMode.current === 1) {
            if (selectedPixels.current.length >= 4 && roomIdRef.current && !gameOver) {
                SocketManager.placeFigure(roomIdRef.current, selectedPixels.current);
            }
        }

        selectedPixels.current = [];
        isDrawing.current = false;

        if (pointerCaptureTarget.current && activePointerId.current !== null) {
            const target = pointerCaptureTarget.current;
            if (typeof target.releasePointerCapture === 'function') {
                try {
                    target.releasePointerCapture(activePointerId.current);
                } catch (error) {
                    // Ignore release errors (e.g., target already unmounted)
                }
            }
        }

        activePointerId.current = null;
        lastPointerCell.current = null;
        pointerCaptureTarget.current = null;
    }, [gameOver]);

    useEffect(() => {
        const handleWindowPointerEnd = (event) => {
            if (activePointerId.current !== null && event.pointerId === activePointerId.current) {
                finalizeDrawing();
            }
        };

        window.addEventListener('pointerup', handleWindowPointerEnd);
        window.addEventListener('pointercancel', handleWindowPointerEnd);

        return () => {
            window.removeEventListener('pointerup', handleWindowPointerEnd);
            window.removeEventListener('pointercancel', handleWindowPointerEnd);
        };
    }, [finalizeDrawing]);

    const handleCreateRoom = () => {
        SocketManager.createRoom(userColor.current);
    };

    const handleJoinRoom = (id) => {
        SocketManager.joinRoom(id, userColor.current);
    };

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    // Helper to check if pixels match any of the allowed figures (subset check)
    const checkMatch = (pixels, figures) => {
        if (pixels.length === 0) return true;

        // Normalize pixels to (0,0)
        const minX = Math.min(...pixels.map(p => p.x));
        const minY = Math.min(...pixels.map(p => p.y));
        const normalized = pixels.map(p => ({ x: p.x - minX, y: p.y - minY }));

        for (const figure of figures) {
            if (!figure.cells) continue;

            // Check all 4 rotations
            let currentShape = figure.cells;
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

    const handleInteraction = (x, y) => {
        const activeRoomId = roomIdRef.current;
        if (!activeRoomId || gameOver) return;

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
                    SocketManager.placePixel(roomId, 0, removed);
                }
            }

            selectedPixels.current.push(newPixel);

            ensureRow(y);
            newGrid[y][x] = { playerId: socketId, color: userColor.current };
            SocketManager.placePixel(activeRoomId, 1, newPixel);

        } else {
            // Removing
            if (selectedPixels.current.some(p => p.x === x && p.y === y)) {
                selectedPixels.current = selectedPixels.current.filter(p => p.x !== x || p.y !== y);

                ensureRow(y);
                newGrid[y][x] = null;
                SocketManager.placePixel(activeRoomId, 0, { x, y });
            } else if (gridRef.current[y][x]) {
                // It might be a pixel we placed but lost track of, or just clearing.
                ensureRow(y);
                newGrid[y][x] = null;
                SocketManager.placePixel(activeRoomId, 0, { x, y });
            }
        }

        gridRef.current = newGrid;
        setGrid(newGrid);
    };

    const handlePointerDown = useCallback((event) => {
        if (gameOver || !roomIdRef.current) return;

        if (activePointerId.current !== null && activePointerId.current !== event.pointerId) {
            return;
        }

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

        const currentCell = gridRef.current[coordinates.y][coordinates.x];
        drawMode.current = currentCell ? 0 : 1;

        handleInteraction(coordinates.x, coordinates.y);
    }, [gameOver, getGridCoordinatesFromPointer, handleInteraction]);

    const handlePointerMove = useCallback((event) => {
        if (!isDrawing.current || gameOver) return;
        if (activePointerId.current !== event.pointerId) return;

        const coordinates = getGridCoordinatesFromPointer(event);
        if (!coordinates) return;

        if (
            lastPointerCell.current &&
            lastPointerCell.current.x === coordinates.x &&
            lastPointerCell.current.y === coordinates.y
        ) {
            return;
        }

        lastPointerCell.current = coordinates;

        event.preventDefault();

        const currentCell = gridRef.current[coordinates.y][coordinates.x];
        const currentStatus = currentCell ? 1 : 0;

        if (currentStatus !== drawMode.current) {
            handleInteraction(coordinates.x, coordinates.y);
        }
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
        grid,
        roomId,
        rooms,
        myFigures,
        score,
        gameOver,
        theme,
        toggleTheme,
        handleCreateRoom,
        handleJoinRoom,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handlePointerCancel
    };
};

export default useGameLogic;
