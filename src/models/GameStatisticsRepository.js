/**
 * GameStatisticsRepository - Aggregates and updates user statistics
 */
const TransactionManager = require('../utils/transactionManager');

class GameStatisticsRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Creates a new game statistics record
   * @param {Object} statsData - Statistics data to create
   * @returns {Promise<Object>} The created statistics record
   */
  async create(statsData) {
    const {
      user_id,
      total_games,
      wins,
      losses,
      draws,
      total_score,
      total_lines_cleared,
      total_duration,
      total_figures_placed,
      total_play_time_seconds,
      best_score,
      best_lines_cleared,
      average_score,
      average_lines_cleared,
      average_lines_per_game,
      average_duration,
      games_played_today
    } = statsData;

    const query = `
      INSERT INTO game_statistics (
        user_id, total_games, wins, losses, draws, total_score,
        total_lines_cleared, total_duration, total_figures_placed, total_play_time_seconds,
        best_score, best_lines_cleared,
        average_score, average_lines_cleared, average_lines_per_game, average_duration, games_played_today
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *;
    `;

    const values = [
      user_id, total_games, wins, losses, draws, total_score,
      total_lines_cleared, total_duration, total_figures_placed, total_play_time_seconds,
      best_score, best_lines_cleared,
      average_score, average_lines_cleared, average_lines_per_game, average_duration, games_played_today
    ];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating game statistics: ${error.message}`);
    }
  }

  /**
   * Finds statistics by user ID
   * @param {string} userId - User ID to find statistics for
   * @returns {Promise<Object|null>} The found statistics or null
   */
  async findByUserId(userId) {
    const query = 'SELECT * FROM game_statistics WHERE user_id = $1;';
    const values = [userId];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding game statistics by user ID: ${error.message}`);
    }
  }

  /**
   * Updates user statistics
   * @param {string} userId - User ID to update statistics for
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} The updated statistics
   */
  async update(userId, updates) {
    const allowedFields = [
      'total_games', 'wins', 'losses', 'draws', 'total_score',
      'total_lines_cleared', 'total_duration', 'total_figures_placed', 'total_play_time_seconds',
      'best_score', 'best_lines_cleared',
      'average_score', 'average_lines_cleared', 'average_lines_per_game', 'average_duration', 'games_played_today'
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
      UPDATE game_statistics
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE user_id = $1
      RETURNING *;
    `;
    values.unshift(userId); // Add user ID as the first parameter

    try {
      const result = await this.db.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('Game statistics not found');
      }
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error updating game statistics: ${error.message}`);
    }
  }

  /**
   * Updates user statistics based on a completed game session
   * @param {string} userId - User ID to update statistics for
   * @param {Object} gameSession - Completed game session data
   * @returns {Promise<Object>} The updated statistics
   */
  async updateFromGameSession(userId, gameSession) {
    // First, get the current statistics
    let currentStats = await this.findByUserId(userId);
    
    if (!currentStats) {
      // If no stats exist, create a new record
      currentStats = await this.create({
        user_id: userId,
        total_games: 1,
        wins: 0, // Wins not applicable in this game mode
        losses: 0, // Losses not applicable in this game mode
        draws: 0, // Draws not applicable in this game mode
        total_score: gameSession.score,
        total_lines_cleared: gameSession.lines_cleared,
        total_figures_placed: gameSession.figures_placed || 0,
        total_play_time_seconds: gameSession.duration_seconds,
        best_score: gameSession.score,
        best_lines_cleared: gameSession.lines_cleared,
        average_score: gameSession.score,
        average_lines_cleared: gameSession.lines_cleared,
        average_lines_per_game: gameSession.lines_cleared, // For single game
        average_duration: gameSession.duration_seconds,
        games_played_today: 1
      });
    }

    // Calculate new statistics based on the game session
    const gameResult = gameSession.game_result;
    const newTotalGames = parseInt(currentStats.total_games) + 1;
    const newWins = gameResult === 'win' ? parseInt(currentStats.wins) + 1 : parseInt(currentStats.wins);
    const newLosses = gameResult === 'loss' ? parseInt(currentStats.losses) + 1 : parseInt(currentStats.losses);
    const newDraws = gameResult === 'draw' ? parseInt(currentStats.draws) + 1 : parseInt(currentStats.draws);
    const newTotalScore = parseInt(currentStats.total_score) + gameSession.score;
    const newTotalLinesCleared = parseInt(currentStats.total_lines_cleared) + gameSession.lines_cleared;
    const newTotalDuration = parseInt(currentStats.total_duration) + gameSession.duration_seconds;
    
    // Update best scores if needed
    const newBestScore = Math.max(parseInt(currentStats.best_score), gameSession.score);
    const newBestLinesCleared = Math.max(parseInt(currentStats.best_lines_cleared), gameSession.lines_cleared);
    
    // Calculate averages with overflow protection
    const newAverageScore = Math.min(newTotalScore / newTotalGames, 99999.99);
    const newAverageLinesCleared = Math.min(newTotalLinesCleared / newTotalGames, 9999.99);
    const newAverageDuration = Math.min(newTotalDuration / newTotalGames, 999999.99);

    // Update the statistics record
    const updatedStats = await this.update(userId, {
      total_games: newTotalGames,
      wins: newWins,
      losses: newLosses,
      draws: newDraws,
      total_score: newTotalScore,
      total_lines_cleared: newTotalLinesCleared,
      total_duration: newTotalDuration,
      best_score: newBestScore,
      best_lines_cleared: newBestLinesCleared,
      average_score: newAverageScore,
      average_lines_cleared: newAverageLinesCleared,
      average_duration: newAverageDuration,
      games_played_today: parseInt(currentStats.games_played_today) + 1
    });

    return updatedStats;
  }

  /**
   * Increments the games played today counter for a user
   * @param {string} userId - User ID to increment games played today for
   * @returns {Promise<Object>} The updated statistics
   */
  async incrementGamesPlayedToday(userId) {
    const query = `
      UPDATE game_statistics 
      SET games_played_today = games_played_today + 1, updated_at = NOW()
      WHERE user_id = $1
      RETURNING *;
    `;
    const values = [userId];

    try {
      const result = await this.db.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('Game statistics not found');
      }
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error incrementing games played today: ${error.message}`);
    }
  }

  /**
   * Resets the games played today counter for all users
   * @returns {Promise<number>} Number of records updated
   */
  async resetGamesPlayedToday() {
    const query = `
      UPDATE game_statistics 
      SET games_played_today = 0, updated_at = NOW();
    `;

    try {
      const result = await this.db.query(query);
      return result.rowCount;
    } catch (error) {
      throw new Error(`Error resetting games played today: ${error.message}`);
    }
  }

  /**
   * Gets the top users by score
   * @param {number} limit - Number of top users to return (default: 10)
   * @returns {Promise<Array>} Array of top users by score
   */
  async getTopByScore(limit = 10) {
    const query = `
      SELECT 
        gs.user_id,
        gs.best_score,
        gs.total_games,
        u.username,
        u.avatar_url
      FROM game_statistics gs
      JOIN users u ON gs.user_id = u.id
      ORDER BY gs.best_score DESC
      LIMIT $1;
    `;
    const values = [limit];

    try {
      const result = await this.db.query(query, values);
      return result.rows;
    } catch (error) {
      throw new Error(`Error getting top users by score: ${error.message}`);
    }
  }

  /**
   * Gets the top users by lines cleared
   * @param {number} limit - Number of top users to return (default: 10)
   * @returns {Promise<Array>} Array of top users by lines cleared
   */
  async getTopByLinesCleared(limit = 10) {
    const query = `
      SELECT 
        gs.user_id,
        gs.best_lines_cleared,
        gs.total_games,
        u.username,
        u.avatar_url
      FROM game_statistics gs
      JOIN users u ON gs.user_id = u.id
      ORDER BY gs.best_lines_cleared DESC
      LIMIT $1;
    `;
    const values = [limit];

    try {
      const result = await this.db.query(query, values);
      return result.rows;
    } catch (error) {
      throw new Error(`Error getting top users by lines cleared: ${error.message}`);
    }
  }

  /**
   * Gets completion rate for a user
   * @param {string} userId - User ID to get completion rate for
   * @returns {Promise<number>} Completion rate as a percentage
   */
  async getCompletionRate(userId) {
    const stats = await this.findByUserId(userId);
    
    if (!stats || parseInt(stats.total_games) === 0) {
      return 0;
    }
    
    return 100; // All games are completed, so completion rate is always 100%
  }

  /**
   * Updates user statistics based on a completed game session using transactions
   * @param {string} userId - User ID to update statistics for
   * @param {Object} gameSession - Completed game session data
   * @returns {Promise<Object>} The updated statistics
   */
  async updateFromGameSessionWithTransaction(userId, gameSession) {
    return await TransactionManager.executeWithRetry(this.db, async (client) => {
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
          userId, 1, 0, 0, 0, gameSession.score, gameSession.lines_cleared, gameSession.duration_seconds, gameSession.figures_placed || 0, gameSession.duration_seconds, gameSession.score, gameSession.lines_cleared, gameSession.score, gameSession.lines_cleared, gameSession.lines_cleared, gameSession.duration_seconds, 1
        ];
        
        const createResult = await client.query(createStatsQuery, initialStatsValues);
        currentStats = createResult.rows[0];
      } else {
        currentStats = statsResult.rows[0];
      }

      // Calculate new statistics based on the game session
      const gameResult = gameSession.game_result;
      const newTotalGames = parseInt(currentStats.total_games) + 1;
      const newWins = parseInt(currentStats.wins); // Wins not applicable in this game mode
      const newLosses = parseInt(currentStats.losses); // Losses not applicable in this game mode
      const newDraws = parseInt(currentStats.draws); // Draws not applicable in this game mode;
      const newTotalScore = parseInt(currentStats.total_score) + gameSession.score;
      const newTotalLinesCleared = parseInt(currentStats.total_lines_cleared) + gameSession.lines_cleared;
      const newTotalDuration = parseInt(currentStats.total_duration) + gameSession.duration_seconds;
      
      // Update best scores if needed
      const newBestScore = Math.max(parseInt(currentStats.best_score), gameSession.score);
      const newBestLinesCleared = Math.max(parseInt(currentStats.best_lines_cleared), gameSession.lines_cleared);
      
      // Calculate averages with overflow protection
      const newAverageScore = Math.min(newTotalScore / newTotalGames, 99999.99);
      const newAverageLinesCleared = Math.min(newTotalLinesCleared / newTotalGames, 9999.99);
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
    });
  }
}

module.exports = GameStatisticsRepository;