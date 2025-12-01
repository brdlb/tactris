import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import SocketManager from '../../network/SocketManager';
import { getUserColor } from '../../../utils/colorUtils';
import { FIGURES } from '../../../constants/figures';
import { checkMatch } from '../../../utils/figureUtils';

const useGameLogic = (boardRefOverride = null) => {
    const [grid, setGrid] = useState(() => Array(10).fill(null).map(() => Array(10).fill(null)));
            const gridRef = useRef(grid);
    const [roomId, setRoomId] = useState(null);
    const roomIdRef = useRef(null);
    const [rooms, setRooms] = useState([]);
  const [roomStates, setRoomStates] = useState({});
    const [myFigures, setMyFigures] = useState([]);
    const [score, setScore] = useState(0);
    const [playersList, setPlayersList] = useState([]); // List of players in current room

    const [gameOver, setGameOver] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
    const [isRestored, setIsRestored] = useState(false);

    const selectedPixels = useRef([]); // Queue of {x, y} to track order
    const isDrawing = useRef(false);
    const userColor = useRef(getUserColor()); // Personal color for this user
    const internalBoardRef = useRef(null);
    const boardRef = boardRefOverride ?? internalBoardRef;
    const boardMetrics = useRef({ rect: null, cellWidth: 0, cellHeight: 0, lastUpdate: 0 });
    const activePointerId = useRef(null);
    const lastPointerCell = useRef(null);
    const pointerCaptureTarget = useRef(null);
    const pendingUpdates = useRef(new Set()); // Track recently updated pixels to avoid redundant server updates
        const isResizing = useRef(false); // Track resize state to force metric recalculation
        const roomRotateableRef = useRef(false); // Store the rotateable setting for this room
    
        // Helper to create a new grid with a pixel update
            const updateGridPixel = (grid, x, y, value) => {
                const newGrid = [...grid];
                newGrid[y] = [...grid[y]];
                newGrid[y][x] = value;
                return newGrid;
            };
        
            // Helper to remove first pixel from queue and clear it from grid
            const removeFirstPixelFromQueue = () => {
                if (selectedPixels.current.length === 0) return;
        
                const removedPixel = selectedPixels.current.shift();
                let newGrid = gridRef.current;
        
                newGrid = updateGridPixel(newGrid, removedPixel.x, removedPixel.y, null);
        
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
            
            // Add disconnect logging
            socket.on('disconnect', (reason) => {
            });
            
            socket.on('reconnect', (attemptNumber) => {
            });
            
            const updateGameState = (state) => {
                                const currentGrid = gridRef.current;
                                const newGrid = state.grid;
                                const pendingUpdatesSet = pendingUpdates.current;
                    
                                // Create a new grid that preserves recent local changes
                                const processedGrid = newGrid.map((row, y) =>
                                    row.map((cell, x) => {
                                        const pixelKey = `${x}-${y}`;
                                        const currentCell = currentGrid[y]?.[x];
                            
                                        // Skip updating if this pixel was recently modified locally
                                        return pendingUpdatesSet.has(pixelKey) ? currentCell : cell;
                                    })
                                );
                            
                                setGrid(processedGrid);
                                gridRef.current = processedGrid;
                            
                                // Update player-specific data
                                const myPlayer = state.players && state.players[socket.id];
                                if (myPlayer) {
                                    // Update figures if they changed
                                    if (myPlayer.figures) {
                                        // Always update figures when they're received from server
                                        setMyFigures(myPlayer.figures);
                                    }
                                    
                                                                        // Update score from server always
                                                                        if (myPlayer.score !== undefined) {
                                                                            setScore(myPlayer.score);
                                                                        }
                                }
                            
                                // Update players list to sync opponents' data (scores, figures)
                                if (state.players) {
                                    const updatedPlayersList = Object.values(state.players).map(player => ({
                                        id: player.id,
                                        color: player.color,
                                        score: player.score,
                                        figures: player.figures
                                    }));
                                    setPlayersList(updatedPlayersList);
                                }
                                
                                // Update game over state from server always
                                if (state.gameOver !== undefined) {
                                    setGameOver(state.gameOver);
                                }
                                
                                // Update rotateable setting if it changed (for client-side validation)
                                if (state.rotateable !== undefined) {
                                    roomRotateableRef.current = state.rotateable;
                                }
                            
                                // Clean up old pending updates (keep only recent ones)
                                pendingUpdatesSet.clear();
                            };

        socket.on('room_created', ({ roomId, state, playersList }) => {
            setRoomId(roomId);
            roomIdRef.current = roomId;
            pendingUpdates.current.clear(); // Clear pending updates for new room
            updateGameState(state);
            if (playersList) setPlayersList(playersList);
            selectedPixels.current = []; // Reset selection on new game
            setGameOver(false);
            window.history.pushState({}, '', `?room=${roomId}`);
        });

        socket.on('room_joined', ({ roomId, state, playersList, restored }) => {
            console.log('room_joined в useGameLogic, restored:', !!restored);
            setRoomId(roomId);
            roomIdRef.current = roomId;
            pendingUpdates.current.clear(); // Clear pending updates for new room
            updateGameState(state);
            if (playersList) setPlayersList(playersList.map(player => ({
                ...player,
                displayId: player.id ? `P-${player.id.slice(-6)}` : `P-${Math.floor(Math.random() * 10000)}` // Use short hash of id or random number
            })));
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

        socket.on('game_restarted', () => {
            setGameOver(false);
            selectedPixels.current = []; // Clear selection queue
            pendingUpdates.current.clear(); // Clear pending updates
        });

        socket.on('rooms_list', (roomList) => {
            setRooms(roomList);

  socket.on('lobby_game_update', (data) => {
    setRoomStates(prev => ({...prev, [data.roomId]: data}));
  });
  
  socket.on('initial_lobby_state', (states) => {
    const stateMap = {};
    states.forEach(state => {
      stateMap[state.roomId] = state;
    });
    setRoomStates(stateMap);
  });
        });

        // Handle player events
        socket.on('player_joined', ({ player }) => {
            const playerWithDisplayId = {
                ...player,
                displayId: player.id ? `P-${player.id.slice(-6)}` : `P-${Math.floor(Math.random() * 10000)}`
            };
            setPlayersList(prev => [...prev, playerWithDisplayId]);
        });

        socket.on('player_joined_restored', ({ player }) => {
            const playerWithDisplayId = {
                ...player,
                displayId: player.id ? `P-${player.id.slice(-6)}` : `P-${Math.floor(Math.random() * 1000)}`
            };
            setPlayersList(prev => [...prev, playerWithDisplayId]);
        });

        socket.on('player_left', ({ playerId }) => {
            setPlayersList(prev => prev.filter(p => p.id !== playerId));
        });

        socket.on('players_list_updated', ({ playersList }) => {
            setPlayersList(playersList.map(player => ({
                ...player,
                displayId: player.id ? `P-${player.id.slice(-6)}` : `P-${Math.floor(Math.random() * 1000)}`
            })));
        });

        socket.on('error', (message) => {
            console.error('Socket error от сервера:', message);
            if (message === 'Invalid move') return;
            alert(message);
            if (message === 'Room not found') {
                // Clear the invalid room from URL
                window.history.pushState({}, '', window.location.pathname);
            }
        });

        socket.on('restored', () => {
            console.log('Получено "restored" событие в useGameLogic');
            setIsRestored(true);
            pendingUpdates.current.clear();
            // Additional restoration logic would go here if needed
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

    // Обработчик истории браузера для перехода назад в лобби
    useEffect(() => {
      const handlePopstate = () => {
        const params = new URLSearchParams(window.location.search);
        const urlRoomId = params.get('room');
        const currentRoomId = roomIdRef.current;

        if (urlRoomId !== currentRoomId) {
          // Выходим из текущей комнаты если есть
          if (currentRoomId) {
            SocketManager.leaveRoom(currentRoomId);
            setRoomId(null);
            roomIdRef.current = null;
            localStorage.removeItem('currentRoomId');
          }
          // Входим в новую комнату если указана
          if (urlRoomId) {
            SocketManager.joinRoom(urlRoomId, userColor.current);
          }
        }
      };

      window.addEventListener('popstate', handlePopstate);
      return () => {
        window.removeEventListener('popstate', handlePopstate);
      };
    }, []);
    const updateBoardMetrics = useCallback((forceUpdate = false) => {
        if (!boardRef.current) return;
        
        const rect = boardRef.current.getBoundingClientRect();
        const columns = gridRef.current[0]?.length || 1;
        const rows = gridRef.current.length || 1;
        const now = Date.now();
        
        // Only update if forced, or if metrics are missing, or if resizing flag is set
        const shouldUpdate = forceUpdate || 
                           !boardMetrics.current.rect || 
                           isResizing.current ||
                           now - boardMetrics.current.lastUpdate > 100; // Update if older than 100ms
        
        if (shouldUpdate) {
            boardMetrics.current = {
                rect,
                cellWidth: columns ? rect.width / columns : 0,
                cellHeight: rows ? rect.height / rows : 0,
                lastUpdate: now
            };
        }
    }, [boardRef]);

    const getGridCoordinatesFromPointer = useCallback((event) => {
        if (!boardRef.current) return null;

        // Always ensure metrics are current before calculating coordinates
        updateBoardMetrics(true); // Force update to get fresh metrics

        const { rect, cellWidth, cellHeight } = boardMetrics.current;

        if (!rect || !cellWidth || !cellHeight) {
            return null;
        }

        // Calculate coordinates relative to the board
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

        updateBoardMetrics(true); // Initial force update

        const handleResizeStart = () => {
            isResizing.current = true;
        };

        const handleResize = () => {
            // Set resizing flag and force update
            isResizing.current = true;
            updateBoardMetrics(true);
            
            // Clear resizing flag after a short delay to allow for smooth transitions
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
            clearTimeout(handleResize.timeoutId);
            if (observer) {
                observer.disconnect();
            }
        };
    }, [boardRef, updateBoardMetrics]);

    const finalizeDrawing = useCallback(() => {
        if (selectedPixels.current.length >= 4 && roomIdRef.current && !gameOver) {
            // Check if the selected pixels match any of the available figures
                                    const matchedFigureIndex = checkMatch(selectedPixels.current, myFigures, roomRotateableRef.current);
                                    if (matchedFigureIndex !== -1) {
                                        SocketManager.placeFigure(roomIdRef.current, selectedPixels.current);
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

    const handleCreateRoom = (rotateable = false) => {
            SocketManager.createRoom(userColor.current, rotateable);
        };

    const handleJoinRoom = (id) => {
        SocketManager.joinRoom(id, userColor.current);
    };

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    const handleHueChange = (newHue) => {
        userColor.current = getUserColor();
        if (roomIdRef.current) {
            SocketManager.updatePlayerColor(roomIdRef.current, userColor.current);
        }
    };

    const handleRestart = () => {
        if (roomIdRef.current) {
            SocketManager.restartGame(roomIdRef.current);
        }
    };
    
    const handleLeaveRoom = () => {
        if (roomIdRef.current) {
            SocketManager.leaveRoom(roomIdRef.current);
            setRoomId(null);
            roomIdRef.current = null;
            localStorage.removeItem('currentRoomId'); // Clear the room ID from local storage
            window.history.pushState({}, '', window.location.pathname); // Clear room from URL
        }
    };

    const handleInteraction = (x, y) => {
            const activeRoomId = roomIdRef.current;
            if (!activeRoomId || gameOver) return;
    
            // Check if pixel is already selected to avoid duplicates
            if (selectedPixels.current.some(p => p.x === x && p.y === y)) return;
    
            const newPixel = { x, y };
            selectedPixels.current.push(newPixel);
    
            // Update grid with the new pixel
            let newGrid = gridRef.current;
            newGrid = updateGridPixel(newGrid, x, y, {
                playerId: SocketManager.getSocket().id,
                color: userColor.current,
                state: 'drawing'
            });
            
            SocketManager.placePixel(activeRoomId, 1, newPixel);
    
            // Track this pixel as recently updated by current user
            pendingUpdates.current.add(`${x}-${y}`);
    
            // If we have 4 or more pixels, check if they match any figure
                        if (selectedPixels.current.length >= 4) {
                                                    const matchedFigureIndex = checkMatch(selectedPixels.current, myFigures, roomRotateableRef.current);
                                        
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
  roomStates,
            rooms,
            playersList,
            myFigures,
            score,
            gameOver,
            isRestored,
            theme,
            toggleTheme,
            handleCreateRoom,
                    handleJoinRoom,
            handlePointerDown,
            handlePointerMove,
            handlePointerUp,
            handlePointerCancel,
            handleHueChange,
            handleRestart,
            handleLeaveRoom
        };
};

export default useGameLogic;
