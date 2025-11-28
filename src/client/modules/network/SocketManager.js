import { io } from 'socket.io-client';

class SocketManager {
    constructor() {
        this.socket = null;
        this.eventListeners = new Map();
    }

    connect() {
        if (!this.socket) {
            // Determine the server URL based on environment
            const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
            const host = window.location.hostname;
            const serverUrl = `${protocol}//${host}`;

            this.socket = io(serverUrl, {
                transports: ['websocket', 'polling'],
                timeout: 20000,
                forceNew: true
            });
            
            // Set up room event listeners
            this.setupRoomEventListeners();
        }
        return this.socket;
    }

    getSocket() {
        return this.socket;
    }

    setupRoomEventListeners() {
            // Map server events to client events
            const eventMappings = {
                'room_created': 'roomCreated',
                'room_joined': 'roomJoined',
                'player_joined': 'playerJoined',
                'player_left': 'playerLeft',
                'players_list_updated': 'playersListUpdated'
            };
    
            // Set up event listeners based on the mapping
            Object.entries(eventMappings).forEach(([serverEvent, clientEvent]) => {
                this.socket.on(serverEvent, (data) => {
                    this.emit(clientEvent, data);
                });
            });
        }

    // Event listener management
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => callback(data));
        }
    }

    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    createRoom(color) {
        this.socket.emit('create_room', { color });
    }

    joinRoom(roomId, color) {
        this.socket.emit('join_room', { roomId, color });
    }

    placePixel(roomId, status, position) {
        this.socket.emit('place_pixel', { roomId, status, position });
    }

    placeFigure(roomId, pixels) {
        this.socket.emit('place_figure', { roomId, pixels });
    }

    getRooms() {
        this.socket.emit('get_rooms');
    }

    updatePlayerColor(roomId, newColor) {
        this.socket.emit('update_player_color', { roomId, color: newColor });
    }

    restartGame(roomId) {
        this.socket.emit('restart_game', { roomId });
    }
}

export default new SocketManager();
