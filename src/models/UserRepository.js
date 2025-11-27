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
    const allowedFields = ['username', 'email', 'avatar_url', 'is_anonymous'];
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
    const query = `
      INSERT INTO users (username, is_anonymous)
      VALUES ('Anonymous_' || gen_random_uuid(), true)
      RETURNING *;
    `;

    try {
      const result = await this.db.query(query);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating anonymous user: ${error.message}`);
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
      SET last_seen = NOW()
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
}

module.exports = UserRepository;