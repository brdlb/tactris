/**
 * SessionRepository - Handles session creation, retrieval, updates, and cleanup
 */
class SessionRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Creates a new session in the database
   * @param {Object} sessionData - Session data to create
   * @returns {Promise<Object>} The created session
   */
  async create(sessionData) {
    const { 
      user_id, 
      session_token, 
      expires_at, 
      ip_address, 
      user_agent 
    } = sessionData;

    const query = `
      INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const values = [user_id, session_token, expires_at, ip_address, user_agent];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating session: ${error.message}`);
    }
  }

  /**
   * Finds a session by its token
   * @param {string} sessionToken - Session token to find
   * @returns {Promise<Object|null>} The found session or null
   */
  async findByToken(sessionToken) {
    const query = 'SELECT * FROM user_sessions WHERE session_token = $1 AND is_active = true;';
    const values = [sessionToken];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding session by token: ${error.message}`);
    }
  }

  /**
   * Finds a session by its ID
   * @param {string} id - Session ID to find
   * @returns {Promise<Object|null>} The found session or null
   */
  async findById(id) {
    const query = 'SELECT * FROM user_sessions WHERE id = $1 AND is_active = true;';
    const values = [id];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding session by ID: ${error.message}`);
    }
  }

 /**
   * Finds all active sessions for a user
   * @param {string} userId - User ID to find sessions for
   * @returns {Promise<Array>} Array of active sessions
   */
  async findByUserId(userId) {
    const query = 'SELECT * FROM user_sessions WHERE user_id = $1 AND is_active = true;';
    const values = [userId];

    try {
      const result = await this.db.query(query, values);
      return result.rows;
    } catch (error) {
      throw new Error(`Error finding sessions by user ID: ${error.message}`);
    }
  }

  /**
   * Updates a session's information
   * @param {string} id - Session ID to update
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} The updated session
   */
  async update(id, updates) {
    const allowedFields = ['expires_at', 'ip_address', 'user_agent', 'is_active'];
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
      UPDATE user_sessions 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    values.unshift(id); // Add ID as the first parameter

    try {
      const result = await this.db.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('Session not found');
      }
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error updating session: ${error.message}`);
    }
  }

  /**
   * Expires a session by setting its active status to false
   * @param {string} id - Session ID to expire
   * @returns {Promise<Object>} The expired session
   */
  async expire(id) {
    return this.update(id, { is_active: false });
  }

  /**
   * Expires all sessions for a user
   * @param {string} userId - User ID whose sessions to expire
   * @returns {Promise<number>} Number of expired sessions
   */
  async expireAllForUser(userId) {
    const query = `
      UPDATE user_sessions 
      SET is_active = false, updated_at = NOW()
      WHERE user_id = $1 AND is_active = true
      RETURNING id;
    `;
    const values = [userId];

    try {
      const result = await this.db.query(query, values);
      return result.rows.length;
    } catch (error) {
      throw new Error(`Error expiring sessions for user: ${error.message}`);
    }
  }

  /**
   * Deletes expired sessions from the database
   * @returns {Promise<number>} Number of deleted sessions
   */
  async cleanupExpired() {
    const query = `
      DELETE FROM user_sessions 
      WHERE expires_at < NOW() OR (is_active = false AND updated_at < NOW() - INTERVAL '7 days');
    `;

    try {
      const result = await this.db.query(query);
      return result.rowCount;
    } catch (error) {
      throw new Error(`Error cleaning up expired sessions: ${error.message}`);
    }
  }

  /**
   * Revokes a session by token
   * @param {string} sessionToken - Session token to revoke
   * @returns {Promise<boolean>} True if session was revoked
   */
  async revokeByToken(sessionToken) {
    const query = `
      UPDATE user_sessions 
      SET is_active = false, updated_at = NOW()
      WHERE session_token = $1
      RETURNING id;
    `;
    const values = [sessionToken];

    try {
      const result = await this.db.query(query, values);
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Error revoking session: ${error.message}`);
    }
  }
}

module.exports = SessionRepository;