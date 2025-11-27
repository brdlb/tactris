/**
 * GameSessionRepository - Tracks game sessions and results
 */
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
      user_id,
      opponent_id,
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
        user_id, opponent_id, game_mode, grid_width, grid_height, 
        initial_grid, final_grid, duration_seconds, lines_cleared, 
        figures_placed, score, game_result, session_data
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;

    const values = [
      user_id, opponent_id, game_mode, grid_width, grid_height,
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
  async findByUserId(userId, limit = 10, offset = 0) {
    const query = `
      SELECT * FROM game_sessions 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3;
    `;
    const values = [userId, limit, offset];

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
  async findByUserIdAndResult(userId, gameResult, limit = 10, offset = 0) {
    const query = `
      SELECT * FROM game_sessions 
      WHERE user_id = $1 AND game_result = $2
      ORDER BY created_at DESC 
      LIMIT $3 OFFSET $4;
    `;
    const values = [userId, gameResult, limit, offset];

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
      'opponent_id', 'game_mode', 'grid_width', 'grid_height', 
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
  async getUserStats(userId) {
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
      WHERE user_id = $1;
    `;
    const values = [userId];

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
  async getRecentSessions(userId, limit = 5) {
    const query = `
      SELECT * FROM game_sessions 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2;
    `;
    const values = [userId, limit];

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
  async getSessionsByDateRange(userId, startDate, endDate) {
    const query = `
      SELECT * FROM game_sessions 
      WHERE user_id = $1 
        AND created_at >= $2 
        AND created_at <= $3
      ORDER BY created_at DESC;
    `;
    const values = [userId, startDate, endDate];

    try {
      const result = await this.db.query(query, values);
      return result.rows;
    } catch (error) {
      throw new Error(`Error getting sessions by date range: ${error.message}`);
    }
  }
}

module.exports = GameSessionRepository;