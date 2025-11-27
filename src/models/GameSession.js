/**
 * GameSession model class representing a game session with statistics and result tracking
 */
class GameSession {
  /**
   * Create a new GameSession instance
   * @param {Object} sessionData - Game session data object
   * @param {string} sessionData.id - Session ID (UUID)
   * @param {string} sessionData.user_id - User ID (UUID)
   * @param {string} sessionData.room_id - Room ID where the game took place
   * @param {string} sessionData.figure_id - ID of the figure definition used
   * @param {number} sessionData.start_time - Start time of the game session
   * @param {number} sessionData.end_time - End time of the game session
   * @param {number} sessionData.duration - Duration of the game in seconds
   * @param {number} sessionData.score - Final score of the game
   * @param {number} sessionData.lines_cleared - Number of lines cleared
   * @param {number} sessionData.figures_placed - Number of figures placed
   * @param {number} sessionData.cells_placed - Number of cells placed
   * @param {number} sessionData.highest_level_reached - Highest level reached
   * @param {number} sessionData.moves_count - Number of moves made
   * @param {number} sessionData.placement_efficiency - Efficiency of placements
   * @param {boolean} sessionData.is_victory - Whether the game was won
   * @param {boolean} sessionData.is_completed - Whether the game was completed
   * @param {Object} sessionData.initial_grid - Initial grid state (JSONB)
   * @param {Object} sessionData.final_grid - Final grid state (JSONB)
   * @param {Object} sessionData.game_state - Game state at the end (JSONB)
   * @param {Object} sessionData.figure_sequence - Sequence of figures (JSONB)
   * @param {Object} sessionData.placement_sequence - Sequence of placements (JSONB)
   * @param {number} sessionData.rating_change - Change in user rating
   * @param {string} sessionData.game_mode - Game mode (classic, challenge, etc.)
   * @param {Date} sessionData.created_at - Creation timestamp
   * @param {Date} sessionData.updated_at - Last update timestamp
   */
  constructor(sessionData) {
    this.id = sessionData.id;
    this.user_id = sessionData.user_id;
    this.room_id = sessionData.room_id;
    this.figure_id = sessionData.figure_id;
    this.start_time = sessionData.start_time ? new Date(sessionData.start_time) : new Date();
    this.end_time = sessionData.end_time ? new Date(sessionData.end_time) : null;
    this.duration = sessionData.duration || 0;
    this.score = sessionData.score || 0;
    this.lines_cleared = sessionData.lines_cleared || 0;
    this.figures_placed = sessionData.figures_placed || 0;
    this.cells_placed = sessionData.cells_placed || 0;
    this.highest_level_reached = sessionData.highest_level_reached || 1;
    this.moves_count = sessionData.moves_count || 0;
    this.placement_efficiency = sessionData.placement_efficiency || 0;
    this.is_victory = sessionData.is_victory || false;
    this.is_completed = sessionData.is_completed || false;
    this.initial_grid = sessionData.initial_grid || [];
    this.final_grid = sessionData.final_grid || [];
    this.game_state = sessionData.game_state || {};
    this.figure_sequence = sessionData.figure_sequence || [];
    this.placement_sequence = sessionData.placement_sequence || [];
    this.rating_change = sessionData.rating_change || 0;
    this.game_mode = sessionData.game_mode || 'classic';
    this.created_at = sessionData.created_at ? new Date(sessionData.created_at) : new Date();
    this.updated_at = sessionData.updated_at ? new Date(sessionData.updated_at) : new Date();
  }

  /**
   * Calculate game duration in seconds
   * @returns {number} Duration in seconds
   */
  calculateDuration() {
    if (!this.end_time) {
      return 0;
    }
    return Math.floor((this.end_time - this.start_time) / 1000);
  }

  /**
   * Calculate placement efficiency as a percentage
   * @returns {number} Placement efficiency percentage
   */
  calculatePlacementEfficiency() {
    if (this.figures_placed === 0) {
      return 0;
    }
    return Math.round((this.lines_cleared / this.figures_placed) * 100);
  }

  /**
   * Calculate score per minute
   * @returns {number} Score per minute
   */
  calculateScorePerMinute() {
    if (this.duration === 0) {
      return 0;
    }
    return Math.round((this.score / this.duration) * 60);
  }

  /**
   * Determine game result based on score and other factors
   * @returns {string} Game result ('victory', 'defeat', 'quit', 'timeout')
   */
  getGameResult() {
    if (this.is_victory) {
      return 'victory';
    } else if (this.is_completed) {
      return 'defeat';
    } else {
      return 'quit'; // Game was quit before completion
    }
  }

