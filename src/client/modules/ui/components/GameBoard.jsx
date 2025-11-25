import React, { useState, useEffect, useRef } from 'react';
import SocketManager from '../../network/SocketManager';
import './GameBoard.css';

const FIGURES = {
    I: [[0, 0], [1, 0], [2, 0], [3, 0]],
    O: [[0, 0], [1, 0], [0, 1], [1, 1]],
    T: [[0, 0], [1, 0], [2, 0], [1, 1]],
    S: [[1, 0], [2, 0], [0, 1], [1, 1]],
    Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
    J: [[1, 0], [1, 1], [1, 2], [0, 2]],
    L: [[0, 0], [0, 1], [0, 2], [1, 2]]
};

const GameBoard = () => {
    const [grid, setGrid] = useState(() => Array(10).fill(null).map(() => Array(10).fill(null)));
    const gridRef = useRef(grid);
    const [roomId, setRoomId] = useState(null);
    const roomIdRef = useRef(null);
    const [rooms, setRooms] = useState([]);
    const [myFigures, setMyFigures] = useState([]);
    const [score, setScore] = useState(0);

    const [gameOver, setGameOver] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

    const selectedPixels = useRef([]); // Queue of {x, y} to track order
    const isDrawing = useRef(false);
    const drawMode = useRef(1); // 1 for placing, 0 for removing

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

            // Sync selectedPixels with grid state to ensure consistency
            // (Optional: might be complex if other players modify, but for now we track our own)
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
            SocketManager.joinRoom(initialRoomId);
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

    const handleCreateRoom = () => {
        SocketManager.createRoom();
    };

    const handleJoinRoom = (id) => {
        SocketManager.joinRoom(id);
    };

    const toggleSettings = () => {
        setShowSettings(!showSettings);
    };

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

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

    const handleInteraction = (x, y) => {
        if (!roomId || gameOver) return;

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
            newGrid[y][x] = { playerId: socketId, color: 'red' };
            SocketManager.placePixel(roomId, 1, newPixel);

        } else {
            // Removing
            if (selectedPixels.current.some(p => p.x === x && p.y === y)) {
                selectedPixels.current = selectedPixels.current.filter(p => p.x !== x || p.y !== y);

                ensureRow(y);
                newGrid[y][x] = null;
                SocketManager.placePixel(roomId, 0, { x, y });
            } else if (gridRef.current[y][x]) {
                // It might be a pixel we placed but lost track of, or just clearing.
                ensureRow(y);
                newGrid[y][x] = null;
                SocketManager.placePixel(roomId, 0, { x, y });
            }
        }

        gridRef.current = newGrid;
        setGrid(newGrid);
    };

    const handleMouseDown = (x, y, e) => {
        if (e.button !== 0) return;
        e.preventDefault();

        if (!roomId || gameOver) return;

        isDrawing.current = true;

        const currentCell = gridRef.current[y][x];
        const targetStatus = currentCell ? 0 : 1;
        drawMode.current = targetStatus;

        handleInteraction(x, y);
    };

    const handleMouseEnter = (x, y) => {
        if (!isDrawing.current || !roomId || gameOver) return;

        // Only interact if the cell state matches what we want to change
        // e.g. if adding, only add to empty cells.
        const currentCell = gridRef.current[y][x];
        const currentStatus = currentCell ? 1 : 0;

        if (currentStatus !== drawMode.current) {
            handleInteraction(x, y);
        }
    };

    // Helper function to convert touch coordinates to grid coordinates
    const getGridCoordinatesFromTouch = (touch, gameBoardElement) => {
        const rect = gameBoardElement.getBoundingClientRect();
        const cellWidth = rect.width / 10;
        const cellHeight = rect.height / 10;

        const x = Math.floor((touch.clientX - rect.left) / cellWidth);
        const y = Math.floor((touch.clientY - rect.top) / cellHeight);

        return { x: Math.max(0, Math.min(9, x)), y: Math.max(0, Math.min(9, y)) };
    };

    const handleTouchStart = (e) => {
        e.preventDefault();

        if (!roomId || gameOver) return;

        isDrawing.current = true;

        // Get the game board element
        const gameBoardElement = document.querySelector('.game-board');

        // Handle first touch
        if (e.touches.length > 0 && gameBoardElement) {
            const touch = e.touches[0];
            const { x, y } = getGridCoordinatesFromTouch(touch, gameBoardElement);

            const currentCell = gridRef.current[y][x];
            const targetStatus = currentCell ? 0 : 1;
            drawMode.current = targetStatus;

            handleInteraction(x, y);
        }
    };

    const handleTouchMove = (e) => {
        e.preventDefault();

        if (!isDrawing.current || !roomId || gameOver) return;

        // Only handle the first touch
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const gameBoardElement = document.querySelector('.game-board');

            if (gameBoardElement) {
                const { x, y } = getGridCoordinatesFromTouch(touch, gameBoardElement);

                const currentCell = gridRef.current[y][x];
                const currentStatus = currentCell ? 1 : 0;

                if (currentStatus !== drawMode.current) {
                    handleInteraction(x, y);
                }
            }
        }
    };

    const handleTouchEnd = (e) => {
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

    // Render helper for figures
    const renderFigure = (type) => {
        const shape = FIGURES[type];
        if (!shape) return null;

        // Create a mini grid for the figure
        const w = 4, h = 4;
        const grid = Array(h).fill(null).map(() => Array(w).fill(false));
        shape.forEach(([x, y]) => {
            if (grid[y] && grid[y][x] !== undefined) grid[y][x] = true;
        });

        return (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${w}, 10px)`, gap: '1px', margin: '5px' }}>
                {grid.map((row, y) => row.map((filled, x) => (
                    <div key={`${x}-${y}`} style={{ width: '10px', height: '10px', backgroundColor: filled ? 'var(--text-primary)' : 'transparent' }} />
                )))}
            </div>
        );
    };

    return (
        <div className="game-container">
            {/* Settings button */}
            <button className="settings-btn" onClick={toggleSettings} aria-label="Settings">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>

            {/* Settings Modal */}
            {showSettings && (
                <div className="modal-overlay" onClick={toggleSettings}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Настройки</h2>
                            <button className="close-btn" onClick={toggleSettings} aria-label="Close">
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="setting-item">
                                <span>Тема</span>
                                <label className="theme-switch">
                                    <input
                                        type="checkbox"
                                        checked={theme === 'dark'}
                                        onChange={toggleTheme}
                                    />
                                    <span className="slider">
                                        <span className="slider-icon">{theme === 'dark' ? '🌙' : '☀️'}</span>
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <h1 className="game-title">Tactris</h1>

            {gameOver && (
                <div className="game-over-overlay">
                    <h2>Game Over!</h2>
                    <p>No more moves possible.</p>
                </div>
            )}

            {!roomId && (
                <div className="room-controls">
                    <button
                        onClick={handleCreateRoom}
                        className="create-room-btn"
                    >
                        Create Room
                    </button>
                    <div className="rooms-list">
                        <h3>Available Rooms:</h3>
                        {rooms.length === 0 ? (
                            <p>No rooms available</p>
                        ) : (
                            <ul>
                                {rooms.map(room => (
                                    <li key={room.id}>
                                        {room.id}
                                        <button onClick={() => handleJoinRoom(room.id)} className="join-btn">
                                            Join
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
            {roomId && <p style={{ marginBottom: '10px' }}>Room ID: {roomId}</p>}

            <div className="game-content">
                {roomId && (
                    <div className="figures-panel">
                        <div style={{ marginBottom: '10px', fontSize: '1.2em', fontWeight: 'bold' }}>
                            {score}
                        </div>
                        {myFigures.length > 0 && (
                            <div style={{ display: 'flex' }}>
                                {myFigures.map((type, i) => (
                                    <div key={i} style={{ marginRight: '10px' }}>
                                        {renderFigure(type)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="game-board">
                    {grid.map((row, y) =>
                        row.map((cell, x) => (
                            <div
                                key={`${x}-${y}`}
                                className="grid-cell"
                                onMouseDown={(e) => handleMouseDown(x, y, e)}
                                onMouseEnter={() => handleMouseEnter(x, y)}
                                onTouchStart={(e) => handleTouchStart(e)}
                                onTouchMove={(e) => handleTouchMove(e)}
                                onTouchEnd={(e) => handleTouchEnd(e)}
                                style={{
                                    backgroundColor: cell ? cell.color : 'var(--cell-bg)',
                                    touchAction: 'none', // Prevent scrolling and zooming on touch
                                }}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default GameBoard;
