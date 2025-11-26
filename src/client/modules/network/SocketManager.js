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
        // Handle room creation/joining with players list
        this.socket.on('room_created', (data) => {
            this.emit('roomCreated', data);
        });

        this.socket.on('room_joined', (data) => {
            this.emit('roomJoined', data);
        });

        // Handle player events
        this.socket.on('player_joined', (data) => {
            this.emit('playerJoined', data);
        });

        this.socket.on('player_left', (data) => {
            this.emit('playerLeft', data);
        });

        this.socket.on('players_list_updated', (data) => {
            this.emit('playersListUpdated', data);
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
        console.log(`[CLIENT] Отправка события place_pixel:`, {
            roomId,
            status: status === 1 ? 'размещение' : 'удаление',
            position,
            timestamp: new Date().toISOString()
        });
        this.socket.emit('place_pixel', { roomId, status, position });
    }

    placeFigure(roomId, pixels) {
        console.log(`[CLIENT] Отправка события place_figure:`, {
            roomId,
            pixelsCount: pixels.length,
            pixels,
            timestamp: new Date().toISOString()
        });
        this.socket.emit('place_figure', { roomId, pixels });
    }

    getRooms() {
        this.socket.emit('get_rooms');
    }
}

export default new SocketManager();
