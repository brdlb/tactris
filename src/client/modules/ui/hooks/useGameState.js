import { useState, useEffect, useRef } from 'react';
import SocketManager from '../../network/SocketManager';

export const useGameState = () => {
    const [grid, setGrid] = useState(() => Array(10).fill(null).map(() => Array(10).fill(null)));
    const gridRef = useRef(grid);
    const [roomId, setRoomId] = useState(null);
    const roomIdRef = useRef(null);
    const [rooms, setRooms] = useState([]);
    const [myFigures, setMyFigures] = useState([]);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);

    // Update gridRef whenever grid changes
    useEffect(() => {
        gridRef.current = grid;
    }, [grid]);

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
            setGameOver(false);
            window.history.pushState({}, '', `?room=${roomId}`);
        });

        socket.on('room_joined', ({ roomId, state }) => {
            setRoomId(roomId);
            roomIdRef.current = roomId;
            updateGameState(state);
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

    const createRoom = () => {
        SocketManager.createRoom();
    };

    const joinRoom = (id) => {
        SocketManager.joinRoom(id);
    };

    return {
        grid,
        roomId,
        rooms,
        myFigures,
        score,
        gameOver,
        createRoom,
        joinRoom,
        gridRef,
        roomIdRef
    };
};