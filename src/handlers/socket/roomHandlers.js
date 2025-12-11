/**
 * Room Event Handlers - Handle room-related socket events
 * 
 * SIMPLIFIED ARCHITECTURE:
 * - No database operations on room join/leave
 * - Session restore uses MEMORY ONLY (recentDisconnects)
 * - Database records created only on Game Over (in gameHandlers)
 */

const { Game } = require('../../models/Game');
const { shortUserIdHash } = require('../../utils/socketUtils');
const LobbyService = require('../../services/LobbyService');

/**
 * Create room event handlers
 * @param {Object} gameRoomManager - Game room manager instance
 * @param {Object} gameSessionHelper - Game session helper instance (not used for room operations)
 * @param {Object} repositoryManager - Repository manager instance (not used for room operations)
 * @param {Object} io - Socket.IO server instance
 * @returns {Object} Object with handler functions
 */
function createRoomHandlers(gameRoomManager, gameSessionHelper, repositoryManager, io) {
  /**
   * Handle player leaving a room (both intentional and due to disconnect)
   * @param {Object} socket - Socket instance
   * @param {string} roomId - Room identifier
   */
  async function handlePlayerLeave(socket, roomId) {
    const game = gameRoomManager.getRoom(roomId);
    if (game && game.players.has(socket.id)) {
      console.log(`Player ${shortUserIdHash(socket.userId)} leaving room ${roomId}`);

      // Snapshot player state to memory for quick reconnect
      const snapshot = game.getPlayerState(socket.id);
      gameRoomManager.addRecentDisconnect(socket.userId, {
        roomId,
        snapshot,
        timestamp: Date.now()
      });

      // Clear active flag
      game.userIdToSocket.delete(socket.userId);

      // Remove the player from the game
      game.removePlayer(socket.id);

      // If room is empty, schedule deletion
      if (game.players.size === 0) {
        const gridEmpty = typeof game.isGridEmpty === 'function' ? game.isGridEmpty() : true;
        const timeoutMs = gameRoomManager.getDeletionTimeoutMs(game);
        const timeoutLabel = gridEmpty ? '1 minute' : '1 hour';
        console.log(`Room ${roomId} is empty, scheduled for deletion in ${timeoutLabel}`);

        gameRoomManager.scheduleRoomDeletion(roomId, timeoutMs, () => {
          gameRoomManager.deleteRoom(roomId);
          LobbyService.broadcastRoomsList(io, gameRoomManager.getAllRooms());
          console.log(`Room ${roomId} deleted due to timeout`);
        });
      }

      // Notify other players in the room about player leaving
      socket.to(roomId).emit('player_left', {
        playerId: socket.id
      });

      // Send updated players list to remaining players
      const playersList = game.getPlayersList();
      io.to(roomId).emit('players_list_updated', { playersList });
      LobbyService.broadcastGameUpdate(game, io);
    }
  }

  /**
   * Handle create_room event
   */
  async function handleCreateRoom(socket, { color, rotateable = false }) {
    const roomId = Math.random().toString(36).substring(7);
    const game = new Game(roomId, rotateable);
    game.addPlayer(socket.id, color, socket.userId);

    // No database operations - session state is in memory only
    gameRoomManager.createRoom(roomId, game);
    socket.join(roomId);
    socket.leave('lobby');
    console.log(`Player ${shortUserIdHash(socket.userId)} created and joined room ${roomId}`);

    const playersList = game.getPlayersList();
    socket.emit('room_created', {
      roomId,
      state: game.getState(),
      playersList
    });
    LobbyService.broadcastGameUpdate(game, io);
    LobbyService.broadcastRoomsList(io, gameRoomManager.getAllRooms());
  }

  /**
   * Handle join_room event
   */
  async function handleJoinRoom(socket, { roomId, color }) {
    if (!gameRoomManager.hasRoom(roomId)) {
      socket.emit('error', 'Room not found');
      console.log(`Player ${shortUserIdHash(socket.userId)} attempted to join non-existent room ${roomId}`);
      return;
    }

    socket.join(roomId);
    socket.leave('lobby');
    console.log(`Player ${shortUserIdHash(socket.userId)} joined room ${roomId}`);

    const game = gameRoomManager.getRoom(roomId);
    gameRoomManager.cancelRoomDeletion(roomId);
    gameRoomManager.updateRoomActivity(roomId);

    // Check for duplicate userId
    if (game.hasActiveUserId(socket.userId)) {
      socket.emit('error', 'User already connected to this room');
      socket.leave(roomId);
      console.log(`Player ${shortUserIdHash(socket.userId)} already in room ${roomId}, rejected`);
      return;
    }

    // Check memory for quick reconnect (MEMORY-ONLY restore)
    const recentData = gameRoomManager.getRecentDisconnect(socket.userId);
    if (recentData && recentData.roomId === roomId && !game.gameOver) {
      console.log(`Memory-restoring player ${shortUserIdHash(socket.userId)} to room ${roomId}`);
      game.addPlayer(socket.id, color, socket.userId, recentData.snapshot);
      gameRoomManager.removeRecentDisconnect(socket.userId);

      const playersList = game.getPlayersList();
      socket.emit('room_joined', {
        roomId,
        state: game.getState(),
        playersList,
        restored: true
      });

      const newPlayerData = { id: socket.id, color, score: recentData.snapshot?.score || 0 };
      socket.to(roomId).emit('player_joined_restored', {
        playerId: socket.id,
        player: newPlayerData
      });
      return;
    }

    // Clear any stale disconnect data
    if (recentData) {
      gameRoomManager.removeRecentDisconnect(socket.userId);
    }

    // New player joining
    game.addPlayer(socket.id, color, socket.userId);

    const playersList = game.getPlayersList();
    socket.emit('room_joined', {
      roomId,
      state: game.getState(),
      playersList
    });

    LobbyService.broadcastGameUpdate(game, io);

    const newPlayerData = { id: socket.id, color, score: 0 };
    socket.to(roomId).emit('player_joined', {
      playerId: socket.id,
      player: newPlayerData
    });

    console.log(`New player ${shortUserIdHash(socket.userId)} joined room ${roomId}`);
  }

  /**
   * Handle leave_room event
   */
  async function handleLeaveRoom(socket, { roomId }) {
    await handlePlayerLeave(socket, roomId);
    socket.join('lobby');
    LobbyService.broadcastRoomsList(io, gameRoomManager.getAllRooms());
  }

  /**
   * Handle get_rooms event
   */
  function handleGetRooms(socket) {
    LobbyService.sendRoomsList(socket, gameRoomManager.getAllRooms());
  }

  /**
   * Register all room event handlers on a socket
   * @param {Object} socket - Socket instance
   */
  function registerHandlers(socket) {
    socket.on('create_room', (data) => handleCreateRoom(socket, data));
    socket.on('join_room', (data) => handleJoinRoom(socket, data));
    socket.on('leave_room', (data) => handleLeaveRoom(socket, data));
    socket.on('get_rooms', () => handleGetRooms(socket));
  }

  return {
    handleCreateRoom,
    handleJoinRoom,
    handleLeaveRoom,
    handleGetRooms,
    handlePlayerLeave,
    registerHandlers
  };
}

module.exports = createRoomHandlers;
