import { io } from 'socket.io-client';

class SocketManager {
    constructor() {
        this.socket = null;
    }

    connect() {
        if (!this.socket) {
            this.socket = io('http://localhost:3000'); // Hardcoded for now
        }
        return this.socket;
    }

    getSocket() {
        return this.socket;
    }

    createRoom() {
        this.socket.emit('create_room');
    }

    joinRoom(roomId) {
        this.socket.emit('join_room', roomId);
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
}

export default new SocketManager();
