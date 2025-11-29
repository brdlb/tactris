/**
 * GameStatistics model class representing aggregated game statistics with aggregation methods
 */
class GameStatistics {
  /**
   * Create a new GameStatistics instance
   * @param {Object} statsData - Statistics data object
   * @param {string} statsData.id - Statistics record ID (UUID)
   * @param {string} statsData.user_id - User ID (UUID)
   * @param {number} statsData.total_games - Total number of games played
   * @param {number} statsData.total_score - Total accumulated score
   * @param {number} statsData.best_score - Highest score achieved
   * @param {number} statsData.total_lines_cleared - Total lines cleared across all games
   * @param {number} statsData.best_lines_cleared - Highest lines cleared in a single game
   * @param {number} statsData.total_figures_placed - Total figures placed across all games
   * @param {number} statsData.total_duration - Total duration of all games in seconds
   * @param {number} statsData.best_duration - Shortest duration for completing a game
   * @param {number} statsData.total_moves - Total moves made across all games
   * @param {number} statsData.avg_placement_efficiency - Average placement efficiency
   * @param {number} statsData.current_games_streak - Current games streak
   * @param {number} statsData.best_games_streak - Best games streak achieved
   * @param {number} statsData.rating - Current user rating
   * @param {Date} statsData.created_at - Creation timestamp
   * @param {Date} statsData.updated_at - Last update timestamp
   */
  constructor(statsData) {
    this.id = statsData.id;
    this.user_id = statsData.user_id;
    this.total_games = statsData.total_games || 0;
    this.total_wins = statsData.total_wins || 0;
    this.total_score = statsData.total_score || 0;
    this.best_score = statsData.best_score || 0;
    this.total_lines_cleared = statsData.total_lines_cleared || 0;
    this.best_lines_cleared = statsData.best_lines_cleared || 0;
    this.total_figures_placed = statsData.total_figures_placed || 0;
    this.total_duration = statsData.total_duration || 0;
    this.best_duration = statsData.best_duration || 0;
    this.total_moves = statsData.total_moves || 0;
    this.avg_placement_efficiency = statsData.avg_placement_efficiency || 0;
    this.current_games_streak = statsData.current_games_streak || 0;
    this.best_games_streak = statsData.best_games_streak || 0;
    this.rating = statsData.rating || 1000; // Default rating
    this.created_at = statsData.created_at ? new Date(statsData.created_at) : new Date();
    this.updated_at = statsData.updated_at ? new Date(statsData.updated_at) : new Date();
  }

  /**
   * Calculate win rate as a percentage
   * @returns {number} Win rate percentage
   */

  /**
   * Calculate average score per game
   * @returns {number} Average score
   */
  calculateAverageScore() {
    if (this.total_games === 0) {
      return 0;
    }
    return Math.round(this.total_score / this.total_games);
  }

  /**
   * Calculate average lines cleared per game
   * @returns {number} Average lines cleared
   */
  calculateAverageLinesCleared() {
    if (this.total_games === 0) {
      return 0;
    }
    return Math.round(this.total_lines_cleared / this.total_games);
  }

  /**
   * Calculate average game duration in seconds
   * @returns {number} Average duration in seconds
   */
  calculateAverageDuration() {
    if (this.total_games === 0) {
      return 0;
    }
    return Math.round(this.total_duration / this.total_games);
  }

  /**
   * Calculate average moves per game
   * @returns {number} Average moves
   */
  calculateAverageMoves() {
    if (this.total_games === 0) {
      return 0;
    }
    return Math.round(this.total_moves / this.total_games);
  }

  /**
   * Calculate average score per minute
   * @returns {number} Average score per minute
   */
  calculateAverageScorePerMinute() {
    if (this.total_duration === 0) {
      return 0;
    }
    return Math.round((this.total_score / this.total_duration) * 60);
  }

