// Cloudflare runtime.  The legacy Express/Socket.IO server remains outside this entrypoint.
// @ts-nocheck

export interface Env { DB: D1Database; LOBBY: DurableObjectNamespace; ROOMS: DurableObjectNamespace; }
const SESSION_COOKIE = 'tactris_session';
const SESSION_TTL = 24 * 60 * 60 * 1000;
const RESTORE_TTL = 10 * 60 * 1000;
const EMPTY_TTL = 60 * 1000;
const ACTIVE_EMPTY_TTL = 60 * 60 * 1000;
const INACTIVE_TTL = 12 * 60 * 60 * 1000;
const FIGURES = { I: [[0,0],[1,0],[2,0],[3,0]], O: [[0,0],[1,0],[0,1],[1,1]], T: [[0,0],[1,0],[2,0],[1,1]], S: [[1,0],[2,0],[0,1],[1,1]], Z: [[0,0],[1,0],[1,1],[2,1]], J: [[1,0],[1,1],[1,2],[0,2]], L: [[0,0],[0,1],[0,2],[1,2]] };
const rotations = { I: 2, O: 1, T: 4, S: 2, Z: 2, J: 4, L: 4 };
const normalize = (cells: number[][]) => { const x = Math.min(...cells.map(c => c[0])), y = Math.min(...cells.map(c => c[1])); return cells.map(([a, b]) => [a - x, b - y]); };
const rotate = (cells: number[][]) => normalize(cells.map(([x, y]) => [-y, x]));
function figure(exclude: string[] = []) { const types = Object.keys(FIGURES).filter(t => !exclude.includes(t)); const type = types[Math.floor(Math.random() * types.length)] || 'I'; let cells = FIGURES[type].map(c => [...c]); for (let i = 0; i < Math.floor(Math.random() * rotations[type]); i++) cells = rotate(cells); return { type, cells: normalize(cells) }; }

