/**
 * Room Event Handlers - Handle room-related socket events
 */

const { Game } = require('../../models/Game');
const { shortUserIdHash } = require('../../utils/socketUtils');
const LobbyService = require('../../services/LobbyService');

/**
 * Create room event handlers
 * @param {Object} gameRoomManager - Game room manager instance
 * @param {Object} gameSessionHelper - Game session helper instance
 * @param {Object} repositoryManager - Repository manager instance
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

      // Immediately snapshot player state to memory for quick reconnect
      const snapshot = game.getPlayerState(socket.id);
      gameRoomManager.addRecentDisconnect(socket.userId, {
        roomId,
        snapshot,
        timestamp: Date.now()
      });

      // Clear active flag early (userIdToSocket.delete)
      game.userIdToSocket.delete(socket.userId);

      // Update the game session and statistics for the leaving player BEFORE removing them
      // The completePlayerSessionOnLeave function already handles pause vs complete logic based on game state
      try {
        await gameSessionHelper.completePlayerSessionOnLeave(roomId, socket.id, game);
      } catch (error) {
        console.error(`Error completing player session on leave:`, error);
        return; // Don't clear snapshot or removePlayer on failure
      }
      // Now remove the player from the game
      game.removePlayer(socket.id);

      // Clear memory snapshot on successful disconnect handling
      gameRoomManager.removeRecentDisconnect(socket.userId);

      // If the game was in progress and a player disconnected, we might want to update the game session
      if (!game.gameOver && game.players.size > 0) {
        // Consider the disconnected player as having left/forfeited
        // For now, we'll just continue the game with remaining players
      } else if (game.players.size === 0) {
        // If room is empty, schedule deletion based on grid state
        const gridEmpty = typeof game.isGridEmpty === 'function' ? game.isGridEmpty() : true;
        const timeoutMs = gameRoomManager.getDeletionTimeoutMs(game);
        const timeoutLabel = gridEmpty ? '1 minute' : '1 hour';
        console.log(`Room ${roomId} is empty, scheduled for deletion in ${timeoutLabel}`);

        gameRoomManager.scheduleRoomDeletion(roomId, timeoutMs, async () => {
          if (game.playerSessions) {
            const sessionIds = Object.values(game.playerSessions);
            for (const sessionId of sessionIds) {
              if (!sessionId) continue;
              try {
                await repositoryManager.gameSessions.update(sessionId, {
                  game_result: 'abandoned'
                });
                const abandonedSession = await repositoryManager.gameSessions.findById(sessionId);
                console.log(`[DIAGNOSTIC] Session after empty room abandoned override: game_result='${abandonedSession?.game_result || 'null'}', paused_at='${abandonedSession?.paused_at || 'null'}'`);
              } catch (error) {
                console.error(`Error updating game session for abandoned game (session ${sessionId}):`, error);
              }
            }
          }
          gameRoomManager.deleteRoom(roomId);
          LobbyService.broadcastRoomsList(io, gameRoomManager.getAllRooms());
          console.log(`Room ${roomId} deleted due to timeout (${gridEmpty ? 'empty grid' : 'has figures'})`);
        });
      }

      // Notify other players in the room about player leaving
      socket.to(roomId).emit('player_left', {
        playerId: socket.id
      });

      // Send updated players list to remaining players
      const playersList = game.getPlayersList();
      io.to(roomId).emit('players_list_updated', { playersList });
      console.log(`[PLAYER-LEAVE] Broadcasting lobby_game_update for ${roomId}, players left: ${game.players.size}`);
      LobbyService.broadcastGameUpdate(game, io);
    }
  }

  /**
   * Handle create_room event
   */
  async function handleCreateRoom(socket, { color, rotateable = false }) {
    const roomId = Math.random().toString(36).substring(7);
    const game = new Game(roomId, rotateable);
    game.addPlayer(socket.id, color, socket.userId); // Add creator as player with their color and authenticated user ID

    // Create a game session record in the database for the creator
    await gameSessionHelper.createGameSession(game, socket.id, socket.userId, false);

    gameRoomManager.createRoom(roomId, game);
    socket.join(roomId);
    socket.leave('lobby');
    console.log(`Player ${shortUserIdHash(socket.userId)} left lobby and joined room ${roomId}`);

    // Send players list to the room creator
    const playersList = game.getPlayersList();
    socket.emit('room_created', {
      roomId,
      state: game.getState(),
      playersList
    });
    LobbyService.broadcastGameUpdate(game, io);

    // Broadcast updated room list to all clients
    LobbyService.broadcastRoomsList(io, gameRoomManager.getAllRooms());
  }

  /**
   * Handle join_room event
   */
  async function handleJoinRoom(socket, { roomId, color }) {
    if (gameRoomManager.hasRoom(roomId)) {
      socket.join(roomId);
      socket.leave('lobby');
      console.log(`Player ${shortUserIdHash(socket.userId)} left lobby and connected to room ${roomId}`);
      const game = gameRoomManager.getRoom(roomId);
      gameRoomManager.cancelRoomDeletion(roomId);
      gameRoomManager.updateRoomActivity(roomId);

      // Log the join event
      console.log(`Player ${shortUserIdHash(socket.userId)} joining room ${roomId}`);

      // Check for duplicate userId in the game to prevent multiple connections
      if (game.hasActiveUserId(socket.userId)) {
        socket.emit('error', 'User already connected to this room');
        socket.leave(roomId);
        console.log(`Player ${shortUserIdHash(socket.userId)} already in room ${roomId}, connection rejected`);
        return;
      }

      console.log(`Attempting to join room ${roomId} for player ${shortUserIdHash(socket.userId)}`);

      // Check memory first for quick reconnect (Memory-First Restore)
      const recentData = gameRoomManager.getRecentDisconnect(socket.userId);
      if (recentData) {
        console.log(`Memory restore candidate found for ${shortUserIdHash(socket.userId)} in room ${roomId}, expected ${recentData.roomId}`);
        if (recentData.roomId === roomId &&
          gameRoomManager.hasRoom(roomId)) {
          const gameForRestore = gameRoomManager.getRoom(roomId);
          if (!gameForRestore.gameOver) {
            console.log(`Memory-restoring player ${shortUserIdHash(socket.userId)} to room ${roomId}`);
            gameForRestore.addPlayer(socket.id, color, socket.userId, recentData.snapshot);
            gameRoomManager.removeRecentDisconnect(socket.userId);

            // Associate restored session with new socket ID if session exists
            if (gameForRestore.playerSessions) {
              // Find the session ID by searching through playerSessions for the userId
              // We need to find the old socket ID or session
              // For now, we'll create a new session or restore from paused
            }

            const playersList = gameForRestore.getPlayersList();
            socket.emit('room_joined', {
              roomId,
              state: gameForRestore.getState(),
              playersList,
              restored: true
            });
            const newPlayerData = { id: socket.id, color, score: recentData.snapshot.score || 0 };
            socket.to(roomId).emit('player_joined_restored', {
              playerId: socket.id,
              player: newPlayerData
            });
            return;
          } else {
            console.log(`Game over, clearing memory snapshot for ${shortUserIdHash(socket.userId)}`);
            gameRoomManager.removeRecentDisconnect(socket.userId);
          }
        } else {
          gameRoomManager.removeRecentDisconnect(socket.userId);
        }
      }

      // Check for recent paused session to restore (for unexpected disconnections)
      const recentPaused = await repositoryManager.gameSessions.findRestoreCandidate(socket.userId, roomId);
      console.log(`Checking for restore candidate for player ${shortUserIdHash(socket.userId)} in room ${roomId}: ${recentPaused ? 'FOUND' : 'NOT FOUND'}`);
      if (recentPaused && !game.gameOver) {
        const restoreState = recentPaused.player_state || {};
        console.log(`[DEBUG] Restore state loaded directly (jsonb): keys=${Object.keys(restoreState).join(', ') || 'none'}`);
        game.addPlayer(socket.id, color, socket.userId, restoreState);

        // Associate restored session with new socket ID
        if (!game.playerSessions) {
          game.playerSessions = {};
        }
        game.playerSessions[socket.id] = recentPaused.id;
        console.log(`[DIAGNOSTIC] Associated restored session ${recentPaused.id} with new socket ${socket.id.slice(-6)}`);

        // Update the session to mark it as restored (not paused anymore)
        await repositoryManager.gameSessions.update(recentPaused.id, {
          ending_reason: null,
          paused_at: null
        });

        // Send current players list to the joining user with restore flag
        const playersList = game.getPlayersList();
        socket.emit('room_joined', {
          roomId,
          state: game.getState(),
          playersList,
          restored: true
        });

        // Notify other players in the room about player joined restored
        const newPlayerData = { id: socket.id, color, score: restoreState.score };
        socket.to(roomId).emit('player_joined_restored', {
          playerId: socket.id,
          player: newPlayerData
        });

        console.log(`Returning player ${shortUserIdHash(socket.userId)} restored to room ${roomId}`);
        return; // Exit early after restoration
      }

      // Check if player has an existing session in this room that is paused
      const existingSession = await repositoryManager.gameSessions.findByPlayerAndRoom(socket.userId, roomId);
      if (existingSession && existingSession.game_result === 'paused') {
        // Player has a paused session, restore it
        try {
          const restoreState = existingSession.player_state ?
            (typeof existingSession.player_state === 'string' ? JSON.parse(existingSession.player_state) : existingSession.player_state)
            : {};
          game.addPlayer(socket.id, color, socket.userId, restoreState);

          // Associate restored session with new socket ID
          if (!game.playerSessions) {
            game.playerSessions = {};
          }
          game.playerSessions[socket.id] = existingSession.id;
          console.log(`[DIAGNOSTIC] Associated existing paused session ${existingSession.id} with new socket ${socket.id.slice(-6)}`);

          // Update the session to mark it as restored (not paused anymore)
          await repositoryManager.gameSessions.update(existingSession.id, {
            ending_reason: null,
            paused_at: null
          });

          // Send current players list to the joining user with restore flag
          const playersList = game.getPlayersList();
          socket.emit('room_joined', {
            roomId,
            state: game.getState(),
            playersList,
            restored: true
          });

          // Notify other players in the room about player joined restored
          const newPlayerData = { id: socket.id, color, score: restoreState.score };
          socket.to(roomId).emit('player_joined_restored', {
            playerId: socket.id,
            player: newPlayerData
          });

          console.log(`Returning player ${shortUserIdHash(socket.userId)} restored paused session in room ${roomId}`);
          return; // Exit early after restoration
        } catch (error) {
          console.error(`Error restoring paused session for player ${shortUserIdHash(socket.userId)} in room ${roomId}:`, error);
        }
      }

      game.addPlayer(socket.id, color, socket.userId); // Add joiner as player with their color and authenticated user ID

      // Create a game session record in the database for the joining player
      await gameSessionHelper.createGameSession(game, socket.id, socket.userId, true);

      // Send current players list to the joining user
      const playersList = game.getPlayersList();
      socket.emit('room_joined', {
        roomId,
        state: game.getState(),
        playersList
      });

      LobbyService.broadcastGameUpdate(game, io);
      // Notify other players in the room about new player
      const newPlayerData = { id: socket.id, color, score: 0 };
      socket.to(roomId).emit('player_joined', {
        playerId: socket.id,
        player: newPlayerData
      });

      console.log(`New player ${shortUserIdHash(socket.userId)} joined room ${roomId}`);
    } else {
      socket.emit('error', 'Room not found');
      console.log(`Player ${shortUserIdHash(socket.userId)} attempted to join non-existent room ${roomId}`);
    }
  }

  /**
   * Handle leave_room event
   */
  async function handleLeaveRoom(socket, { roomId }) {
    console.log(`[LEAVE-ROOM] ${shortUserIdHash(socket.userId)} starting leave ${roomId}, current socket.rooms:`, Array.from(socket.rooms));
    await handlePlayerLeave(socket, roomId);
    console.log(`[LEAVE-ROOM] After handlePlayerLeave, socket.rooms:`, Array.from(socket.rooms));
    socket.join('lobby');
    console.log(`[LEAVE-ROOM] ${shortUserIdHash(socket.userId)} joined lobby, final socket.rooms:`, Array.from(socket.rooms));
    console.log(`[LEAVE-ROOM] Broadcasting rooms_list after join`);

    // Update room list for all clients
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