  /**
   * Calculate final score based on game statistics
   * @param {Object} scoringRules - Scoring rules configuration
   * @returns {number} Calculated final score
   */
  calculateFinalScore(scoringRules = {}) {
    // Default scoring rules
    const rules = {
      baseScorePerLine: scoringRules.baseScorePerLine || 100,
      levelMultiplier: scoringRules.levelMultiplier || 1.1,
      figureBonus: scoringRules.figureBonus || 10,
      speedBonus: scoringRules.speedBonus || 0.5,
      ...scoringRules
    };

    // Base score from lines cleared
    let baseScore = this.lines_cleared * rules.baseScorePerLine;

    // Level multiplier
    baseScore *= Math.pow(rules.levelMultiplier, this.highest_level_reached - 1);

    // Bonus for figures placed
    const figureBonus = this.figures_placed * rules.figureBonus;

    // Speed bonus (faster games get more points)
    let speedBonus = 0;
    if (this.duration > 0) {
      // The faster the game, the higher the speed bonus
      speedBonus = Math.max(0, (rules.speedBonus * 1000) / this.duration) * this.lines_cleared;
    }

    // Total score
    const totalScore = Math.round(baseScore + figureBonus + speedBonus);

    return totalScore;
  }

  /**
   * Update session with end game data
   * @param {Object} endGameData - Data collected at game end
   * @param {Date} endGameData.end_time - End time of the game
   * @param {number} endGameData.score - Final score
   * @param {number} endGameData.lines_cleared - Lines cleared
   * @param {number} endGameData.figures_placed - Figures placed
   * @param {number} endGameData.cells_placed - Cells placed
   * @param {number} endGameData.highest_level_reached - Highest level reached
   * @param {number} endGameData.moves_count - Moves count
   * @param {Object} endGameData.final_grid - Final grid state
   * @param {Object} endGameData.game_state - Final game state
   * @param {boolean} endGameData.is_victory - Whether game was won
   * @param {boolean} endGameData.is_completed - Whether game was completed
   * @returns {void}
   */
  updateWithEndData(endGameData) {
    this.end_time = endGameData.end_time ? new Date(endGameData.end_time) : new Date();
    this.duration = this.calculateDuration();
    this.score = endGameData.score || this.score;
    this.lines_cleared = endGameData.lines_cleared || this.lines_cleared;
    this.figures_placed = endGameData.figures_placed || this.figures_placed;
    this.cells_placed = endGameData.cells_placed || this.cells_placed;
    this.highest_level_reached = endGameData.highest_level_reached || this.highest_level_reached;
    this.moves_count = endGameData.moves_count || this.moves_count;
    this.is_victory = endGameData.is_victory !== undefined ? endGameData.is_victory : this.is_victory;
    this.is_completed = endGameData.is_completed !== undefined ? endGameData.is_completed : this.is_completed;
    this.final_grid = endGameData.final_grid || this.final_grid;
    this.game_state = endGameData.game_state || this.game_state;
    this.placement_efficiency = this.calculatePlacementEfficiency();
    this.updated_at = new Date();
  }

  /**
   * Check if the game session is valid (has required data)
   * @returns {boolean} True if session is valid
   */
  isValid() {
    return this.user_id && this.start_time && this.room_id;
  }

  /**
   * Get session summary for display
   * @returns {Object} Summary of the game session
   */
  getSummary() {
    return {
      id: this.id,
      user_id: this.user_id,
      duration: this.duration,
      score: this.score,
      lines_cleared: this.lines_cleared,
      figures_placed: this.figures_placed,
      result: this.getGameResult(),
      game_mode: this.game_mode,
      date: this.start_time,
      placement_efficiency: this.placement_efficiency
    };
  }

  /**
   * Check if this session is a personal best for the user
   * @param {Object} userStats - User's current statistics
   * @returns {boolean} True if this session represents a personal best
   */
  isPersonalBest(userStats) {
    if (!userStats) return false;

    // Check if this score is a new personal best
    if (this.score > (userStats.best_score || 0)) {
      return true;
    }

    // Check if these lines cleared is a new personal best
    if (this.lines_cleared > (userStats.best_lines_cleared || 0)) {
      return true;
    }

    // Check if this duration is a new record (faster completion)
    if (this.duration > 0 && this.duration < (userStats.best_duration || Infinity)) {
      return true;
    }

    return false;
  }

  /**
   * Convert game session object to JSON for database storage
   * @returns {Object} Game session data for database storage
   */
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      room_id: this.room_id,
      figure_id: this.figure_id,
      start_time: this.start_time,
      end_time: this.end_time,
      duration: this.duration,
      score: this.score,
      lines_cleared: this.lines_cleared,
      figures_placed: this.figures_placed,
      cells_placed: this.cells_placed,
      highest_level_reached: this.highest_level_reached,
      moves_count: this.moves_count,
      placement_efficiency: this.placement_efficiency,
      is_victory: this.is_victory,
      is_completed: this.is_completed,
      initial_grid: this.initial_grid,
      final_grid: this.final_grid,
      game_state: this.game_state,
      figure_sequence: this.figure_sequence,
      placement_sequence: this.placement_sequence,
      rating_change: this.rating_change,
      game_mode: this.game_mode,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

export default GameSession;