class Game {
  id: string; grid: any[][]; initialGrid: any[][]; players = new Map<string, any>(); userIdToSocket = new Map<string, string>(); authenticatedUserIds: Record<string, string> = {}; playerJoinTimes: Record<string, number> = {}; gameOver = false; startTime = Date.now(); linesCleared = 0; figuresPlaced = 0; moves: any[] = []; recentDisconnects: any = {}; lastActivity = Date.now(); round = 1;
  constructor(id: string, public rotateable = false, public isPrivate = false) { this.id = id; this.grid = Array.from({ length: 10 }, () => Array(10).fill(null)); this.initialGrid = Array.from({ length: 10 }, () => Array(10).fill(null)); }
  hasActiveUserId(userId: string) { return this.userIdToSocket.has(userId); }
  getPlayerByUserId(userId: string) { const id = this.userIdToSocket.get(userId); return id ? this.players.get(id) : null; }
  addPlayer(id: string, color = 'red', userId?: string, restore?: any) { if (this.players.has(id)) return; const figures = restore?.figures?.map((f: any) => ({ type: f.type, cells: f.cells.map((c: number[]) => [...c]) })) || (() => { const one = figure(); return [one, figure([one.type])]; })(); this.players.set(id, { id, userId, color, score: restore?.score || 0, figures }); this.playerJoinTimes[id] = Date.now(); if (userId) { this.userIdToSocket.set(userId, id); this.authenticatedUserIds[id] = userId; } }
  removePlayer(id: string) { const p = this.players.get(id); if (!p) return false; this.clearTemporary(id); this.players.delete(id); delete this.playerJoinTimes[id]; if (p.userId) this.userIdToSocket.delete(p.userId); delete this.authenticatedUserIds[id]; return true; }
  getPlayerState(id: string) { const p = this.players.get(id); return p && { score: p.score, figures: p.figures.map((f: any) => ({ type: f.type, cells: f.cells.map((c: number[]) => [...c]) })) }; }
  getState() { return { id: this.id, grid: this.grid, players: Object.fromEntries(this.players), gameOver: this.gameOver, rotateable: this.rotateable, isPrivate: this.isPrivate }; }
  getPlayersList() { return [...this.players.values()].map(p => ({ id: p.id, color: p.color, score: p.score, figures: p.figures })); }
  isGridEmpty() { return this.grid.flat().every(c => c === null); }
  clearTemporary(id: string) { this.grid.forEach(row => row.forEach((cell: any, x: number) => { if (cell?.playerId === id && cell.state === 'drawing') row[x] = null; })); }
  updateDrawing(id: string, pixels: any[]) { const p = this.players.get(id); if (!p || this.gameOver) return false; this.clearTemporary(id); for (const point of pixels) if (Number.isInteger(point?.x) && Number.isInteger(point?.y) && point.x >= 0 && point.x < 10 && point.y >= 0 && point.y < 10 && !this.grid[point.y][point.x]) this.grid[point.y][point.x] = { playerId: id, color: p.color, state: 'drawing' }; return true; }
  matches(pixels: any[], f: any) { if (pixels.length !== f.cells.length) return false; let shape = f.cells; for (let n = 0; n < (this.rotateable ? 4 : 1); n++) { const minX = Math.min(...pixels.map(p => p.x)), minY = Math.min(...pixels.map(p => p.y)); if (pixels.every(p => shape.some(([x, y]: number[]) => x === p.x - minX && y === p.y - minY))) return true; shape = rotate(shape); } return false; }
  placeFigure(id: string, pixels: any[]) { const p = this.players.get(id); if (!p || this.gameOver || !Array.isArray(pixels)) return { success: false }; const index = p.figures.findIndex((f: any) => this.matches(pixels, f)); if (index < 0 || pixels.some(point => !Number.isInteger(point?.x) || !Number.isInteger(point?.y) || point.x < 0 || point.x > 9 || point.y < 0 || point.y > 9 || (this.grid[point.y][point.x] && (this.grid[point.y][point.x].playerId !== id || this.grid[point.y][point.x].state !== 'drawing')))) { this.clearTemporary(id); return { success: false }; } this.clearTemporary(id); pixels.forEach(point => this.grid[point.y][point.x] = { playerId: id, color: p.color }); const placed = p.figures[index].type; p.figures[index] = figure([placed, ...p.figures.filter((_: any, i: number) => i !== index).map((f: any) => f.type)]); const cleared = this.clearLines(); p.score += 4 + (cleared.count ? 10 * cleared.count + (cleared.count > 1 ? 10 * cleared.count : 0) : 0); this.figuresPlaced++; return { success: true, clearingResult: cleared.count ? cleared : null }; }
  clearLines() { const rows = this.grid.map((row, y) => row.every(c => c && !c.state) ? y : -1).filter(y => y >= 0), cols = Array.from({ length: 10 }, (_, x) => this.grid.every(row => row[x] && !row[x].state) ? x : -1).filter(x => x >= 0); if (!rows.length && !cols.length) return { count: 0 }; const beforeGrid = structuredClone(this.grid), clearedBlocks: any[] = [], original = new Map<string, [number, number]>(); this.grid.forEach((row, y) => row.forEach((cell, x) => { if (cell && !cell.state) original.set(`${y}:${x}`, [x, y]); if ((rows.includes(y) || cols.includes(x)) && cell && !cell.state) clearedBlocks.push({ x, y, color: cell.color, playerId: cell.playerId }); })); const top = this.grid.slice(0, 5).filter((_, y) => !rows.includes(y)); while (top.length < 5) top.unshift(Array(10).fill(null)); const bottom = this.grid.slice(5).filter((_, y) => !rows.includes(y + 5)); while (bottom.length < 5) bottom.push(Array(10).fill(null)); this.grid = [...top, ...bottom].map(row => { const left = row.slice(0, 5).filter((_, x) => !cols.includes(x)); while (left.length < 5) left.unshift(null); const right = row.slice(5).filter((_, x) => !cols.includes(x + 5)); while (right.length < 5) right.push(null); return [...left, ...right]; }); const movingBlocks: any[] = []; this.grid.forEach((row, y) => row.forEach((cell, x) => { if (!cell || cell.state) return; for (const [key, [fromX, fromY]] of original) { const source = beforeGrid[fromY][fromX]; if (source === cell && (fromX !== x || fromY !== y)) { movingBlocks.push({ fromX, fromY, toX: x, toY: y, dx: x - fromX, dy: y - fromY, color: cell.color, playerId: cell.playerId }); original.delete(key); break; } } })); const count = rows.length + cols.length; this.linesCleared += count; return { count, beforeGrid, clearedBlocks, movingBlocks, afterGrid: structuredClone(this.grid) }; }
  updatePlayerColor(id: string, color: string) { const p = this.players.get(id); if (!p) return false; p.color = color; return true; }
  canPlaceFigure(id: string, f: any) { return f?.cells?.some ? Array.from({ length: 10 }, (_, y) => Array.from({ length: 10 }, (_, x) => f.cells.every(([dx, dy]: number[]) => x + dx < 10 && y + dy < 10 && (!this.grid[y + dy][x + dx] || (this.grid[y + dy][x + dx].playerId === id && this.grid[y + dy][x + dx].state === 'drawing')))).some(Boolean)).some(Boolean) : false; }
  checkGameOver() { if (this.gameOver) return true; if ([...this.players.entries()].some(([id, p]) => p.figures.some((f: any) => this.canPlaceFigure(id, f)))) return false; this.gameOver = true; return true; }
  restart() { this.grid = Array.from({ length: 10 }, () => Array(10).fill(null)); this.gameOver = false; this.startTime = Date.now(); this.linesCleared = 0; this.figuresPlaced = 0; for (const p of this.players.values()) { const one = figure(); p.score = 0; p.figures = [one, figure([one.type])]; } }
  getPlayerDuration(id: string) { return Math.floor((Date.now() - (this.playerJoinTimes[id] || Date.now())) / 1000); }
  getGameResult(id: string) { const p = this.players.get(id); if (!p) return 'unknown'; const scores = [...this.players.values()].map(x => x.score), max = Math.max(...scores); return p.score === max ? (scores.filter(x => x === max).length > 1 ? 'draw' : 'win') : 'loss'; }
}