  /**
   * Update statistics with a new game session
   * @param {Object} gameSession - Game session data to incorporate
   * @returns {void}
   */
  updateWithGameSession(gameSession) {
      // Increment total games
      this.total_games = parseInt(this.total_games) + 1;

      // Update games streak
      this.current_games_streak = parseInt(this.current_games_streak) + 1;
      
      // Update best streak if current streak is better
      if (this.current_games_streak > this.best_games_streak) {
          this.best_games_streak = this.current_games_streak;
      }

      // Update score statistics
      this.total_score = parseInt(this.total_score) + gameSession.score;
      if (gameSession.score > this.best_score) {
          this.best_score = gameSession.score;
      }

      // Update lines cleared statistics
      this.total_lines_cleared = parseInt(this.total_lines_cleared) + gameSession.lines_cleared;
      if (gameSession.lines_cleared > this.best_lines_cleared) {
          this.best_lines_cleared = gameSession.lines_cleared;
      }

      // Update figures placed
      this.total_figures_placed = parseInt(this.total_figures_placed) + gameSession.figures_placed;

      // Update duration statistics
      this.total_duration = parseInt(this.total_duration) + gameSession.duration;
      if (this.best_duration === 0 || (gameSession.duration > 0 && gameSession.duration < this.best_duration)) {
          this.best_duration = gameSession.duration;
      }

      // Update moves count
      this.total_moves = parseInt(this.total_moves) + gameSession.moves_count;

      // Update average placement efficiency (weighted average)
      const totalEfficiency = (this.avg_placement_efficiency * (this.total_games - 1)) + gameSession.placement_efficiency;
      this.avg_placement_efficiency = totalEfficiency / this.total_games;

      // Update rating based on game performance
      this.updateRating(gameSession);

      // Update timestamp
      this.updated_at = new Date();
  }

  /**
   * Update user rating based on game performance
   * @param {Object} gameSession - Game session data
   * @returns {void}
   */
  updateRating(gameSession) {
      // Base rating change
      let ratingChange = 0;
      
      // Score-based adjustment (higher scores get more points)
      ratingChange += Math.min(20, Math.floor(gameSession.score / 100));
      
      // Lines cleared bonus
      ratingChange += Math.min(15, gameSession.lines_cleared / 10);
      
      // Efficiency bonus
      if (gameSession.placement_efficiency > 80) {
          ratingChange += 10;
      } else if (gameSession.placement_efficiency > 60) {
          ratingChange += 5;
      }
      
      // Duration factor (faster games might get more points, depending on strategy)
      if (gameSession.duration > 0) {
          // Add rating based on score per minute, but cap it
          const scorePerMinute = (gameSession.score / gameSession.duration) * 60;
          ratingChange += Math.min(10, Math.floor(scorePerMinute / 100));
      }
      
      // Apply rating change
      this.rating = Math.max(100, this.rating + ratingChange); // Minimum rating of 10
  }

  /**
   * Reset streaks (used when user hasn't played for a while)
   * @returns {void}
   */
  resetStreaks() {
      this.current_games_streak = 0;
  }

