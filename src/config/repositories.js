/**
 * Repository Manager - Centralized access to all repositories
 */
const TransactionManager = require('../utils/transactionManager');
const UserRepository = require('../models/UserRepository');
const GameSessionRepository = require('../models/GameSessionRepository');
const GameStatisticsRepository = require('../models/GameStatisticsRepository');
const LeaderboardRepository = require('../models/LeaderboardRepository');
const UserSettingsRepository = require('../models/UserSettingsRepository');
const SessionRepository = require('../models/SessionRepository');

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
    this.sessions = new SessionRepository(this.db);
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
      userSettings: this.userSettings,
      sessions: this.sessions
    };
  }

  /**
   * Execute a function within a database transaction
   * @param {Function} transactionFunction - Function to execute within the transaction
   * @returns {Promise<any>} Result of the transaction function
   */
  async executeInTransaction(transactionFunction) {
    return await TransactionManager.executeInTransaction(this.db, async (client) => {
      // Create temporary repositories with the transaction client
      const txRepos = {
        users: new UserRepository(client),
        gameSessions: new GameSessionRepository(client),
        gameStatistics: new GameStatisticsRepository(client),
        leaderboard: new LeaderboardRepository(client),
        userSettings: new UserSettingsRepository(client),
        sessions: new SessionRepository(client)
      };
      
      return await transactionFunction(txRepos);
    });
  }

  /**
   * Execute a function with retry logic for handling concurrent access
   * @param {Function} transactionFunction - Function to execute within the transaction
   * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
   * @param {number} baseDelayMs - Base delay in milliseconds between retries (default: 100)
   * @returns {Promise<any>} Result of the transaction function
   */
  async executeWithRetry(transactionFunction, maxRetries = 3, baseDelayMs = 100) {
    return await TransactionManager.executeWithRetry(this.db, async (client) => {
      // Create temporary repositories with the transaction client
      const txRepos = {
        users: new UserRepository(client),
        gameSessions: new GameSessionRepository(client),
        gameStatistics: new GameStatisticsRepository(client),
        leaderboard: new LeaderboardRepository(client),
        userSettings: new UserSettingsRepository(client)
      };
      
      return await transactionFunction(txRepos);
    }, maxRetries, baseDelayMs);
  }
}

module.exports = RepositoryManager;