const json = (value: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(value), { ...init, headers: { 'content-type': 'application/json; charset=utf-8', ...(init.headers || {}) } });
const frame = (type: string, payload: unknown = {}) => JSON.stringify({ type, payload });
const parseCookies = (header: string | null) => Object.fromEntries((header || '').split(';').map(x => x.trim().split('=').map(decodeURIComponent)).filter(x => x.length === 2));
async function hash(value: string) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(v => v.toString(16).padStart(2, '0')).join(''); }
async function userFromRequest(request: Request, env: Env) {
  const token = parseCookies(request.headers.get('cookie'))[SESSION_COOKIE];
  if (!token) return null;
  const row = await env.DB.prepare('SELECT u.id, u.username FROM user_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(await hash(token), Date.now()).first();
  return row as { id: string; username: string } | null;
}
function wsResponse(server: WebSocket) { return new Response(null, { status: 101, webSocket: server }); }
function roomSummary(game: any) { return { roomId: game.id, players: game.players.size, rotateable: game.rotateable, isPrivate: game.isPrivate, gameOver: game.gameOver }; }
function packGame(game: any) { return { state: game.getState(), linesCleared: game.linesCleared, figuresPlaced: game.figuresPlaced, startTime: game.startTime, moves: game.moves, playerJoinTimes: game.playerJoinTimes, recentDisconnects: game.recentDisconnects || {}, lastActivity: game.lastActivity || Date.now(), round: game.round || 1 }; }
function unpackGame(data: any) {
  const game = new Game(data.state.id, data.state.rotateable, data.state.isPrivate);
  game.grid = data.state.grid; game.initialGrid = data.state.initialGrid || game.initialGrid; game.gameOver = data.state.gameOver;
  game.players = new Map(Object.entries(data.state.players || {})); game.userIdToSocket = new Map(); game.authenticatedUserIds = {};
  for (const [id, p] of game.players) { if (p.userId) { game.userIdToSocket.set(p.userId, id); game.authenticatedUserIds[id] = p.userId; } }
  game.linesCleared = data.linesCleared || 0; game.figuresPlaced = data.figuresPlaced || 0; game.startTime = data.startTime || Date.now(); game.moves = data.moves || []; game.playerJoinTimes = data.playerJoinTimes || {}; game.recentDisconnects = data.recentDisconnects || {}; game.lastActivity = data.lastActivity || Date.now(); game.round = data.round || 1;
  return game;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/session/anonymous' && request.method === 'POST') {
      const now = Date.now(), userId = crypto.randomUUID(), token = crypto.randomUUID() + crypto.randomUUID();
      const username = `Player ${userId.slice(0, 6)}`;
      await env.DB.batch([
        env.DB.prepare('INSERT INTO users (id, username, display_name, is_anonymous, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)').bind(userId, username, username, now, now),
        env.DB.prepare('INSERT INTO user_sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), userId, await hash(token), now + SESSION_TTL, now, now)
      ]);
      const secure = url.protocol === 'https:' ? '; Secure' : '';
      return json({ user_id: userId, user: { id: userId, username, is_anonymous: true }, expires_at: now + SESSION_TTL }, { headers: { 'set-cookie': `${SESSION_COOKIE}=${token}; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL / 1000}` } });
    }
    if (url.pathname === '/api/session' && request.method === 'GET') {
      const user = await userFromRequest(request, env);
      return user ? json({ user_id: user.id, user: { id: user.id, username: user.username, is_anonymous: true } }) : json({ error: 'Authentication required' }, { status: 401 });
    }
    if (url.pathname === '/api/user/stats/public') return publicStats(url, env);
    if (url.pathname === '/api/leaderboard') return leaderboard(url, env);
    if (url.pathname === '/ws/lobby' || url.pathname.startsWith('/ws/rooms/')) {
      const user = await userFromRequest(request, env);
      if (!user) return json({ error: 'Authentication required' }, { status: 401 });
      const target = url.pathname === '/ws/lobby' ? env.LOBBY.idFromName('singleton') : env.ROOMS.idFromName(url.pathname.slice('/ws/rooms/'.length));
      const headers = new Headers(request.headers);
      headers.set('x-user-id', user.id);
      headers.set('x-client-id', url.searchParams.get('client_id') || crypto.randomUUID());
      return (url.pathname === '/ws/lobby' ? env.LOBBY.get(target) : env.ROOMS.get(target)).fetch(new Request(request, { headers }));
    }
    return new Response('Not found', { status: 404 });
  }
} satisfies ExportedHandler<Env>;

