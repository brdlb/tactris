const { query } = require('../../database');

class UserModel {
  static async create({ google_id, email, display_name, profile_picture_url, is_anonymous, anonymous_id }) {
    const sql = `
      INSERT INTO users (google_id, email, display_name, profile_picture_url, is_anonymous, anonymous_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const params = [google_id, email, display_name, profile_picture_url, is_anonymous, anonymous_id];
    try {
      const result = await query(sql, params);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async findById(id) {
    const sql = 'SELECT * FROM users WHERE id = $1;';
    try {
      const result = await query(sql, [id]);
      return result.rows[0];
    } catch (error) {
      console.error(`Error finding user by id ${id}:`, error);
      throw error;
    }
  }

  static async findByGoogleId(googleId) {
    const sql = 'SELECT * FROM users WHERE google_id = $1;';
    try {
      const result = await query(sql, [googleId]);
      return result.rows[0];
    } catch (error) {
      console.error(`Error finding user by google_id ${googleId}:`, error);
      throw error;
    }
  }

  static async findByAnonymousId(anonymousId) {
    const sql = 'SELECT * FROM users WHERE anonymous_id = $1;';
    try {
      const result = await query(sql, [anonymousId]);
      return result.rows[0];
    } catch (error) {
      console.error(`Error finding user by anonymous_id ${anonymousId}:`, error);
      throw error;
    }
  }

  static async update(id, fields) {
    const keys = Object.keys(fields);
    const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
    const sql = `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *;`;
    const params = [id, ...Object.values(fields)];
    try {
      const result = await query(sql, params);
      return result.rows[0];
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      throw error;
    }
  }

  static async getAll() {
    const sql = 'SELECT * FROM users;';
    try {
      const result = await query(sql);
      return result.rows;
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }
}

module.exports = UserModel;