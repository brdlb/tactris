/**
 * Game Event Handlers - Handle game-related socket events
 */

const LobbyService = require('../../services/LobbyService');

/**
 * Create game event handlers
 * @param {Object} gameRoomManager - Game room manager instance
 * @param {Object} gameSessionHelper - Game session helper instance
 * @param {Object} io - Socket.IO server instance
 * @returns {Object} Object with handler functions
 */
function createGameHandlers(gameRoomManager, gameSessionHelper, io) {
  /**
   * Handle place_pixel event
   */
  function handlePlacePixel(socket, { roomId, status, position }) {
    const game = gameRoomManager.getRoom(roomId);
    if (game) {
      const success = game.placePixel(socket.id, status, position);
      if (success) {
        const gameState = game.getState();
        io.to(roomId).emit('game_update', gameState);
        // Don't broadcast to lobby on pixel placement - only on figure placement and line clearing
      } else {
        socket.emit('error', 'Invalid move');
      }
    }
  }

  /**
   * Handle place_figure event
   */
  async function handlePlaceFigure(socket, { roomId, pixels }) {
    const game = gameRoomManager.getRoom(roomId);
    if (game) {
      const success = game.placeFigure(socket.id, pixels, roomId, io);
      if (success) {
        const gameState = game.getState();
        io.to(roomId).emit('game_update', gameState);
        LobbyService.broadcastGameUpdate(game, io);
        
        if (game.checkGameOver()) {
          await gameSessionHelper.completeAllPlayerSessions(roomId, game);
          io.to(roomId).emit('game_over');
        }
      } else {
        socket.emit('error', 'Invalid move');
        // Revert client state
        socket.emit('game_update', game.getState());
      }
    }
  }

  /**
   * Handle update_player_color event
   */
  function handleUpdatePlayerColor(socket, { roomId, color }) {
    const game = gameRoomManager.getRoom(roomId);
    if (game) {
      const success = game.updatePlayerColor(socket.id, color);
      if (success) {
        // Send updated game state to all players in the room
        const gameState = game.getState();
        const playersList = game.getPlayersList();
        io.to(roomId).emit('game_update', gameState);
        io.to(roomId).emit('players_list_updated', { playersList });
        // Don't broadcast to lobby on color update - only on figure placement and line clearing
      } else {
        socket.emit('error', 'Player not found in room');
      }
    } else {
      socket.emit('error', 'Room not found');
    }
  }

  /**
   * Handle restart_game event
   */
  async function handleRestartGame(socket, { roomId }) {
    const game = gameRoomManager.getRoom(roomId);
    if (game) {
      // Before restarting, we should consider creating a new game session or updating the existing one
      // For now, we'll just restart the game instance
      game.restart();
      
      // Update all player game sessions to reflect the restart (mark as in progress again)
      if (gameSessionHelper) {
        await gameSessionHelper.resetGameSessionsOnRestart(game);
      }
      
      // Send updated game state to all players in the room
      const gameState = game.getState();
      const playersList = game.getPlayersList();
      io.to(roomId).emit('game_update', gameState);
      io.to(roomId).emit('players_list_updated', { playersList });
      io.to(roomId).emit('game_restarted');
      LobbyService.broadcastGameUpdate(game, io);
    } else {
      socket.emit('error', 'Room not found');
    }
  }

  /**
   * Register all game event handlers on a socket
   * @param {Object} socket - Socket instance
   */
  function registerHandlers(socket) {
    socket.on('place_pixel', (data) => handlePlacePixel(socket, data));
    socket.on('place_figure', (data) => handlePlaceFigure(socket, data));
    socket.on('update_player_color', (data) => handleUpdatePlayerColor(socket, data));
    socket.on('restart_game', (data) => handleRestartGame(socket, data));
  }

  return {
    handlePlacePixel,
    handlePlaceFigure,
    handleUpdatePlayerColor,
    handleRestartGame,
    registerHandlers
  };
}

module.exports = createGameHandlers;

