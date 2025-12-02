/**
 * Periodic Tasks Service - Manages periodic cleanup tasks
 */

const LobbyService = require('./LobbyService');

class PeriodicTasksService {
  constructor(gameRoomManager, io, authService) {
    this.gameRoomManager = gameRoomManager;
    this.io = io;
    this.authService = authService;
    this.intervals = [];
  }

  /**
   * Start inactivity cleanup task
   * Removes rooms that haven't been active for INACTIVITY_TIMEOUT_MS
   * @param {number} intervalMs - Interval in milliseconds (default: 5 minutes)
   */
  startInactivityCleanup(intervalMs = 300000) {
    const intervalId = setInterval(() => {
      const deletedRooms = this.gameRoomManager.cleanupInactiveRooms((roomId) => {
        console.log(`Удалена неактивная комната ${roomId} (более 12 часов без заходов)`);
      });
      
      if (deletedRooms.length > 0) {
        LobbyService.broadcastRoomsList(this.io, this.gameRoomManager.getAllRooms());
      }
    }, intervalMs);
    
    this.intervals.push(intervalId);
    return intervalId;
  }

  /**
   * Start disconnect cleanup task
   * Removes expired disconnect records
   * @param {number} intervalMs - Interval in milliseconds (default: 1 minute)
   */
  startDisconnectCleanup(intervalMs = 60000) {
    const intervalId = setInterval(() => {
      const removed = this.gameRoomManager.cleanupDisconnected();
      if (removed > 0) {
        console.log(`Cleaned up ${removed} expired disconnect records`);
      }
    }, intervalMs);
    
    this.intervals.push(intervalId);
    return intervalId;
  }

  /**
   * Start auth cleanup task
   * Removes expired sessions and old anonymous users
   * @param {number} intervalMs - Interval in milliseconds (default: 30 minutes)
   */
  startAuthCleanup(intervalMs = 30 * 60 * 1000) {
    const intervalId = setInterval(async () => {
      try {
        const cleanupResult = await this.authService.performCleanup();
        console.log(`Periodic cleanup completed: ${cleanupResult.expiredSessionsRemoved} expired sessions removed, ${cleanupResult.oldAnonymousUsersRemoved} old anonymous users removed`);
      } catch (error) {
        console.error('Error during periodic cleanup:', error);
      }
    }, intervalMs);
    
    this.intervals.push(intervalId);
    return intervalId;
  }

  /**
   * Start all periodic cleanup tasks
   */
  startAll() {
    this.startInactivityCleanup();
    this.startDisconnectCleanup();
    this.startAuthCleanup();
  }

  /**
   * Stop all periodic tasks
   */
  stopAll() {
    this.intervals.forEach(intervalId => clearInterval(intervalId));
    this.intervals = [];
  }

  /**
   * Perform one-time cleanup (useful for startup)
   */
  async performStartupCleanup() {
    try {
      const cleanupResult = await this.authService.performCleanup();
      console.log(`Startup cleanup completed: ${cleanupResult.expiredSessionsRemoved} expired sessions removed, ${cleanupResult.oldAnonymousUsersRemoved} old anonymous users removed`);
    } catch (error) {
      console.error('Error during startup cleanup:', error);
    }
  }
}

module.exports = PeriodicTasksService;

