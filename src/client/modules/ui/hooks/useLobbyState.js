import { useState, useEffect } from 'react';
import SocketManager from '../../network/SocketManager';

const useLobbyState = () => {
    const [rooms, setRooms] = useState([]);
    const [roomStates, setRoomStates] = useState({});

    useEffect(() => {
        const socket = SocketManager.connect();
        if (!socket) return;

        const onRoomsList = (roomList) => {
            const nextRooms = roomList.map(room => ({ ...room, id: room.id ?? room.roomId }));
            const roomIds = new Set(nextRooms.map(room => room.id));
            setRooms(nextRooms);
            setRoomStates(prev => Object.fromEntries(
                Object.entries(prev).filter(([id]) => roomIds.has(id))
            ));
        };

        const onLobbyGameUpdate = (data) => {
            if (!Array.isArray(data.players)) return;
            setRoomStates(prev => ({ ...prev, [data.roomId]: data }));
        };

        const onInitialLobbyState = (states) => {
            const stateMap = {};
            states.filter(state => Array.isArray(state.players)).forEach(state => {
                stateMap[state.roomId] = state;
            });
            setRoomStates(stateMap);
        };

        socket.on('rooms_list', onRoomsList);
        socket.on('lobby_game_update', onLobbyGameUpdate);
        socket.on('initial_lobby_state', onInitialLobbyState);

        return () => {
            socket.off('rooms_list', onRoomsList);
            socket.off('lobby_game_update', onLobbyGameUpdate);
            socket.off('initial_lobby_state', onInitialLobbyState);
        };
    }, []);

    return { rooms, roomStates };
};

export default useLobbyState;
