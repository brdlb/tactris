/**
 * GameSessionRepository - Tracks game sessions and results
 */
const TransactionManager = require('../utils/transactionManager');

class GameSessionRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Creates a new game session
   * @param {Object} sessionData - Game session data to create
   * @returns {Promise<Object>} The created game session
   */
  async create(sessionData) {
    const {
      player_id,
      game_mode,
      grid_width,
      grid_height,
      initial_grid,
      final_grid,
      duration_seconds,
      lines_cleared,
      figures_placed,
      score,
      game_result,
      session_data
    } = sessionData;

    const query = `
      INSERT INTO game_sessions (
        player_id, game_mode, grid_width, grid_height,
        initial_grid, final_grid, duration_seconds, lines_cleared,
        figures_placed, score, game_result, session_data
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `;

    const values = [
      player_id, game_mode, grid_width, grid_height,
      initial_grid, final_grid, duration_seconds, lines_cleared,
      figures_placed, score, game_result, session_data
    ];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating game session: ${error.message}`);
    }
  }

  /**
   * Finds a game session by its ID
   * @param {string} id - Game session ID to find
   * @returns {Promise<Object|null>} The found game session or null
   */
  async findById(id) {
    const query = 'SELECT * FROM game_sessions WHERE id = $1;';
    const values = [id];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding game session by ID: ${error.message}`);
    }
  }

  /**
   * Finds game sessions for a specific user
   * @param {string} userId - User ID to find sessions for
   * @param {number} limit - Maximum number of sessions to return (default: 10)
   * @param {number} offset - Number of sessions to skip (default: 0)
   * @returns {Promise<Array>} Array of game sessions
   */
  async findByPlayerId(playerId, limit = 10, offset = 0) {
    const query = `
      SELECT * FROM game_sessions
      WHERE player_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    const values = [playerId, limit, offset];

    try {
      const result = await this.db.query(query, values);
      return result.rows;
    } catch (error) {
      throw new Error(`Error finding game sessions by user ID: ${error.message}`);
    }
  }

  /**
   * Finds game sessions for a specific user with a specific game result
   * @param {string} userId - User ID to find sessions for
   * @param {string} gameResult - Game result to filter by (e.g., 'win', 'loss', 'draw')
   * @param {number} limit - Maximum number of sessions to return (default: 10)
   * @param {number} offset - Number of sessions to skip (default: 0)
   * @returns {Promise<Array>} Array of game sessions
   */
  async findByPlayerIdAndResult(playerId, gameResult, limit = 10, offset = 0) {
    const query = `
      SELECT * FROM game_sessions
      WHERE player_id = $1 AND game_result = $2
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4;
    `;
    const values = [playerId, gameResult, limit, offset];

    try {
      const result = await this.db.query(query, values);
      return result.rows;
    } catch (error) {
      throw new Error(`Error finding game sessions by user ID and result: ${error.message}`);
    }
  }

  /**
   * Updates a game session
   * @param {string} id - Game session ID to update
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} The updated game session
   */
  async update(id, updates) {
    const allowedFields = [
      'game_mode', 'grid_width', 'grid_height',
      'initial_grid', 'final_grid', 'duration_seconds', 'lines_cleared',
      'figures_placed', 'score', 'game_result', 'session_data'
    ];
    
    const updateFields = [];
    const values = [];
    let valueIndex = 2;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${valueIndex}`);
        values.push(value);
        valueIndex++;
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    const query = `
      UPDATE game_sessions 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    values.unshift(id); // Add ID as the first parameter

    try {
      const result = await this.db.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('Game session not found');
      }
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error updating game session: ${error.message}`);
    }
  }

  /**
   * Gets statistics for a user's game sessions
   * @param {string} userId - User ID to get statistics for
   * @returns {Promise<Object>} Statistics object
   */
  async getPlayerStats(playerId) {
    const query = `
      SELECT
        COUNT(*) as total_games,
        SUM(CASE WHEN game_result = 'win' THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN game_result = 'loss' THEN 1 ELSE 0 END) as losses,
        SUM(CASE WHEN game_result = 'draw' THEN 1 ELSE 0 END) as draws,
        AVG(score) as average_score,
        AVG(duration_seconds) as average_duration,
        AVG(lines_cleared) as average_lines_cleared,
        MAX(score) as best_score,
        MAX(lines_cleared) as most_lines_cleared
      FROM game_sessions
      WHERE player_id = $1;
    `;
    const values = [playerId];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error getting user stats: ${error.message}`);
    }
  }

  /**
   * Gets recent game sessions for a user
   * @param {string} userId - User ID to get recent sessions for
   * @param {number} limit - Number of sessions to return (default: 5)
   * @returns {Promise<Array>} Array of recent game sessions
   */
  async getRecentSessions(playerId, limit = 5) {
    const query = `
      SELECT * FROM game_sessions
      WHERE player_id = $1
      ORDER BY created_at DESC
      LIMIT $2;
    `;
    const values = [playerId, limit];

    try {
      const result = await this.db.query(query, values);
      return result.rows;
    } catch (error) {
      throw new Error(`Error getting recent sessions: ${error.message}`);
    }
  }

  /**
   * Gets game sessions within a date range
   * @param {string} userId - User ID to get sessions for
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Array of game sessions
   */
  async getSessionsByDateRange(playerId, startDate, endDate) {
    const query = `
      SELECT * FROM game_sessions
      WHERE player_id = $1
        AND created_at >= $2
        AND created_at <= $3
      ORDER BY created_at DESC;
    `;
    const values = [playerId, startDate, endDate];

    try {
      const result = await this.db.query(query, values);
      return result.rows;
    } catch (error) {
      throw new Error(`Error getting sessions by date range: ${error.message}`);
    }
  }

  /**
   * Completes a game session and updates user statistics atomically
   * @param {string} sessionId - Game session ID to complete
   * @param {Object} sessionUpdates - Updates to apply to the game session
   * @param {string} userId - User ID to update statistics for
   * @param {Object} gameSessionData - Completed game session data for statistics calculation
   * @returns {Promise<Object>} Object containing updated session and statistics
   */
  async completeSessionWithStatsUpdate(sessionId, sessionUpdates, playerId, gameSessionData) {
    // Use the transaction manager to ensure atomicity
    return await TransactionManager.executeWithRetry(this.db, async (client) => {
      // Update the game session
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
      
      // Get the current statistics for the player
      const statsQuery = 'SELECT * FROM game_statistics WHERE user_id = $1;';
      const statsResult = await client.query(statsQuery, [playerId]);
      
      let currentStats;
      if (statsResult.rows.length === 0) {
        // If no stats exist, create a new record
        const createStatsQuery = `
          INSERT INTO game_statistics (
            user_id, total_games, wins, losses, draws, total_score,
            total_lines_cleared, total_duration, best_score, best_lines_cleared,
            average_score, average_lines_cleared, average_duration, games_played_today
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *;
        `;
        
        const initialStatsValues = [
          playerId, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
        ];
        
        const createResult = await client.query(createStatsQuery, initialStatsValues);
        currentStats = createResult.rows[0];
      } else {
        currentStats = statsResult.rows[0];
      }
      
      // Calculate new statistics based on the game session
      const gameResult = gameSessionData.game_result;
      const newTotalGames = currentStats.total_games + 1;
      const newWins = gameResult === 'win' ? currentStats.wins + 1 : currentStats.wins;
      const newLosses = gameResult === 'loss' ? currentStats.losses + 1 : currentStats.losses;
      const newDraws = gameResult === 'draw' ? currentStats.draws + 1 : currentStats.draws;
      const newTotalScore = currentStats.total_score + gameSessionData.score;
      const newTotalLinesCleared = currentStats.total_lines_cleared + gameSessionData.lines_cleared;
      const newTotalDuration = currentStats.total_duration + gameSessionData.duration_seconds;
      
      // Update best scores if needed
      const newBestScore = Math.max(currentStats.best_score, gameSessionData.score);
      const newBestLinesCleared = Math.max(currentStats.best_lines_cleared, gameSessionData.lines_cleared);
      
      // Calculate averages
      const newAverageScore = newTotalScore / newTotalGames;
      const newAverageLinesCleared = newTotalLinesCleared / newTotalGames;
      const newAverageDuration = newTotalDuration / newTotalGames;
      
      // Update the statistics record
      const updateStatsQuery = `
        UPDATE game_statistics
        SET total_games = $2, wins = $3, losses = $4, draws = $5, total_score = $6,
            total_lines_cleared = $7, total_duration = $8, best_score = $9, best_lines_cleared = $10,
            average_score = $11, average_lines_cleared = $12, average_duration = $13, updated_at = NOW()
        WHERE user_id = $1
        RETURNING *;
      `;
      
      const statsValues = [
        playerId, newTotalGames, newWins, newLosses, newDraws, newTotalScore,
        newTotalLinesCleared, newTotalDuration, newBestScore, newBestLinesCleared,
        newAverageScore, newAverageLinesCleared, newAverageDuration
      ];
      
      const updateStatsResult = await client.query(updateStatsQuery, statsValues);
      
      return {
        session: updatedSession,
        statistics: updateStatsResult.rows[0]
      };
    });
  }
}

module.exports = GameSessionRepository;