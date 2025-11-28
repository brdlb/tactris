/**
 * UserRepository - Handles user creation, retrieval, and updates
 */
class UserRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Creates a new user in the database
   * @param {Object} userData - User data to create
   * @returns {Promise<Object>} The created user
   */
  async create(userData) {
    const { 
      auth_id, 
      auth_provider, 
      username, 
      email, 
      avatar_url, 
      is_anonymous = false 
    } = userData;

    const query = `
      INSERT INTO users (auth_id, auth_provider, username, email, avatar_url, is_anonymous)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const values = [auth_id, auth_provider, username, email, avatar_url, is_anonymous];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  /**
   * Finds a user by their ID
   * @param {string} id - User ID to find
   * @returns {Promise<Object|null>} The found user or null
   */
  async findById(id) {
    const query = 'SELECT * FROM users WHERE id = $1;';
    const values = [id];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding user by ID: ${error.message}`);
    }
  }

  /**
   * Finds a user by their authentication ID and provider
   * @param {string} authId - Authentication ID
   * @param {string} authProvider - Authentication provider
   * @returns {Promise<Object|null>} The found user or null
   */
  async findByAuthId(authId, authProvider) {
    const query = 'SELECT * FROM users WHERE auth_id = $1 AND auth_provider = $2;';
    const values = [authId, authProvider];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding user by auth ID: ${error.message}`);
    }
  }

  /**
   * Finds a user by their username
   * @param {string} username - Username to find
   * @returns {Promise<Object|null>} The found user or null
   */
  async findByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = $1;';
    const values = [username];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding user by username: ${error.message}`);
    }
  }

  /**
   * Finds a user by their email
   * @param {string} email - Email to find
   * @returns {Promise<Object|null>} The found user or null
   */
  async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1;';
    const values = [email];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding user by email: ${error.message}`);
    }
  }

  /**
   * Updates a user's information
   * @param {string} id - User ID to update
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} The updated user
   */
  async update(id, updates) {
    const allowedFields = ['username', 'email', 'avatar_url', 'is_anonymous', 'anonymous_token'];
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
      UPDATE users 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    values.unshift(id); // Add ID as the first parameter

    try {
      const result = await this.db.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }
  }

  /**
   * Creates an anonymous user
   * @returns {Promise<Object>} The created anonymous user
   */
  async createAnonymous() {
    // Generate a unique anonymous ID
    const anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const username = `Anonymous_${Math.floor(Math.random() * 10000)}`;
    
    // Try to insert with the anonymous_token column first
    const query = `
      INSERT INTO users (anonymous_id, username, is_anonymous)
      VALUES ($1, $2, true)
      RETURNING *;
    `;

    try {
      const result = await this.db.query(query, [anonymousId, username]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating anonymous user: ${error.message}`);
    }
  }
  
  /**
   * Finds a user by their anonymous token
   * @param {string} anonymousToken - Anonymous token to find
   * @returns {Promise<Object|null>} The found user or null
   */
  async findByAnonymousToken(anonymousToken) {
    const query = 'SELECT * FROM users WHERE anonymous_token = $1;';
    const values = [anonymousToken];
    
    try {
      const result = await this.db.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding user by anonymous token: ${error.message}`);
    }
  }
  
  /**
   * Updates the anonymous token for a user
   * @param {string} userId - User ID to update
   * @param {string} anonymousToken - Anonymous token to set
   * @returns {Promise<Object>} The updated user
   */
  async updateAnonymousToken(userId, anonymousToken) {
    const query = `
      UPDATE users
      SET anonymous_token = $2
      WHERE id = $1
      RETURNING *;
    `;
    const values = [userId, anonymousToken];
    
    try {
      const result = await this.db.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error updating anonymous token: ${error.message}`);
    }
  }

  /**
   * Finds a user by their anonymous ID
   * @param {string} anonymousId - Anonymous ID to find
   * @returns {Promise<Object|null>} The found user or null
   */
  async findByAnonymousId(anonymousId) {
    const query = 'SELECT * FROM users WHERE anonymous_id = $1;';
    const values = [anonymousId];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding user by anonymous ID: ${error.message}`);
    }
  }

  /**
   * Links an anonymous user to an authenticated account
   * @param {string} anonymousId - Anonymous ID of the user to link
   * @param {string} authId - Authentication ID (e.g., Google ID)
   * @param {string} authProvider - Authentication provider (e.g., 'google')
   * @param {string} email - User's email
   * @param {string} displayName - User's display name
   * @param {string} profilePictureUrl - URL to user's profile picture
   * @returns {Promise<Object>} The updated user
   */
  async linkAnonymousToAuthenticated(anonymousId, authId, authProvider, email, displayName, profilePictureUrl) {
    const query = `
      UPDATE users
      SET google_id = $2, email = $3, display_name = $4, profile_picture_url = $5, is_anonymous = false, anonymous_id = NULL
      WHERE anonymous_id = $1
      RETURNING *;
    `;
    const values = [anonymousId, authId, email, displayName, profilePictureUrl];

    try {
      const result = await this.db.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('Anonymous user not found');
      }
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error linking anonymous user to authenticated account: ${error.message}`);
    }
  }

  /**
   * Finds a user by their authentication ID and provider
   * @param {string} authId - Authentication ID (e.g., Google ID)
   * @param {string} authProvider - Authentication provider (e.g., 'google')
   * @returns {Promise<Object|null>} The found user or null
   */
  async findByAuthId(authId, authProvider) {
    let query, values;
    
    if (authProvider === 'google') {
      query = 'SELECT * FROM users WHERE google_id = $1;';
      values = [authId];
    } else {
      throw new Error(`Unsupported auth provider: ${authProvider}`);
    }

    try {
      const result = await this.db.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding user by auth ID: ${error.message}`);
    }
  }

  /**
   * Merges an anonymous user's data with an existing authenticated user
   * @param {string} anonymousId - Anonymous ID of the user to merge
   * @param {string} userId - ID of the existing authenticated user to merge with
   * @returns {Promise<Object>} The merged user
   */
  async mergeAnonymousWithUser(anonymousId, userId) {
    // This would typically involve merging game statistics, settings, etc. from the anonymous user to the authenticated user
    // For now, we'll just delete the anonymous user after ensuring the authenticated user exists
    
    const findAnonymousQuery = 'SELECT * FROM users WHERE anonymous_id = $1;';
    const findAnonymousResult = await this.db.query(findAnonymousQuery, [anonymousId]);
    
    if (findAnonymousResult.rows.length === 0) {
      throw new Error('Anonymous user not found');
    }

    const anonymousUser = findAnonymousResult.rows[0];
    
    // Delete the anonymous user record (this will cascade delete related data like game sessions, stats, etc.)
    const deleteQuery = 'DELETE FROM users WHERE anonymous_id = $1;';
    await this.db.query(deleteQuery, [anonymousId]);
    
    // Return the authenticated user
    return await this.findById(userId);
  }

  /**
   * Cleans up old anonymous user records that have not been seen recently
   * @param {number} days - Number of days after which to clean up old anonymous users (default 30)
   * @returns {Promise<number>} Number of deleted users
   */
  async cleanupOldAnonymousUsers(days = 30) {
    const query = `
      DELETE FROM users
      WHERE is_anonymous = true AND last_seen_at < NOW() - INTERVAL '1 day' * $1
      AND id NOT IN (
        SELECT DISTINCT player_id FROM game_sessions WHERE started_at > NOW() - INTERVAL '1 day' * $1
      );
    `;
    const values = [days];

    try {
      const result = await this.db.query(query, values);
      return result.rowCount;
    } catch (error) {
      throw new Error(`Error cleaning up old anonymous users: ${error.message}`);
    }
  }

  /**
   * Updates the last seen timestamp for a user
   * @param {string} id - User ID to update
   * @returns {Promise<Object>} The updated user
   */
  async updateLastSeen(id) {
    const query = `
      UPDATE users
      SET last_seen_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const values = [id];

    try {
      const result = await this.db.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error updating last seen: ${error.message}`);
    }
  }
  /**
   * Gets all users from the database
   * @returns {Promise<Array>} Array of all users
   */
  async getAllUsers() {
    const query = 'SELECT * FROM users ORDER BY created_at DESC;';
    
    try {
      const result = await this.db.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Error getting all users: ${error.message}`);
    }
  }
}


module.exports = UserRepository;