async function publicStats(url: URL, env: Env) {
  const id = url.searchParams.get('user_id'); if (!id) return json({ error: 'user_id parameter is required' }, { status: 400 });
  const row = await env.DB.prepare('SELECT * FROM game_statistics WHERE user_id=?').bind(id).first() as any;
  return json(row || { user_id: id, total_games: 0, total_score: 0, average_score: 0, best_score: 0, total_lines_cleared: 0, average_lines_cleared: 0, best_lines_cleared: 0, total_figures_placed: 0, total_play_time_seconds: 0, average_lines_per_game: 0, rating: 1000 });
}
async function leaderboard(url: URL, env: Env) {
  const period = url.searchParams.get('period') || 'global'; if (!['daily', 'weekly', 'global'].includes(period)) return json({ error: 'Invalid period' }, { status: 400 });
  const since = period === 'daily' ? Date.now() - 86400000 : period === 'weekly' ? Date.now() - 604800000 : 0;
  const { results } = await env.DB.prepare('SELECT u.id user_id, COALESCE(u.display_name, u.username) display_name, MAX(gs.score) best_score, COUNT(gs.id) games_played FROM game_sessions gs JOIN users u ON u.id=gs.player_id WHERE gs.score>0 AND gs.created_at>=? GROUP BY u.id ORDER BY best_score DESC LIMIT 10').bind(since).all();
  return json({ period, leaderboard: results.map((r: any, index) => ({ ...r, rank: index + 1 })) });
}

