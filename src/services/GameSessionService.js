/**
 * GameSessionService - Service layer for handling game session operations with transactions
 * Ensures data consistency during game session completion and statistics updates
 */

const TransactionManager = require('../utils/transactionManager');

class GameSessionService {
  constructor(gameSessionRepository, gameStatisticsRepository) {
    this.gameSessionRepository = gameSessionRepository;
    this.gameStatisticsRepository = gameStatisticsRepository;
  }

  /**
   * Completes a game session and updates user statistics atomically
   * @param {string} sessionId - Game session ID to complete
   * @param {Object} sessionUpdates - Updates to apply to the game session
   * @param {string} userId - User ID to update statistics for
   * @param {Object} gameSessionData - Completed game session data for statistics calculation
   * @returns {Promise<Object>} Object containing updated session and statistics
   */
  async completeGameSession(sessionId, sessionUpdates, userId, gameSessionData) {
    // Use the transaction manager to ensure atomicity between session update and statistics update
    return await TransactionManager.executeWithRetry(this.gameSessionRepository.db, async (client) => {
      // Update the game session using the client connection
      const sessionUpdateQuery = `
        UPDATE game_sessions
        SET game_mode = $2, grid_width = $3, grid_height = $4,
            initial_grid = $5, final_grid = $6, duration_seconds = $7, lines_cleared = $8,
            figures_placed = $9, score = $10, game_result = $11, session_data = $12, updated_at = NOW()
        WHERE id = $1
        RETURNING *;
      `;
      
      const sessionValues = [
        sessionId, sessionUpdates.game_mode, sessionUpdates.grid_width, sessionUpdates.grid_height,
        sessionUpdates.initial_grid, sessionUpdates.final_grid, sessionUpdates.duration_seconds, sessionUpdates.lines_cleared,
        sessionUpdates.figures_placed, sessionUpdates.score, sessionUpdates.game_result, sessionUpdates.session_data
      ];
      
      const sessionResult = await client.query(sessionUpdateQuery, sessionValues);
      if (sessionResult.rows.length === 0) {
        throw new Error('Game session not found');
      }
      
      const updatedSession = sessionResult.rows[0];
      
      // Get the current statistics for the user with row locking to prevent concurrent updates
      const lockQuery = 'SELECT * FROM game_statistics WHERE user_id = $1 FOR UPDATE;';
      const statsResult = await client.query(lockQuery, [userId]);
      
      let currentStats;
      if (statsResult.rows.length === 0) {
        // If no stats exist, create a new record
        const createStatsQuery = `
          INSERT INTO game_statistics (
            user_id, total_games, wins, losses, draws, total_score,
            total_lines_cleared, total_duration, total_figures_placed, total_play_time_seconds,
            best_score, best_lines_cleared,
            average_score, average_lines_cleared, average_lines_per_game, average_duration, games_played_today
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          RETURNING *;
        `;
        
        const initialStatsValues = [
            userId, 1, // total_games starts at 1 since this is the first game
            0,  // wins - not applicable in this game mode
            0, // losses - not applicable in this game mode
            0, // draws - not applicable in this game mode
            gameSessionData.score, // total_score
            gameSessionData.lines_cleared, // total_lines_cleared
            gameSessionData.figures_placed || 0, // total_figures_placed
            gameSessionData.duration_seconds, // total_play_time_seconds
            gameSessionData.score, // best_score
            gameSessionData.lines_cleared, // best_lines_cleared
            gameSessionData.score, // average_score (for single game)
            gameSessionData.lines_cleared, // average_lines_cleared (for single game)
            gameSessionData.lines_cleared, // average_lines_per_game (for single game)
            gameSessionData.duration_seconds, // average_duration (for single game)
            1 // games_played_today
        ];
        
        const createResult = await client.query(createStatsQuery, initialStatsValues);
        currentStats = createResult.rows[0];
      } else {
        currentStats = statsResult.rows[0];
      }

      // Calculate new statistics based on the game session
      const gameResult = gameSessionData.game_result;
      const newTotalGames = parseInt(currentStats.total_games) + 1;
      const newWins = parseInt(currentStats.wins); // Wins not applicable in this game mode
      const newLosses = parseInt(currentStats.losses); // Losses not applicable in this game mode
      const newDraws = parseInt(currentStats.draws); // Draws not applicable in this game mode;
      const newTotalScore = parseInt(currentStats.total_score) + gameSessionData.score;
      const newTotalLinesCleared = parseInt(currentStats.total_lines_cleared) + gameSessionData.lines_cleared;
      const newTotalDuration = parseInt(currentStats.total_duration) + gameSessionData.duration_seconds;
      
      // Update best scores if needed
      const newBestScore = Math.max(parseInt(currentStats.best_score), gameSessionData.score);
      const newBestLinesCleared = Math.max(parseInt(currentStats.best_lines_cleared), gameSessionData.lines_cleared);
      
      // Calculate averages with overflow protection
      const newAverageScore = Math.min(newTotalScore / newTotalGames, 99999.99);
      const newAverageLinesCleared = Math.min(newTotalLinesCleared / newTotalGames, 999.9);
      const newAverageDuration = Math.min(newTotalDuration / newTotalGames, 999999.99);

      // Update the statistics record
      const updateStatsQuery = `
        UPDATE game_statistics
        SET total_games = $2, wins = $3, losses = $4, draws = $5, total_score = $6,
            total_lines_cleared = $7, total_duration = $8, best_score = $9, best_lines_cleared = $10,
            average_score = $11, average_lines_cleared = $12, average_duration = $13, games_played_today = $14, updated_at = NOW()
        WHERE user_id = $1
        RETURNING *;
      `;
      
      const statsValues = [
        userId, newTotalGames, newWins, newLosses, newDraws, newTotalScore,
        newTotalLinesCleared, newTotalDuration, newBestScore, newBestLinesCleared,
        newAverageScore, newAverageLinesCleared, newAverageDuration, parseInt(currentStats.games_played_today) + 1
      ];
      
      const updateStatsResult = await client.query(updateStatsQuery, statsValues);
      
      return {
        session: updatedSession,
        statistics: updateStatsResult.rows[0]
      };
    });
  }

