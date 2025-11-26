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
    const [playersList, setPlayersList] = useState([]); // List of players in current room

    const [gameOver, setGameOver] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

    const selectedPixels = useRef([]); // Queue of {x, y} to track order
    const isDrawing = useRef(false);
    const userColor = useRef(getUserColor()); // Personal color for this user
    const internalBoardRef = useRef(null);
    const boardRef = boardRefOverride ?? internalBoardRef;
    const boardMetrics = useRef({ rect: null, cellWidth: 0, cellHeight: 0 });
    const activePointerId = useRef(null);
    const lastPointerCell = useRef(null);
    const pointerCaptureTarget = useRef(null);
    const pendingUpdates = useRef(new Set()); // Track recently updated pixels to avoid redundant server updates

    // Helper to check if pixels match any of the allowed figures (subset check)
    const checkMatch = (pixels, figures) => {
        if (pixels.length === 0) return -1;

        // Normalize pixels to (0,0)
        const minX = Math.min(...pixels.map(p => p.x));
        const minY = Math.min(...pixels.map(p => p.y));
        const normalized = pixels.map(p => ({ x: p.x - minX, y: p.y - minY }));

        for (let i = 0; i < figures.length; i++) {
            const figure = figures[i];
            if (!figure.cells) continue;

            // Check all 4 rotations
            let currentShape = figure.cells;
            for (let r = 0; r < 4; r++) {
                // Check if normalized pixels are a subset of currentShape
                const isSubset = normalized.every(p =>
                    currentShape.some(fp => fp[0] === p.x && fp[1] === p.y)
                );

                if (isSubset) return i;

                // Rotate shape 90 degrees
                // (x, y) -> (-y, x)
                // Then normalize again to keep it positive
                const rotated = currentShape.map(([x, y]) => [-y, x]);
                const rMinX = Math.min(...rotated.map(p => p[0]));
                const rMinY = Math.min(...rotated.map(p => p[1]));
                currentShape = rotated.map(([x, y]) => [x - rMinX, y - rMinY]);
            }
        }
        return -1;
    };

    // Helper to remove first pixel from queue and clear it from grid
    const removeFirstPixelFromQueue = () => {
        if (selectedPixels.current.length === 0) return;
        
        const removedPixel = selectedPixels.current.shift();
        const socketId = SocketManager.getSocket().id;
        let newGrid = [...gridRef.current];

        const ensureRow = (rowIndex) => {
            if (newGrid[rowIndex] === gridRef.current[rowIndex]) {
                newGrid[rowIndex] = [...gridRef.current[rowIndex]];
            }
        };

        ensureRow(removedPixel.y);
        newGrid[removedPixel.y][removedPixel.x] = null;

        // Track this pixel as recently updated by current user (removal)
        pendingUpdates.current.add(`${removedPixel.x}-${removedPixel.y}`);

        gridRef.current = newGrid;
        setGrid(newGrid);

        if (roomIdRef.current) {
            SocketManager.placePixel(roomIdRef.current, 0, removedPixel);
        }
    };

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
            const currentGrid = gridRef.current;
            const newGrid = state.grid;
            const socketId = socket.id;
            const pendingUpdatesSet = pendingUpdates.current;

            // Create a new grid that preserves recent local changes
            let processedGrid = newGrid.map((row, y) => 
                row.map((cell, x) => {
                    const pixelKey = `${x}-${y}`;
                    const currentCell = currentGrid[y]?.[x];
                    
                    // Skip updating if this pixel was recently modified locally
                    if (pendingUpdatesSet.has(pixelKey)) {
                        return currentCell;
                    }
                    
                    // Otherwise use the server state
                    return cell;
                })
            );

            setGrid(processedGrid);
            gridRef.current = processedGrid;
            
            const myPlayer = state.players && state.players[socket.id];
            if (myPlayer) {
                if (myPlayer.figures) {
                    // Ensure we maintain stable references to avoid unnecessary re-renders
                    // Only update if the figures array or its contents actually changed
                    const currentFigures = myFigures;
                    const newFigures = myPlayer.figures;
                    
                    // Debug logging for figures changes
                    const figuresChanged = currentFigures.length !== newFigures.length || 
                        currentFigures.some((fig, i) => {
                            const newFig = newFigures[i];
                            return !fig || !newFig || 
                                   fig.type !== newFig.type || 
                                   JSON.stringify(fig.cells) !== JSON.stringify(newFig.cells);
                        });
                    
                    if (figuresChanged) {
                        console.log(`[CLIENT] Фигуры изменились:`, {
                            before: currentFigures.map((f, i) => ({ index: i, type: f?.type })),
                            after: newFigures.map((f, i) => ({ index: i, type: f?.type })),
                            timestamp: new Date().toISOString()
                        });
                        setMyFigures(newFigures);
                    }
                }
                if (myPlayer.score !== undefined) setScore(myPlayer.score);
            }
            if (state.gameOver !== undefined) {
                setGameOver(state.gameOver);
            }

            // Clean up old pending updates (keep only recent ones)
            pendingUpdatesSet.clear();
        };

        socket.on('room_created', ({ roomId, state, playersList }) => {
            console.log(`[CLIENT] Создана новая комната:`, {
                roomId,
                gridSize: state.grid ? `${state.grid.length}x${state.grid[0]?.length || 0}` : 'неизвестно',
                playersCount: playersList ? playersList.length : 0,
                playersData: playersList ? playersList.map(p => ({
                    id: p.id.substring(0, 8),
                    color: p.color,
                    score: p.score,
                    figuresCount: p.figures?.length || 0,
                    figuresTypes: p.figures?.map(f => f.type) || []
                })) : [],
                timestamp: new Date().toISOString()
            });
            setRoomId(roomId);
            roomIdRef.current = roomId;
            pendingUpdates.current.clear(); // Clear pending updates for new room
            updateGameState(state);
            if (playersList) setPlayersList(playersList);
            selectedPixels.current = []; // Reset selection on new game
            setGameOver(false);
            window.history.pushState({}, '', `?room=${roomId}`);
        });

        socket.on('room_joined', ({ roomId, state, playersList }) => {
            console.log(`[CLIENT] Присоединение к комнате:`, {
                roomId,
                gridSize: state.grid ? `${state.grid.length}x${state.grid[0]?.length || 0}` : 'неизвестно',
                playersCount: playersList ? playersList.length : 0,
                playersData: playersList ? playersList.map(p => ({
                    id: p.id.substring(0, 8),
                    color: p.color,
                    score: p.score,
                    figuresCount: p.figures?.length || 0,
                    figuresTypes: p.figures?.map(f => f.type) || []
                })) : [],
                timestamp: new Date().toISOString()
            });
            setRoomId(roomId);
            roomIdRef.current = roomId;
            pendingUpdates.current.clear(); // Clear pending updates for new room
            updateGameState(state);
            if (playersList) setPlayersList(playersList);
            selectedPixels.current = [];
            setGameOver(false);
            window.history.pushState({}, '', `?room=${roomId}`);
        });

        socket.on('game_update', (state) => {
            console.log(`[CLIENT] Получены данные game_update от сервера:`, {
                gridSize: state.grid ? `${state.grid.length}x${state.grid[0]?.length || 0}` : 'неизвестно',
                playersCount: state.players ? Object.keys(state.players).length : 0,
                gameOver: state.gameOver,
                timestamp: new Date().toISOString()
            });
            updateGameState(state);
        });

        socket.on('game_over', () => {
            console.log(`[CLIENT] Получено событие game_over от сервера:`, {
                timestamp: new Date().toISOString()
            });
            setGameOver(true);
        });

        socket.on('rooms_list', (roomList) => {
            setRooms(roomList);
        });

        // Handle player events
        socket.on('player_joined', ({ player }) => {
            console.log(`[CLIENT] Игрок присоединился:`, {
                playerId: player.id.substring(0, 8),
                color: player.color,
                score: player.score,
                figuresCount: player.figures?.length || 0,
                figuresTypes: player.figures?.map(f => f.type) || [],
                timestamp: new Date().toISOString()
            });
            setPlayersList(prev => [...prev, player]);
        });

        socket.on('player_left', ({ playerId }) => {
            console.log(`[CLIENT] Игрок отключился:`, {
                playerId,
                timestamp: new Date().toISOString()
            });
            setPlayersList(prev => prev.filter(p => p.id !== playerId));
        });

        socket.on('players_list_updated', ({ playersList }) => {
            console.log(`[CLIENT] Список игроков обновлен:`, {
                playersCount: playersList.length,
                players: playersList.map(p => ({
                    id: p.id.substring(0, 8),
                    color: p.color,
                    score: p.score,
                    figuresCount: p.figures?.length || 0,
                    figuresTypes: p.figures?.map(f => f.type) || []
                })),
                timestamp: new Date().toISOString()
            });
            setPlayersList(playersList);
        });

        socket.on('error', (message) => {
            console.log(`[CLIENT] Получена ошибка от сервера:`, {
                message,
                timestamp: new Date().toISOString()
            });
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
        console.log(`[CLIENT] Finalizing drawing with ${selectedPixels.current.length} pixels`);
        if (selectedPixels.current.length >= 4 && roomIdRef.current && !gameOver) {
            // Check if the selected pixels match any of the available figures
            const matchedFigureIndex = checkMatch(selectedPixels.current, myFigures);
            if (matchedFigureIndex !== -1) {
                console.log(`[CLIENT] Завершение рисования фигуры:`, {
                    pixelsCount: selectedPixels.current.length,
                    roomId: roomIdRef.current,
                    timestamp: new Date().toISOString()
                });
                SocketManager.placeFigure(roomIdRef.current, selectedPixels.current);
            } else {
                console.log(`[CLIENT] Нарисованная фигура не соответствует доступным фигурам`);
            }
        }

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

        // Clear pending updates after drawing is finalized
        pendingUpdates.current.clear();
    }, [gameOver, myFigures]);

    useEffect(() => {
        const handleWindowPointerEnd = (event) => {
            finalizeDrawing();
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

        // Check if pixel is already selected to avoid duplicates
        if (selectedPixels.current.some(p => p.x === x && p.y === y)) return;

        const newPixel = { x, y };
        selectedPixels.current.push(newPixel);

        // Place pixel on grid
        ensureRow(y);
        newGrid[y][x] = { playerId: socketId, color: userColor.current, state: 'drawing' };
        SocketManager.placePixel(activeRoomId, 1, newPixel);

        // Track this pixel as recently updated by current user
        pendingUpdates.current.add(`${x}-${y}`);

        // If we have 4 or more pixels, check if they match any figure
        if (selectedPixels.current.length >= 4) {
            const matchedFigureIndex = checkMatch(selectedPixels.current, myFigures);
            
            // If doesn't match any figure, remove the first pixel
            if (matchedFigureIndex === -1) {
                removeFirstPixelFromQueue();
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

        // Always add the pixel to selection (only if not already selected)
        handleInteraction(coordinates.x, coordinates.y);
    }, [gameOver, getGridCoordinatesFromPointer, handleInteraction]);

    const handlePointerUp = useCallback((event) => {
        console.log('Pointer up event:', event);
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
        playersList,
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
