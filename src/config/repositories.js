/**
 * Repository Manager - Centralized access to all repositories
 */
const UserRepository = require('../models/UserRepository');
const GameSessionRepository = require('../models/GameSessionRepository');
const GameStatisticsRepository = require('../models/GameStatisticsRepository');
const LeaderboardRepository = require('../models/LeaderboardRepository');
const UserSettingsRepository = require('../models/UserSettingsRepository');

class RepositoryManager {
  constructor(db) {
    this.db = db;
    this._initializeRepositories();
  }

  /**
   * Initialize all repositories with the database connection
   */
  _initializeRepositories() {
    this.users = new UserRepository(this.db);
    this.gameSessions = new GameSessionRepository(this.db);
    this.gameStatistics = new GameStatisticsRepository(this.db);
    this.leaderboard = new LeaderboardRepository(this.db);
    this.userSettings = new UserSettingsRepository(this.db);
  }

  /**
   * Get all repositories as an object
   * @returns {Object} Object containing all repositories
   */
  getAllRepositories() {
    return {
      users: this.users,
      gameSessions: this.gameSessions,
      gameStatistics: this.gameStatistics,
      leaderboard: this.leaderboard,
      userSettings: this.userSettings
    };
  }

  /**
   * Execute a function within a database transaction
   * @param {Function} transactionFunction - Function to execute within the transaction
   * @returns {Promise<any>} Result of the transaction function
   */
  async executeInTransaction(transactionFunction) {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create temporary repositories with the transaction client
      const txRepos = {
        users: new UserRepository(client),
        gameSessions: new GameSessionRepository(client),
        gameStatistics: new GameStatisticsRepository(client),
        leaderboard: new LeaderboardRepository(client),
        userSettings: new UserSettingsRepository(client)
      };
      
      const result = await transactionFunction(txRepos);
      
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
 }
}

module.exports = RepositoryManager;