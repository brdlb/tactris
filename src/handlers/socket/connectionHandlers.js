/**
 * Connection Event Handlers - Handle socket connection and disconnection events
 */

const { shortUserIdHash } = require('../../utils/socketUtils');
const LobbyService = require('../../services/LobbyService');

/**
 * Create connection event handlers
 * @param {Object} gameRoomManager - Game room manager instance
 * @param {Object} gameSessionHelper - Game session helper instance
 * @param {Object} repositoryManager - Repository manager instance
 * @param {Object} io - Socket.IO server instance
 * @param {Function} handlePlayerLeave - Function to handle player leaving (from roomHandlers)
 * @returns {Object} Object with handler functions
 */
function createConnectionHandlers(gameRoomManager, gameSessionHelper, repositoryManager, io, handlePlayerLeave) {
  /**
   * Handle new socket connection
   */
  function handleConnection(socket) {
    // Send the anonymous token and user_id to the client if they are an anonymous user
    if (socket.anonymousToken && socket.isAnonymous) {
      socket.emit('anonymous_token', { 
        token: socket.anonymousToken,
        user_id: socket.userId 
      });
      
      // Update the last seen timestamp for the user
      repositoryManager.users.updateLastSeen(socket.userId)
        .catch(err => {
          console.error('Error updating last seen timestamp:', err);
        });
    }

    socket.join('lobby');
    console.log(`Игрок ${shortUserIdHash(socket.userId)} присоединился к лобби`);

    // Send initial lobby state to newly connected client
    LobbyService.sendInitialLobbyState(socket, gameRoomManager.getAllRooms());
  }

  /**
   * Handle socket disconnection
   */
  async function handleDisconnect(socket) {
    // Find all rooms the disconnected user was part of
    const roomsToNotify = [];
    
    for (const [roomId, game] of gameRoomManager.getAllRooms().entries()) {
      if (game.players.has(socket.id)) {
        roomsToNotify.push(roomId);
        if (handlePlayerLeave) {
          await handlePlayerLeave(socket, roomId);
        }
      }
    }
    
    if (roomsToNotify.length > 0) {
      console.log(`Player ${shortUserIdHash(socket.userId)} disconnected from ${roomsToNotify.length} room(s)`);
    } else {
      console.log(`Player ${shortUserIdHash(socket.userId)} disconnected (was not in any rooms)`);
    }
    
    // Update room list for all clients if any rooms were affected
    if (roomsToNotify.length > 0) {
      LobbyService.broadcastRoomsList(io, gameRoomManager.getAllRooms());
    }
  }

  /**
   * Register connection handlers on Socket.IO server
   * @param {Object} io - Socket.IO server instance
   */
  function registerHandlers(io) {
    io.on('connection', (socket) => {
      handleConnection(socket);
      socket.on('disconnect', () => handleDisconnect(socket));
    });
  }

  return {
    handleConnection,
    handleDisconnect,
    registerHandlers
  };
}

module.exports = createConnectionHandlers;