export class LobbyDurableObject {
  constructor(readonly ctx: DurableObjectState, readonly env: Env) {}
  async fetch(request: Request) {
    const url = new URL(request.url);
    if (url.pathname === '/room-update' && request.method === 'POST') {
      const { preview, ...update } = await request.json<any>();
      const rooms = await this.rooms();
      const previewKey = `preview:${update.roomId}`;
      if (update.deleted) delete rooms[update.roomId];
      else rooms[update.roomId] = update;
      if (update.deleted || update.isPrivate || !preview) {
        await Promise.all([this.ctx.storage.delete(previewKey), this.ctx.storage.put('rooms', rooms)]);
      } else {
        await this.ctx.storage.put({ rooms, [previewKey]: preview });
      }
      this.broadcast('rooms_list', Object.values(rooms).filter(room => !room.isPrivate));
      if (!update.deleted && !update.isPrivate && preview) this.broadcast('lobby_game_update', preview);
      return new Response();
    }
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected websocket', { status: 426 });
    const previews = await this.ctx.storage.list({ prefix: 'preview:' });
    const pair = new WebSocketPair(), client = pair[0], server = pair[1]; this.ctx.acceptWebSocket(server); server.serializeAttachment({ userId: request.headers.get('x-user-id'), clientId: request.headers.get('x-client-id') }); server.send(frame('initial_lobby_state', Array.from(previews.values()))); return wsResponse(client);
  }
  async webSocketMessage(ws: WebSocket, message: string) { try { const event = JSON.parse(message); if (event.type === 'get_rooms') ws.send(frame('rooms_list', Object.values(await this.rooms()).filter((r: any) => !r.isPrivate))); else if (event.type === 'create_room') { const roomId = crypto.randomUUID().slice(0, 8), id = this.env.ROOMS.idFromName(roomId), payload = { ...event.payload, roomId }; await this.env.ROOMS.get(id).fetch('https://room/internal/init', { method: 'POST', body: JSON.stringify(payload) }); ws.send(frame('room_created', { roomId })); } else ws.send(frame('error', { code: 'invalid_event', message: 'Unsupported lobby event' })); } catch { ws.send(frame('error', { code: 'bad_payload', message: 'Invalid JSON frame' })); } }
  async rooms() { return (await this.ctx.storage.get<Record<string, any>>('rooms')) || {}; }
  broadcast(type: string, payload: unknown) { for (const ws of this.ctx.getWebSockets()) ws.send(frame(type, payload)); }
}

