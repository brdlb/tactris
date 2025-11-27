const { query } = require('../../database');

class GameModel {
  static async create({ player_id, game_state, current_figure, score, lines_cleared, is_game_over }) {
    const sql = `
      INSERT INTO games (player_id, game_state, current_figure, score, lines_cleared, is_game_over)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const params = [player_id, game_state, current_figure, score, lines_cleared, is_game_over];
    try {
      const result = await query(sql, params);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating game:', error);
      throw error;
    }
  }

  static async findById(id) {
    const sql = 'SELECT * FROM games WHERE id = $1;';
    try {
      const result = await query(sql, [id]);
      return result.rows[0];
    } catch (error) {
      console.error(`Error finding game by id ${id}:`, error);
      throw error;
    }
  }

  static async findByPlayerId(playerId) {
    const sql = 'SELECT * FROM games WHERE player_id = $1;';
    try {
      const result = await query(sql, [playerId]);
      return result.rows;
    } catch (error) {
      console.error(`Error finding games by player_id ${playerId}:`, error);
      throw error;
    }
  }

  static async update(id, fields) {
    const keys = Object.keys(fields);
    const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
    const sql = `UPDATE games SET ${setClause} WHERE id = $1 RETURNING *;`;
    const params = [id, ...Object.values(fields)];
    try {
      const result = await query(sql, params);
      return result.rows[0];
    } catch (error) {
      console.error(`Error updating game ${id}:`, error);
      throw error;
    }
  }
}

module.exports = GameModel;