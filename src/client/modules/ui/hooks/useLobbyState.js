import { useState, useEffect } from 'react';
import SocketManager from '../../network/SocketManager';

const useLobbyState = () => {
    const [rooms, setRooms] = useState([]);
    const [roomStates, setRoomStates] = useState({});

    useEffect(() => {
        const socket = SocketManager.connect();
        if (!socket) return;

        const onRoomsList = (roomList) => {
            setRooms(roomList);
        };

        const onLobbyGameUpdate = (data) => {
            setRoomStates(prev => ({ ...prev, [data.roomId]: data }));
        };

        const onInitialLobbyState = (states) => {
            const stateMap = {};
            states.forEach(state => {
                stateMap[state.roomId] = state;
            });
            setRoomStates(stateMap);
        };

        socket.on('rooms_list', onRoomsList);
        socket.on('lobby_game_update', onLobbyGameUpdate);
        socket.on('initial_lobby_state', onInitialLobbyState);

        // Request initial list
        SocketManager.getRooms();

        return () => {
            socket.off('rooms_list', onRoomsList);
            socket.off('lobby_game_update', onLobbyGameUpdate);
            socket.off('initial_lobby_state', onInitialLobbyState);
        };
    }, []);

    return { rooms, roomStates };
};

export default useLobbyState;