export class RoomDurableObject {
  constructor(readonly ctx: DurableObjectState, readonly env: Env) {}
  async fetch(request: Request) {
    const url = new URL(request.url);
    if (url.pathname === '/internal/init') { const input = await request.json<any>(); if (!(await this.ctx.storage.get('game'))) { const game = new Game(input.roomId, !!input.rotateable, !!input.isPrivate); game.round = 1; await this.save(game); await this.notifyLobby(game); } return new Response(); }
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected websocket', { status: 426 });
    const pair = new WebSocketPair(), client = pair[0], server = pair[1]; this.ctx.acceptWebSocket(server); server.serializeAttachment({ userId: request.headers.get('x-user-id'), clientId: request.headers.get('x-client-id') }); return wsResponse(client);
  }
  async webSocketMessage(ws: WebSocket, message: string) {
    try { const event = JSON.parse(message), attachment = ws.deserializeAttachment(), game = await this.game(); if (!game) return this.error(ws, 'not_found', 'Room not found'); const payload = event.payload || {}, id = attachment.clientId;
      if (event.type === 'join_room') { const existing = game.getPlayerByUserId(attachment.userId); const snapshot = game.recentDisconnects?.[attachment.userId]; if (existing && existing.id !== id) return this.error(ws, 'already_connected', 'User already connected to this room'); game.addPlayer(id, payload.color, attachment.userId, snapshot?.snapshot); game.players.get(id).userId = attachment.userId; delete game.recentDisconnects?.[attachment.userId]; await this.save(game); ws.send(frame('room_joined', { roomId: game.id, state: game.getState(), playersList: game.getPlayersList(), restored: !!snapshot })); this.broadcast('player_joined', { playerId: id, player: game.players.get(id) }, ws); await this.notifyLobby(game); return; }
      if (!game.players.has(id)) return this.error(ws, 'not_joined', 'Join the room first');
      let success = false, update: any = game.getState();
      if (event.type === 'update_drawing') success = Array.isArray(payload.pixels) && game.updateDrawing(id, payload.pixels);
      else if (event.type === 'place_figure') { const result = Array.isArray(payload.pixels) && game.placeFigure(id, payload.pixels); success = !!result?.success; update = result?.clearingResult ? { ...game.getState(), clearingDetails: result.clearingResult } : game.getState(); }
      else if (event.type === 'update_player_color') success = typeof payload.color === 'string' && game.updatePlayerColor(id, payload.color);
      else if (event.type === 'restart_game') { game.restart(); game.round++; success = true; this.broadcast('game_restarted', {}); }
      else if (event.type === 'leave_room') { await this.leave(game, id, attachment.userId); return; }
      else return this.error(ws, 'invalid_event', 'Unsupported room event');
      if (!success) return this.error(ws, 'invalid_move', 'Invalid move');
      game.lastActivity = Date.now(); await this.save(game); this.broadcast('game_update', update); if (event.type === 'update_player_color' || event.type === 'restart_game') this.broadcast('players_list_updated', { playersList: game.getPlayersList() }); await this.notifyLobby(game);
      if (event.type === 'place_figure' && game.checkGameOver()) {
        // `checkGameOver` mutates state; persist it before notifying clients so a
        // hibernated DO cannot accept extra moves after reactivation.
        game.lastActivity = Date.now();
        await this.save(game);
        await this.persistResults(game);
        this.broadcast('game_over', {});
        await this.notifyLobby(game);
      }
    } catch { this.error(ws, 'bad_payload', 'Invalid JSON frame'); }
  }
  async webSocketClose(ws: WebSocket) { const a = ws.deserializeAttachment(); const game = await this.game(); if (game?.players.has(a.clientId)) await this.leave(game, a.clientId, a.userId); }
  async leave(game: any, id: string, userId: string) { game.recentDisconnects ||= {}; game.recentDisconnects[userId] = { snapshot: game.getPlayerState(id), timestamp: Date.now() }; game.userIdToSocket.delete(userId); game.removePlayer(id); game.lastActivity = Date.now(); await this.save(game); this.broadcast('player_left', { playerId: id }); this.broadcast('players_list_updated', { playersList: game.getPlayersList() }); await this.notifyLobby(game); }
  async game() { const packed = await this.ctx.storage.get<any>('game'); return packed && unpackGame(packed); }
  async save(game: any) { await this.ctx.storage.put('game', packGame(game)); await this.schedule(game); }
  broadcast(type: string, payload: unknown, except?: WebSocket) { for (const ws of this.ctx.getWebSockets()) if (ws !== except) ws.send(frame(type, payload)); }
  error(ws: WebSocket, code: string, message: string) { ws.send(frame('error', { code, message })); }
  async notifyLobby(game: any, deleted = false) {
    const summary = roomSummary(game);
    const preview = deleted || summary.isPrivate ? undefined : {
      roomId: summary.roomId,
      grid: game.grid,
      players: Array.from(game.players.values(), (player: any) => ({ color: player.color }))
    };
    await this.env.LOBBY.get(this.env.LOBBY.idFromName('singleton')).fetch('https://lobby/room-update', {
      method: 'POST',
      body: JSON.stringify({ ...summary, deleted, preview })
    });
  }
  async schedule(game: any) {
    const now = Date.now(), reconnects = Object.values(game.recentDisconnects || {}).map((x: any) => x.timestamp + RESTORE_TTL);
    // A reconnect snapshot promises ten minutes of recovery, so an otherwise
    // empty room must not be deleted by the shorter empty-room deadline.
    const emptyDeadline = game.players.size === 0 && reconnects.length === 0 ? now + (game.isGridEmpty() ? EMPTY_TTL : ACTIVE_EMPTY_TTL) : Infinity;
    await this.ctx.storage.setAlarm(Math.min(game.lastActivity + INACTIVE_TTL, emptyDeadline, ...reconnects));
  }
  async alarm() {
    const game = await this.game(); if (!game) return;
    const now = Date.now();
    for (const [id, snapshot] of Object.entries(game.recentDisconnects || {})) if (now - (snapshot as any).timestamp >= RESTORE_TTL) delete game.recentDisconnects[id];
    const hasReconnects = Object.keys(game.recentDisconnects || {}).length > 0;
    const deleteRoom = now - game.lastActivity >= INACTIVE_TTL || (game.players.size === 0 && !hasReconnects && now - game.lastActivity >= (game.isGridEmpty() ? EMPTY_TTL : ACTIVE_EMPTY_TTL));
    if (deleteRoom) { await this.notifyLobby(game, true); await this.ctx.storage.deleteAll(); return; }
    await this.save(game);
  }
  async persistResults(game: any) { const now = Date.now(), operations: D1PreparedStatement[] = []; for (const [id, player] of game.players) { const userId = player.userId; if (!userId) continue; const key = `${game.id}:${game.round}:${userId}`, duration = game.getPlayerDuration(id), result = game.getGameResult(id); operations.push(this.env.DB.prepare('INSERT OR IGNORE INTO game_sessions (id,room_id,round_number,player_id,player_color,score,lines_cleared,figures_placed,duration_seconds,game_result,final_grid,created_at,idempotency_key) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(), game.id, game.round, userId, player.color, player.score, game.linesCleared, game.figuresPlaced, duration, result, JSON.stringify(game.grid), now, key)); } if (operations.length) await this.env.DB.batch(operations); }
}