  /**
   * Aggregate multiple game statistics records
   * @param {Array} statsArray - Array of GameStatistics objects to aggregate
   * @returns {GameStatistics} Aggregated statistics
   */
  static aggregateStats(statsArray) {
    if (!statsArray || statsArray.length === 0) {
      return new GameStatistics({});
    }

    // Initialize with first stats object
    const aggregated = new GameStatistics({
      ...statsArray[0],
      total_games: 0,
      total_wins: 0,
      total_score: 0,
      best_score: 0,
      total_lines_cleared: 0,
      best_lines_cleared: 0,
      total_figures_placed: 0,
      total_duration: 0,
      best_duration: 0,
      total_moves: 0,
      avg_placement_efficiency: 0,
      current_streak: 0,
      best_streak: 0,
      rating: 0
    });

    // Aggregate all stats
    let totalEfficiencyWeight = 0;
    for (const stats of statsArray) {
        aggregated.total_games = parseInt(aggregated.total_games) + parseInt(stats.total_games);
        aggregated.total_score = parseInt(aggregated.total_score) + parseInt(stats.total_score);
        aggregated.total_lines_cleared = parseInt(aggregated.total_lines_cleared) + parseInt(stats.total_lines_cleared);
        aggregated.total_figures_placed = parseInt(aggregated.total_figures_placed) + parseInt(stats.total_figures_placed);
        aggregated.total_duration = parseInt(aggregated.total_duration) + parseInt(stats.total_duration);
        aggregated.total_moves = parseInt(aggregated.total_moves) + parseInt(stats.total_moves);
        
        // Track best values
        if (stats.best_score > aggregated.best_score) {
            aggregated.best_score = stats.best_score;
        }
        if (stats.best_lines_cleared > aggregated.best_lines_cleared) {
            aggregated.best_lines_cleared = stats.best_lines_cleared;
        }
        if (stats.best_duration === 0 || (aggregated.best_duration > 0 && stats.best_duration < aggregated.best_duration)) {
            aggregated.best_duration = stats.best_duration;
        }
        if (stats.best_games_streak > aggregated.best_games_streak) {
            aggregated.best_games_streak = stats.best_games_streak;
        }
        
        // For average efficiency, we need to weight by number of games
        totalEfficiencyWeight += stats.avg_placement_efficiency * stats.total_games;
    }

    // Calculate weighted average efficiency
    if (aggregated.total_games > 0) {
      aggregated.avg_placement_efficiency = totalEfficiencyWeight / aggregated.total_games;
    }

    // For rating, we'll take the latest one or average
    // Taking the average for now, but could be configured differently
    const totalRating = statsArray.reduce((sum, stats) => sum + stats.rating, 0);
    aggregated.rating = Math.round(totalRating / statsArray.length);

    return aggregated;
  }

  /**
   * Get statistics summary for display
   * @returns {Object} Summary of the game statistics
   */
  getSummary() {
      return {
          user_id: this.user_id,
          total_games: this.total_games,
          total_score: this.total_score,
          average_score: this.calculateAverageScore(),
          best_score: this.best_score,
          total_lines_cleared: this.total_lines_cleared,
          average_lines_cleared: this.calculateAverageLinesCleared(),
          best_lines_cleared: this.best_lines_cleared,
          total_duration: this.total_duration,
          average_duration: this.calculateAverageDuration(),
          rating: this.rating,
          current_games_streak: this.current_games_streak,
          best_games_streak: this.best_games_streak
      };
  }

  /**
   * Check if statistics are above a certain threshold
   * @param {Object} thresholds - Thresholds to check against
   * @param {number} thresholds.minGames - Minimum number of games
   * @param {number} thresholds.minAvgScore - Minimum average score
   * @returns {boolean} True if all thresholds are met
   */
  meetsThresholds(thresholds) {
      if (thresholds.minGames && this.total_games < thresholds.minGames) {
          return false;
      }
      
      if (thresholds.minAvgScore && this.calculateAverageScore() < thresholds.minAvgScore) {
          return false;
      }
      
      return true;
  }

  /**
   * Convert game statistics object to JSON for database storage
   * @returns {Object} Game statistics data for database storage
   */
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      total_games: this.total_games,
      total_wins: this.total_wins,
      total_score: this.total_score,
      best_score: this.best_score,
      total_lines_cleared: this.total_lines_cleared,
      best_lines_cleared: this.best_lines_cleared,
      total_figures_placed: this.total_figures_placed,
      total_duration: this.total_duration,
      best_duration: this.best_duration,
      total_moves: this.total_moves,
      avg_placement_efficiency: this.avg_placement_efficiency,
      current_games_streak: this.current_games_streak,
      best_games_streak: this.best_games_streak,
      rating: this.rating,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = GameStatistics;