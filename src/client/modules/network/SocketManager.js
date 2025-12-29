import { io } from 'socket.io-client';
import { getUserColor } from '../../utils/colorUtils';

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

            // Get the anonymous token from localStorage if it exists
            const anonymousToken = localStorage.getItem('anonymousToken');

            this.socket = io(serverUrl, {
                transports: ['websocket', 'polling'],
                timeout: 20000,
                forceNew: true,
                // Send the anonymous token with the connection handshake
                auth: {
                    anonymousToken: anonymousToken || undefined
                }
            });

            this.setupSocketHandlers();

            // Connection status handlers
            this.socket.on('connect', () => {
                console.log('✅ Connection to server established');

                // Automatic room join from URL on any connect
                const urlParams = new URLSearchParams(window.location.search);
                const roomId = urlParams.get('room');
                if (roomId) {
                    console.log('[Auto-join] Joining room from URL:', roomId);
                    const color = getUserColor();
                    this.joinRoom(roomId, color);
                } else {
                    console.log('[Auto-join] No room in URL — lobby');
                }
            });

            this.socket.on('disconnect', (reason) => {
                console.log('❌ Connection to server lost. Reason:', reason);
            });

            this.socket.on('connect_error', (err) => {
                console.error('❌ Ошибка подключения к серверу:', err.message || err);
            });

            this.socket.on('reconnect_error', (err) => {
                console.error('❌ Ошибка реконнекта:', err.message || err);
            });

            // Listen for the server to send back the anonymous token and user_id
            this.socket.on('anonymous_token', (data) => {
                if (data.token) {
                    // Store the anonymous token in localStorage
                    localStorage.setItem('anonymousToken', data.token);
                }
                if (data.user_id) {
                    // Store the user_id in localStorage
                    localStorage.setItem('userId', data.user_id);
                }
            });
        }
        return this.socket;
    }

    getSocket() {
        return this.socket;
    }

    setupSocketHandlers() {
        this.socket.on('room_created', (data) => {
            if (data.roomId) {
                localStorage.setItem('currentRoomId', data.roomId);
            }
        });

        this.socket.on('reconnect', () => {
            console.log('🔄 Successful reconnect. Attempting to rejoin room:', localStorage.getItem('currentRoomId'));
            const roomId = localStorage.getItem('currentRoomId');
            if (roomId) {
                const color = getUserColor();
                this.joinRoom(roomId, color);
            }
        });
    }

    createRoom(color, rotateable = false) {
        this.socket.emit('create_room', { color, rotateable });
    }

    joinRoom(roomId, color) {
        console.log(`[Reconnect] Sending join_room for room ${roomId}`);
        localStorage.setItem('currentRoomId', roomId);
        this.socket.emit('join_room', { roomId, color });
    }

    updateDrawing(roomId, pixels) {
        this.socket.emit('update_drawing', { roomId, pixels });
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

    leaveRoom(roomId) {
        this.socket.emit('leave_room', { roomId });
    }
}

export default new SocketManager();

