import { useState, useRef, useEffect, useCallback } from 'react';
import SocketManager from '../../network/SocketManager';

const generateDisplayId = (playerId) =>
    playerId ? `P-${playerId.slice(-6)}` : `P-${Math.floor(Math.random() * 10000)}`;

const useGameState = (personalColor, selectedPixelsRef, roomIdRefOverride) => {
    const [grid, setGrid] = useState(() => Array(10).fill(null).map(() => Array(10).fill(null)));
    const gridRef = useRef(grid);
    const [roomId, setRoomId] = useState(null);
    const roomIdRef = roomIdRefOverride || useRef(null);
    const [myFigures, setMyFigures] = useState([]);
    const [score, setScore] = useState(0);
    const [playersList, setPlayersList] = useState([]);
    const [clearingDetails, setClearingDetails] = useState(null);
    const [gameOver, setGameOver] = useState(false);
    const [isRestored, setIsRestored] = useState(false);
    const roomRotateableRef = useRef(false);

    const userColorRef = useRef(personalColor);
    useEffect(() => {
        userColorRef.current = personalColor;
    }, [personalColor]);

    const updateGameState = useCallback((state) => {
        const socket = SocketManager.getSocket();
        const socketId = socket?.id;
        const newGrid = state.grid;

        // Create a new grid that preserves recent local changes
        const processedGrid = newGrid.map((row, y) =>
            row.map((cell, x) => {
                // Locally, we always prioritize our own current drawing
                const isOurDrawing = selectedPixelsRef?.current?.some(p => p.x === x && p.y === y);
                if (isOurDrawing) {
                    return {
                        playerId: socketId,
                        color: userColorRef.current,
                        state: 'drawing'
                    };
                }

                // If server says it's our drawing pixel but we don't have it locally, ignore it
                if (cell && cell.playerId === socketId && cell.state === 'drawing') {
                    return null;
                }

                return cell;
            })
        );

        setGrid(processedGrid);
        gridRef.current = processedGrid;

        const myPlayer = state.players && socketId && state.players[socketId];
        if (myPlayer) {
            if (myPlayer.figures) setMyFigures(myPlayer.figures);
            if (myPlayer.score !== undefined) setScore(myPlayer.score);
        }

        if (state.players) {
            const updatedPlayersList = Object.values(state.players).map(player => ({
                id: player.id,
                color: player.color,
                score: player.score,
                figures: player.figures,
                displayId: generateDisplayId(player.id)
            }));
            setPlayersList(updatedPlayersList);
        }

        if (state.gameOver !== undefined) setGameOver(state.gameOver);
        if (state.rotateable !== undefined) roomRotateableRef.current = state.rotateable;
    }, [selectedPixelsRef]);

    useEffect(() => {
        const socket = SocketManager.connect(); // Ensure connection and get socket
        if (!socket) return;

        const onRoomCreated = ({ roomId, state, playersList }) => {
            setRoomId(roomId);
            roomIdRef.current = roomId;
            updateGameState(state);
            if (playersList) setPlayersList(playersList);
            setGameOver(false);
            window.history.pushState({}, '', `?room=${roomId}`);
        };

        const onRoomJoined = ({ roomId, state, playersList }) => {
            setRoomId(roomId);
            roomIdRef.current = roomId;
            updateGameState(state);
            if (playersList) setPlayersList(playersList.map(p => ({ ...p, displayId: generateDisplayId(p.id) })));
            setGameOver(false);
            window.history.pushState({}, '', `?room=${roomId}`);
        };

        const onGameUpdate = (state) => {
            if (state.clearingDetails) setClearingDetails(state.clearingDetails);
            updateGameState(state);
        };

        const onGameOver = () => setGameOver(true);
        const onGameRestarted = () => setGameOver(false);

        const onPlayerJoined = ({ player }) => {
            setPlayersList(prev => [...prev, { ...player, displayId: generateDisplayId(player.id) }]);
        };

        const onPlayerLeft = ({ playerId }) => {
            setPlayersList(prev => prev.filter(p => p.id !== playerId));
        };

        const onPlayersListUpdated = ({ playersList }) => {
            setPlayersList(playersList.map(p => ({ ...p, displayId: generateDisplayId(p.id) })));
        };

        const onRestored = () => setIsRestored(true);

        socket.on('room_created', onRoomCreated);
        socket.on('room_joined', onRoomJoined);
        socket.on('game_update', onGameUpdate);
        socket.on('game_over', onGameOver);
        socket.on('game_restarted', onGameRestarted);
        socket.on('player_joined', onPlayerJoined);
        socket.on('player_joined_restored', onPlayerJoined);
        socket.on('player_left', onPlayerLeft);
        socket.on('players_list_updated', onPlayersListUpdated);

        // 'restored' is an internal event from SocketManager
        SocketManager.on('restored', onRestored);

        return () => {
            socket.off('room_created', onRoomCreated);
            socket.off('room_joined', onRoomJoined);
            socket.off('game_update', onGameUpdate);
            socket.off('game_over', onGameOver);
            socket.off('game_restarted', onGameRestarted);
            socket.off('player_joined', onPlayerJoined);
            socket.off('player_joined_restored', onPlayerJoined);
            socket.off('player_left', onPlayerLeft);
            socket.off('players_list_updated', onPlayersListUpdated);
            SocketManager.off('restored', onRestored);
        };
    }, [updateGameState]);

    return {
        grid,
        setGrid,
        gridRef,
        roomId,
        setRoomId,
        roomIdRef,
        myFigures,
        setMyFigures,
        score,
        setScore,
        playersList,
        setPlayersList,
        clearingDetails,
        setClearingDetails,
        gameOver,
        setGameOver,
        isRestored,
        roomRotateableRef
    };
};

export default useGameState;
