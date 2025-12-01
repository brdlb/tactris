import { io } from 'socket.io-client';
import { getUserColor } from '../../utils/colorUtils';
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
            
            // Set up room event listeners
            this.setupRoomEventListeners();
            this.setupRestoreHandlers();
            
            // Connection status handlers
            this.socket.on('connect', () => {
                console.log('✅ Соединение с сервером установлено');
                
                // Автоматический возврат в комнату при любом connect, если roomId сохранен
                console.log(localStorage.getItem('currentRoomId'));
                const roomId = localStorage.getItem('currentRoomId');
                if (roomId) {
                    console.log('[Auto-join] Возвращаюсь в сохраненную комнату:', roomId);
                    const color = getUserColor();
                    this.joinRoom(roomId, color);
                }
            });
            
            this.socket.on('disconnect', (reason) => {
                console.log('❌ Соединение с сервером потеряно. Причина:', reason);
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

    setupRestoreHandlers() {
        this.socket.on('room_joined', (data) => {
            console.log(`Получен room_joined от сервера: restored=${!!data.restored}`);
            if (data.restored) {
                console.log('Emit "restored" событие');
                this.emit('restored', {});
            }
        });

        this.socket.on('room_created', (data) => {
            if (data.roomId) {
                localStorage.setItem('currentRoomId', data.roomId);
            }
        });

        this.socket.on('reconnect', () => {
            console.log('🔄 Успешный реконнект. Пытаюсь вернуться в комнату:', localStorage.getItem('currentRoomId'));
            const roomId = localStorage.getItem('currentRoomId');
            if (roomId) {
                const color = getUserColor();
                this.joinRoom(roomId, color);
            }
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

    createRoom(color, rotateable = false) {
            this.socket.emit('create_room', { color, rotateable });
        }

    joinRoom(roomId, color) {
        console.log(`[Reconnect] Отправляю join_room для комнаты ${roomId}`);
        localStorage.setItem('currentRoomId', roomId);
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
    
    leaveRoom(roomId) {
        this.socket.emit('leave_room', { roomId });
    }
}

export default new SocketManager();
