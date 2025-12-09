/**
 * Game Room Manager - Manages active games in memory
 * Handles game lifecycle, room tracking, and disconnect recovery
 */

// Define restore timeout constant
const RESTORE_TIMEOUT_MS = 600000; // 10 minutes in milliseconds
const INACTIVITY_TIMEOUT_MS = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
const EMPTY_GRID_DELETE_TIMEOUT_MS = 60 * 1000; // 1 minute
const ACTIVE_GRID_DELETE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

class GameRoomManager {
  constructor() {
    this.games = new Map(); // Map<roomId, Game>
    this.recentlyDisconnected = new Map(); // Map<userId, { roomId, snapshot, timestamp }>
    this.pendingDeletionTimers = new Map(); // Map<roomId, { timeoutId, deleteAt }>
  }

  /**
   * Create a new game room
   * @param {string} roomId - Room identifier
   * @param {Game} game - Game instance
   */
  createRoom(roomId, game) {
    this.games.set(roomId, game);
    game.lastActivity = Date.now();
  }

  /**
   * Get a game room by ID
   * @param {string} roomId - Room identifier
   * @returns {Game|null} Game instance or null if not found
   */
  getRoom(roomId) {
    return this.games.get(roomId) || null;
  }

  /**
   * Check if a room exists
   * @param {string} roomId - Room identifier
   * @returns {boolean} True if room exists
   */
  hasRoom(roomId) {
    return this.games.has(roomId);
  }

  /**
   * Delete a game room
   * @param {string} roomId - Room identifier
   */
  deleteRoom(roomId) {
    this.cancelRoomDeletion(roomId);
    this.games.delete(roomId);
  }

  /**
   * Get all active rooms
   * @returns {Map} Map of all rooms
   */
  getAllRooms() {
    return this.games;
  }

  /**
   * Get all rooms as an array
   * @returns {Array} Array of room objects with id
   */
  getRoomsList() {
    return Array.from(this.games.values()).map(g => ({ id: g.id }));
  }

  /**
   * Update room activity timestamp
   * @param {string} roomId - Room identifier
   */
  updateRoomActivity(roomId) {
    const game = this.games.get(roomId);
    if (game) {
      game.lastActivity = Date.now();
    }
  }

  /**
   * Add a recent disconnect record for quick restore
   * @param {string} userId - User ID
   * @param {Object} data - Disconnect data { roomId, snapshot, timestamp }
   */
  addRecentDisconnect(userId, data) {
    this.recentlyDisconnected.set(userId, {
      ...data,
      timestamp: data.timestamp || Date.now()
    });
  }

  /**
   * Get recent disconnect data for a user
   * @param {string} userId - User ID
   * @returns {Object|null} Disconnect data or null if not found/expired
   */
  getRecentDisconnect(userId) {
    const data = this.recentlyDisconnected.get(userId);
    if (!data) return null;

    // Check if expired
    if (Date.now() - data.timestamp > RESTORE_TIMEOUT_MS) {
      this.recentlyDisconnected.delete(userId);
      return null;
    }

    return data;
  }

  /**
   * Remove recent disconnect record
   * @param {string} userId - User ID
   */
  removeRecentDisconnect(userId) {
    this.recentlyDisconnected.delete(userId);
  }

  /**
   * Clean up expired disconnect records
   * @returns {number} Number of records removed
   */
  cleanupDisconnected() {
    const now = Date.now();
    let removed = 0;

    for (const [userId, data] of this.recentlyDisconnected.entries()) {
      if (now - data.timestamp > RESTORE_TIMEOUT_MS) {
        this.recentlyDisconnected.delete(userId);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Clean up inactive rooms
   * @param {Function} onRoomDeleted - Callback called for each deleted room (roomId)
   * @returns {Array} Array of deleted room IDs
   */
  cleanupInactiveRooms(onRoomDeleted = null) {
    const now = Date.now();
    const inactiveRooms = [];

    for (const [roomId, game] of this.games.entries()) {
      if (game.lastActivity && (now - game.lastActivity > INACTIVITY_TIMEOUT_MS)) {
        inactiveRooms.push(roomId);
      }
    }

    inactiveRooms.forEach(roomId => {
      console.log(`Deleted inactive room ${roomId} (no activity for over 12 hours)`);
      this.games.delete(roomId);
      if (onRoomDeleted) {
        onRoomDeleted(roomId);
      }
    });

    return inactiveRooms;
  }

  /**
   * Get restore timeout constant
   * @returns {number} Restore timeout in milliseconds
   */
  getRestoreTimeout() {
    return RESTORE_TIMEOUT_MS;
  }

  /**
   * Schedule a delayed room deletion with automatic cleanup
   * @param {string} roomId
   * @param {number} timeoutMs
   * @param {Function} callback - async-safe callback executed before deletion
   */
  scheduleRoomDeletion(roomId, timeoutMs, callback) {
    this.cancelRoomDeletion(roomId);
    const timeoutId = setTimeout(async () => {
      this.pendingDeletionTimers.delete(roomId);
      try {
        await callback();
      } catch (error) {
        console.error(`Error during delayed room deletion ${roomId}:`, error);
      }
    }, timeoutMs);

    this.pendingDeletionTimers.set(roomId, {
      timeoutId,
      deleteAt: Date.now() + timeoutMs
    });
  }

  /**
   * Cancel scheduled deletion, if any
   * @param {string} roomId
   */
  cancelRoomDeletion(roomId) {
    const timer = this.pendingDeletionTimers.get(roomId);
    if (timer) {
      clearTimeout(timer.timeoutId);
      this.pendingDeletionTimers.delete(roomId);
    }
  }

  /**
   * Decide deletion timeout based on grid state
   * @param {Game} game
   * @returns {number}
   */
  getDeletionTimeoutMs(game) {
    if (!game || typeof game.isGridEmpty !== 'function') {
      return ACTIVE_GRID_DELETE_TIMEOUT_MS;
    }
    return game.isGridEmpty() ? EMPTY_GRID_DELETE_TIMEOUT_MS : ACTIVE_GRID_DELETE_TIMEOUT_MS;
  }
}

module.exports = GameRoomManager;