  /**
   * Completes a game session using repository methods with transactions
   * @param {string} sessionId - Game session ID to complete
   * @param {Object} sessionUpdates - Updates to apply to the game session
   * @param {string} userId - User ID to update statistics for
   * @param {Object} gameSessionData - Completed game session data for statistics calculation
   * @returns {Promise<Object>} Object containing updated session and statistics
   */
  async completeGameSessionWithRepositoryMethods(sessionId, sessionUpdates, userId, gameSessionData) {
    // Use the repository methods that already handle transactions internally
    const updatedSession = await this.gameSessionRepository.update(sessionId, sessionUpdates);
    const updatedStatistics = await this.gameStatisticsRepository.updateFromGameSessionWithTransaction(userId, gameSessionData);
    
    return {
      session: updatedSession,
      statistics: updatedStatistics
    };
  }

  /**
   * Handles concurrent access scenarios by using row-level locking
   * @param {string} userId - User ID to update statistics for
   * @param {Object} gameSessionData - Completed game session data for statistics calculation
   * @returns {Promise<Object>} Updated statistics
   */
  async updateStatisticsWithRowLocking(userId, gameSessionData) {
    return await TransactionManager.executeWithRowLocking(
      this.gameStatisticsRepository.db,
      'game_statistics',
      'user_id = $1',
      [userId],
      async (client) => {
        // At this point, the row is locked, so we can safely read and update
        const statsQuery = 'SELECT * FROM game_statistics WHERE user_id = $1;';
        const statsResult = await client.query(statsQuery, [userId]);
        
        let currentStats;
        if (statsResult.rows.length === 0) {
          // If no stats exist, create a new record
          const createStatsQuery = `
            INSERT INTO game_statistics (
              user_id, total_games, wins, losses, draws, total_score,
              total_lines_cleared, total_duration, total_figures_placed, total_play_time_seconds,
              best_score, best_lines_cleared,
              average_score, average_lines_cleared, average_lines_per_game, average_duration, games_played_today
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING *;
          `;
          
          const initialStatsValues = [
              userId, 1, // total_games starts at 1 since this is the first game
              0,  // wins - not applicable in this game mode
              0, // losses - not applicable in this game mode
              0, // draws - not applicable in this game mode
              gameSessionData.score, // total_score
              gameSessionData.lines_cleared, // total_lines_cleared
              gameSessionData.figures_placed || 0, // total_figures_placed
              gameSessionData.duration_seconds, // total_play_time_seconds
              gameSessionData.score, // best_score
              gameSessionData.lines_cleared, // best_lines_cleared
              gameSessionData.score, // average_score (for single game)
              gameSessionData.lines_cleared, // average_lines_cleared (for single game)
              gameSessionData.lines_cleared, // average_lines_per_game (for single game)
              gameSessionData.duration_seconds, // average_duration (for single game)
              1 // games_played_today
          ];
          
          const createResult = await client.query(createStatsQuery, initialStatsValues);
          currentStats = createResult.rows[0];
        } else {
          currentStats = statsResult.rows[0];
        }

        // Calculate new statistics based on the game session
        const gameResult = gameSessionData.game_result;
        const newTotalGames = parseInt(currentStats.total_games) + 1;
        const newWins = parseInt(currentStats.wins); // Wins not applicable in this game mode
        const newLosses = parseInt(currentStats.losses); // Losses not applicable in this game mode
        const newDraws = parseInt(currentStats.draws); // Draws not applicable in this game mode;
        const newTotalScore = parseInt(currentStats.total_score) + gameSessionData.score;
        const newTotalLinesCleared = parseInt(currentStats.total_lines_cleared) + gameSessionData.lines_cleared;
        const newTotalDuration = parseInt(currentStats.total_duration) + gameSessionData.duration_seconds;
        
        // Update best scores if needed
        const newBestScore = Math.max(parseInt(currentStats.best_score), gameSessionData.score);
        const newBestLinesCleared = Math.max(parseInt(currentStats.best_lines_cleared), gameSessionData.lines_cleared);
        
        // Calculate averages with overflow protection
        const newAverageScore = Math.min(newTotalScore / newTotalGames, 99999.99);
        const newAverageLinesCleared = Math.min(newTotalLinesCleared / newTotalGames, 99.9);
        const newAverageDuration = Math.min(newTotalDuration / newTotalGames, 999999.99);

        // Update the statistics record
        const updateStatsQuery = `
          UPDATE game_statistics
          SET total_games = $2, wins = $3, losses = $4, draws = $5, total_score = $6,
              total_lines_cleared = $7, total_duration = $8, best_score = $9, best_lines_cleared = $10,
              average_score = $11, average_lines_cleared = $12, average_duration = $13, games_played_today = $14, updated_at = NOW()
          WHERE user_id = $1
          RETURNING *;
        `;
        
        const statsValues = [
          userId, newTotalGames, newWins, newLosses, newDraws, newTotalScore,
          newTotalLinesCleared, newTotalDuration, newBestScore, newBestLinesCleared,
          newAverageScore, newAverageLinesCleared, newAverageDuration, parseInt(currentStats.games_played_today) + 1
        ];
        
        const updateStatsResult = await client.query(updateStatsQuery, statsValues);
        
        return updateStatsResult.rows[0];
      }
    );
  }
}

module.exports = GameSessionService;