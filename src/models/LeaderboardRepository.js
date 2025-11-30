/**
 * LeaderboardRepository - Manages leaderboard entries and queries
 */
class LeaderboardRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Creates a new leaderboard entry
   * @param {Object} entryData - Leaderboard entry data to create
   * @returns {Promise<Object>} The created leaderboard entry
   */
  async create(entryData) {
    const {
      user_id,
      score,
      lines_cleared,
      game_mode,
      season_id
    } = entryData;

    const query = `
      INSERT INTO leaderboard_entries (
        user_id, score, lines_cleared, game_mode, season_id
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const values = [user_id, score, lines_cleared, game_mode, season_id];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating leaderboard entry: ${error.message}`);
    }
  }

  /**
   * Finds a leaderboard entry by user ID and game mode
   * @param {string} userId - User ID to find entry for
   * @param {string} gameMode - Game mode to filter by
   * @param {string} seasonId - Season ID (optional, defaults to 'all_time')
   * @returns {Promise<Object|null>} The found leaderboard entry or null
   */
  async findByUserAndMode(userId, gameMode, seasonId = 'all_time') {
    const query = `
      SELECT * FROM leaderboard_entries 
      WHERE user_id = $1 AND game_mode = $2 AND season_id = $3;
    `;
    const values = [userId, gameMode, seasonId];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding leaderboard entry by user and mode: ${error.message}`);
    }
  }

  /**
   * Updates a leaderboard entry
   * @param {string} userId - User ID of the entry to update
   * @param {string} gameMode - Game mode of the entry to update
   * @param {Object} updates - Fields to update
   * @param {string} seasonId - Season ID (optional, defaults to 'all_time')
   * @returns {Promise<Object>} The updated leaderboard entry
   */
  async update(userId, gameMode, updates, seasonId = 'all_time') {
    const allowedFields = ['score', 'lines_cleared'];
    
    const updateFields = [];
    const values = [];
    let valueIndex = 3; // userId and gameMode are first two parameters

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
      UPDATE leaderboard_entries 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE user_id = $1 AND game_mode = $2 AND season_id = $3
      RETURNING *;
    `;
    values.unshift(userId, gameMode, seasonId); // Add userId, gameMode, and seasonId as first parameters

    try {
      const result = await this.db.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('Leaderboard entry not found');
      }
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error updating leaderboard entry: ${error.message}`);
    }
  }

  /**
   * Gets the global leaderboard by score
   * @param {number} limit - Number of entries to return (default: 10)
   * @param {string} gameMode - Game mode to filter by (default: 'classic')
   * @param {string} seasonId - Season ID (optional, defaults to 'all_time')
   * @returns {Promise<Array>} Array of leaderboard entries
   */
  async getGlobalByScore(limit = 10, gameMode = 'classic', seasonId = 'all_time') {
    const query = `
      SELECT 
        le.user_id,
        le.score,
        le.lines_cleared,
        le.game_mode,
        le.created_at,
        le.updated_at,
        u.username,
        u.avatar_url
      FROM leaderboard_entries le
      JOIN users u ON le.user_id = u.id
      WHERE le.game_mode = $1 AND le.season_id = $2
      ORDER BY le.score DESC
      LIMIT $3;
    `;
    const values = [gameMode, seasonId, limit];

    try {
      const result = await this.db.query(query, values);
      return result.rows;
    } catch (error) {
      throw new Error(`Error getting global leaderboard by score: ${error.message}`);
    }
  }

  /**
   * Gets the global leaderboard by lines cleared
   * @param {number} limit - Number of entries to return (default: 10)
   * @param {string} gameMode - Game mode to filter by (default: 'classic')
   * @param {string} seasonId - Season ID (optional, defaults to 'all_time')
   * @returns {Promise<Array>} Array of leaderboard entries
   */
  async getGlobalByLinesCleared(limit = 10, gameMode = 'classic', seasonId = 'all_time') {
    const query = `
      SELECT 
        le.user_id,
        le.score,
        le.lines_cleared,
        le.game_mode,
        le.created_at,
        le.updated_at,
        u.username,
        u.avatar_url
      FROM leaderboard_entries le
      JOIN users u ON le.user_id = u.id
      WHERE le.game_mode = $1 AND le.season_id = $2
      ORDER BY le.lines_cleared DESC
      LIMIT $3;
    `;
    const values = [gameMode, seasonId, limit];

    try {
      const result = await this.db.query(query, values);
      return result.rows;
    } catch (error) {
      throw new Error(`Error getting global leaderboard by lines cleared: ${error.message}`);
    }
  }

  /**
   * Gets the weekly leaderboard by score
   * @param {number} limit - Number of entries to return (default: 10)
   * @param {string} gameMode - Game mode to filter by (default: 'classic')
   * @param {string} seasonId - Season ID (optional, defaults to 'weekly')
   * @returns {Promise<Array>} Array of leaderboard entries
   */
  async getWeeklyByScore(limit = 10, gameMode = 'classic', seasonId = 'weekly') {
    const query = `
      SELECT 
        le.user_id,
        le.score,
        le.lines_cleared,
        le.game_mode,
        le.created_at,
        le.updated_at,
        u.username,
        u.avatar_url
      FROM leaderboard_entries le
      JOIN users u ON le.user_id = u.id
      WHERE le.game_mode = $1 
        AND le.season_id = $2
        AND le.created_at >= NOW() - INTERVAL '7 days'
      ORDER BY le.score DESC
      LIMIT $3;
    `;
    const values = [gameMode, seasonId, limit];

    try {
      const result = await this.db.query(query, values);
      return result.rows;
    } catch (error) {
      throw new Error(`Error getting weekly leaderboard by score: ${error.message}`);
    }
  }

  /**
   * Gets the weekly leaderboard by lines cleared
   * @param {number} limit - Number of entries to return (default: 10)
   * @param {string} gameMode - Game mode to filter by (default: 'classic')
   * @param {string} seasonId - Season ID (optional, defaults to 'weekly')
   * @returns {Promise<Array>} Array of leaderboard entries
   */
  async getWeeklyByLinesCleared(limit = 10, gameMode = 'classic', seasonId = 'weekly') {
    const query = `
      SELECT 
        le.user_id,
        le.score,
        le.lines_cleared,
        le.game_mode,
        le.created_at,
        le.updated_at,
        u.username,
        u.avatar_url
      FROM leaderboard_entries le
      JOIN users u ON le.user_id = u.id
      WHERE le.game_mode = $1 
        AND le.season_id = $2
        AND le.created_at >= NOW() - INTERVAL '7 days'
      ORDER BY le.lines_cleared DESC
      LIMIT $3;
    `;
    const values = [gameMode, seasonId, limit];

    try {
      const result = await this.db.query(query, values);
      return result.rows;
    } catch (error) {
      throw new Error(`Error getting weekly leaderboard by lines cleared: ${error.message}`);
    }
  }

  /**
   * Gets a user's rank in the leaderboard by score
   * @param {string} userId - User ID to get rank for
   * @param {string} gameMode - Game mode to filter by (default: 'classic')
   * @param {string} seasonId - Season ID (optional, defaults to 'all_time')
   * @returns {Promise<number>} The user's rank (1-based) or -1 if not ranked
   */
  async getUserRankByScore(userId, gameMode = 'classic', seasonId = 'all_time') {
    const query = `
      SELECT COUNT(*) + 1 as rank
      FROM leaderboard_entries le
      WHERE le.game_mode = $1 
        AND le.season_id = $2
        AND le.score > (
          SELECT score 
          FROM leaderboard_entries 
          WHERE user_id = $3 
            AND game_mode = $1 
            AND season_id = $2
        );
    `;
    const values = [gameMode, seasonId, userId];

    try {
      const result = await this.db.query(query, values);
      const rank = parseInt(result.rows[0].rank);
      
      // Check if the user actually has an entry in the leaderboard
      const userEntry = await this.findByUserAndMode(userId, gameMode, seasonId);
      return userEntry ? rank : -1;
    } catch (error) {
      throw new Error(`Error getting user rank by score: ${error.message}`);
    }
  }

  /**
   * Gets a user's rank in the leaderboard by lines cleared
   * @param {string} userId - User ID to get rank for
   * @param {string} gameMode - Game mode to filter by (default: 'classic')
   * @param {string} seasonId - Season ID (optional, defaults to 'all_time')
   * @returns {Promise<number>} The user's rank (1-based) or -1 if not ranked
   */
  async getUserRankByLinesCleared(userId, gameMode = 'classic', seasonId = 'all_time') {
    const query = `
      SELECT COUNT(*) + 1 as rank
      FROM leaderboard_entries le
      WHERE le.game_mode = $1 
        AND le.season_id = $2
        AND le.lines_cleared > (
          SELECT lines_cleared 
          FROM leaderboard_entries 
          WHERE user_id = $3 
            AND game_mode = $1 
            AND season_id = $2
        );
    `;
    const values = [gameMode, seasonId, userId];

    try {
      const result = await this.db.query(query, values);
      const rank = parseInt(result.rows[0].rank);
      
      // Check if the user actually has an entry in the leaderboard
      const userEntry = await this.findByUserAndMode(userId, gameMode, seasonId);
      return userEntry ? rank : -1;
    } catch (error) {
      throw new Error(`Error getting user rank by lines cleared: ${error.message}`);
    }
  }

  /**
   * Updates or creates a leaderboard entry for a user
   * @param {Object} userData - User data for the leaderboard entry
   * @returns {Promise<Object>} The updated or created leaderboard entry
   */
  async upsertEntry(userData) {
    const { user_id, score, lines_cleared, game_mode, season_id = 'all_time' } = userData;
    
    // First, try to find an existing entry
    const existingEntry = await this.findByUserAndMode(user_id, game_mode, season_id);
    
    if (existingEntry) {
      // Update the entry if the new score or lines cleared is better than the existing one
      let shouldUpdate = false;
      const updates = {};
      
      if (score > existingEntry.score) {
        updates.score = score;
        shouldUpdate = true;
      }
      
      if (lines_cleared > existingEntry.lines_cleared) {
        updates.lines_cleared = lines_cleared;
        shouldUpdate = true;
      }
      
      if (shouldUpdate) {
        return await this.update(user_id, game_mode, updates, season_id);
      } else {
        return existingEntry;
      }
    } else {
      // Create a new entry
      return await this.create({
        user_id,
        score,
        lines_cleared,
        game_mode,
        season_id
      });
    }
  }

  /**
   * Gets personal best records for a user
   * @param {string} userId - User ID to get personal bests for
   * @returns {Promise<Object>} Object containing personal best records
   */
  async getPersonalBests(userId) {
    const query = `
      SELECT 
        MAX(score) as best_score,
        MAX(lines_cleared) as best_lines_cleared
      FROM leaderboard_entries 
      WHERE user_id = $1;
    `;
    const values = [userId];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error getting personal bests: ${error.message}`);
    }
  }
}

module.exports = LeaderboardRepository;