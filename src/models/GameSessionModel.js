const { query } = require('../../database');

class GameSessionModel {
  static async create({ room_id, player_id, player_color, final_score, lines_cleared, total_lines_cleared, figures_placed, game_duration_seconds, final_grid, ending_reason, average_time_per_figure, max_combo, max_single_game_score }) {
    const sql = `
      INSERT INTO game_sessions (room_id, player_id, player_color, final_score, lines_cleared, total_lines_cleared, figures_placed, game_duration_seconds, final_grid, ending_reason, average_time_per_figure, max_combo, max_single_game_score)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;
    const params = [room_id, player_id, player_color, final_score, lines_cleared, total_lines_cleared, figures_placed, game_duration_seconds, final_grid, ending_reason, average_time_per_figure, max_combo, max_single_game_score];
    try {
      const result = await query(sql, params);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating game session:', error);
      throw error;
    }
  }

  static async findById(id) {
    const sql = 'SELECT * FROM game_sessions WHERE id = $1;';
    try {
      const result = await query(sql, [id]);
      return result.rows[0];
    } catch (error) {
      console.error(`Error finding game session by id ${id}:`, error);
      throw error;
    }
  }

  static async findByPlayerId(playerId) {
    const sql = 'SELECT * FROM game_sessions WHERE player_id = $1;';
    try {
      const result = await query(sql, [playerId]);
      return result.rows;
    } catch (error) {
      console.error(`Error finding game sessions by player_id ${playerId}:`, error);
      throw error;
    }
  }

  static async update(id, fields) {
    const keys = Object.keys(fields);
    const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
    const sql = `UPDATE game_sessions SET ${setClause} WHERE id = $1 RETURNING *;`;
    const params = [id, ...Object.values(fields)];
    try {
      const result = await query(sql, params);
      return result.rows[0];
    } catch (error) {
      console.error(`Error updating game session ${id}:`, error);
      throw error;
    }
  }
}

module.exports = GameSessionModel;