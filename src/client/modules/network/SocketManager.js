import { getUserColor } from '../../utils/colorUtils';

// Socket.IO-compatible facade backed by a native Cloudflare Durable Object WebSocket.
class SocketManager {
    constructor() {
        this.socket = null; this.ws = null; this.listeners = new Map(); this.endpoint = null;
        this.backoff = 500; this.retryTimer = null; this.closedByUs = false;
        this.connectionAttempt = 0;
        this.clientId = sessionStorage.getItem('tactrisClientId') || crypto.randomUUID();
        sessionStorage.setItem('tactrisClientId', this.clientId);
    }
    connect() {
        if (!this.socket) {
            this.socket = { id: this.clientId, on: (e, cb) => this.on(e, cb), off: (e, cb) => this.off(e, cb), emit: (t, p = {}) => this.send(t, p) };
            const roomId = new URLSearchParams(window.location.search).get('room');
            this.connectTo(roomId ? `/ws/rooms/${roomId}` : '/ws/lobby');
        }
        return this.socket;
    }
    on(event, callback) { const set = this.listeners.get(event) || new Set(); set.add(callback); this.listeners.set(event, set); }
    off(event, callback) { this.listeners.get(event)?.delete(callback); }
    dispatch(event, payload) { this.listeners.get(event)?.forEach(callback => callback(payload)); }
    async ensureSession() {
        if (localStorage.getItem('userId')) {
            const current = await fetch('/api/session', { credentials: 'same-origin' });
            if (current.ok) return;
            localStorage.removeItem('userId');
        }
        const response = await fetch('/api/session/anonymous', { method: 'POST', credentials: 'same-origin' });
        if (!response.ok) throw new Error('Unable to create anonymous session');
        const data = await response.json(); localStorage.setItem('userId', data.user_id);
    }
    async connectTo(endpoint) {
        const attempt = ++this.connectionAttempt;
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
        const previous = this.ws;
        this.ws = null;
        previous?.close();
        this.endpoint = endpoint; this.closedByUs = false;
        try {
            await this.ensureSession();
            if (attempt !== this.connectionAttempt) return;
            const scheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const ws = new WebSocket(`${scheme}//${window.location.host}${endpoint}?client_id=${encodeURIComponent(this.clientId)}`);
            this.ws = ws;
            ws.onopen = () => { this.backoff = 500; this.dispatch('connect'); if (endpoint.startsWith('/ws/rooms/')) this.send('join_room', { roomId: endpoint.split('/').pop(), color: getUserColor() }); else this.getRooms(); };
            ws.onmessage = ({ data }) => this.handleMessage(data);
            ws.onerror = () => this.dispatch('connect_error', new Error('WebSocket connection failed'));
            ws.onclose = () => { if (this.ws !== ws) return; this.dispatch('disconnect', 'closed'); if (!this.closedByUs) this.scheduleReconnect(); };
        } catch (error) {
            if (attempt !== this.connectionAttempt) return;
            this.dispatch('connect_error', error);
            this.scheduleReconnect();
        }
    }
    handleMessage(data) {
        try {
            const { type, payload } = JSON.parse(data);
            if (type === 'room_created' && payload?.roomId) { localStorage.setItem('currentRoomId', payload.roomId); this.switchToRoom(payload.roomId); return; }
            this.dispatch(type === 'error' ? 'error' : type, type === 'error' ? (payload?.message || payload) : payload);
        } catch { this.dispatch('error', 'Invalid server message'); }
    }
    scheduleReconnect() { if (this.retryTimer || !this.endpoint) return; const delay = this.backoff; this.backoff = Math.min(this.backoff * 2, 8000); this.retryTimer = setTimeout(() => { this.retryTimer = null; this.connectTo(this.endpoint); }, delay); }
    switchToRoom(roomId) { if (this.endpoint === `/ws/rooms/${roomId}`) return; this.closedByUs = true; this.ws?.close(); this.connectTo(`/ws/rooms/${roomId}`); }
    send(type, payload = {}) { if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type, payload })); }
    getSocket() { return this.socket; }
    createRoom(color, rotateable = false, isPrivate = false) { this.send('create_room', { color, rotateable, isPrivate }); }
    joinRoom(roomId, color) { localStorage.setItem('currentRoomId', roomId); this.switchToRoom(roomId); }
    updateDrawing(roomId, pixels) { this.send('update_drawing', { roomId, pixels }); }
    placeFigure(roomId, pixels) { this.send('place_figure', { roomId, pixels }); }
    getRooms() { this.send('get_rooms'); }
    updatePlayerColor(roomId, color) { this.send('update_player_color', { roomId, color }); }
    restartGame(roomId) { this.send('restart_game', { roomId }); }
    leaveRoom(roomId) { this.send('leave_room', { roomId }); this.closedByUs = true; this.ws?.close(); this.connectTo('/ws/lobby'); }
}
export default new SocketManager();
