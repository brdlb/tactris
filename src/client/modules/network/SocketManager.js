import { io } from 'socket.io-client';

class SocketManager {
    constructor() {
        this.socket = null;
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
        }
        return this.socket;
    }

    getSocket() {
        return this.socket;
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
