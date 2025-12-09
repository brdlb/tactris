/**
 * Lobby Service - Manages lobby state and broadcasts updates
 */

class LobbyService {
  /**
   * Broadcast game update to all clients in lobby
   * @param {Game} game - Game instance
   * @param {Object} io - Socket.IO server instance
   */
  static broadcastGameUpdate(game, io) {
    console.log(`[LOBBY-SERVICE] broadcastGameUpdate room ${game.id}, players count: ${game.getPlayersList().length}, to lobby`);
    const lobbyState = {
      roomId: game.id,
      grid: game.grid.map(row => row.map(cell => cell ? { ...cell } : null)),
      players: game.getPlayersList().map(({ id, color, score }) => ({ id, color, score }))
    };
    io.to('lobby').emit('lobby_game_update', lobbyState);
  }

  /**
   * Send initial lobby state to a newly connected client
   * @param {Object} socket - Socket instance
   * @param {Map} games - Map of all active games
   */
  static sendInitialLobbyState(socket, games) {
    const initialLobbyState = Array.from(games.values()).map(game => ({
      roomId: game.id,
      grid: game.grid.map(row => row.map(cell => cell ? { ...cell } : null)),
      players: game.getPlayersList().map(({ id, color, score }) => ({ id, color, score }))
    }));
    socket.emit('initial_lobby_state', initialLobbyState);
  }

  /**
   * Broadcast updated rooms list to all clients
   * @param {Object} io - Socket.IO server instance
   * @param {Map} games - Map of all active games
   */
  static broadcastRoomsList(io, games) {
    const roomList = Array.from(games.values()).map(g => ({ id: g.id }));
    io.emit('rooms_list', roomList);
  }

  /**
   * Send rooms list to a specific socket
   * @param {Object} socket - Socket instance
   * @param {Map} games - Map of all active games
   */
  static sendRoomsList(socket, games) {
    const roomList = Array.from(games.values()).map(g => ({ id: g.id }));
    socket.emit('rooms_list', roomList);
  }
}

module.exports = LobbyService;



