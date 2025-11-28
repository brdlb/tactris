/**
 * LeaderboardEntry model class representing a leaderboard entry with ranking methods
 */
class LeaderboardEntry {
  /**
   * Create a new LeaderboardEntry instance
   * @param {Object} entryData - Leaderboard entry data object
   * @param {string} entryData.id - Entry ID (UUID)
   * @param {string} entryData.user_id - User ID (UUID)
   * @param {string} entryData.username - Username
   * @param {number} entryData.score - Score value for this entry
   * @param {number} entryData.lines_cleared - Lines cleared value for this entry
   * @param {string} entryData.game_mode - Game mode (classic, challenge, etc.)
   * @param {string} entryData.period - Period type (all_time, weekly, monthly)
   * @param {number} entryData.rank - Current rank in the leaderboard
   * @param {Date} entryData.created_at - Creation timestamp
   * @param {Date} entryData.updated_at - Last update timestamp
   */
  constructor(entryData) {
    this.id = entryData.id;
    this.user_id = entryData.user_id;
    this.username = entryData.username;
    this.score = entryData.score || 0;
    this.lines_cleared = entryData.lines_cleared || 0;
    this.game_mode = entryData.game_mode || 'classic';
    this.period = entryData.period || 'all_time';
    this.rank = entryData.rank || 0;
    this.created_at = entryData.created_at ? new Date(entryData.created_at) : new Date();
    this.updated_at = entryData.updated_at ? new Date(entryData.updated_at) : new Date();
  }

  /**
   * Compare this entry with another entry to determine ranking
   * @param {LeaderboardEntry} otherEntry - Another leaderboard entry to compare with
   * @param {string} sortBy - Field to sort by ('score' or 'lines_cleared')
   * @returns {number} Comparison result (-1, 0, or 1)
   */
  compareTo(otherEntry, sortBy = 'score') {
    if (sortBy === 'score') {
      // Higher score is better
      if (this.score > otherEntry.score) return -1;
      if (this.score < otherEntry.score) return 1;
      // If scores are equal, compare by lines cleared
      if (this.lines_cleared > otherEntry.lines_cleared) return -1;
      if (this.lines_cleared < otherEntry.lines_cleared) return 1;
      // If lines cleared are also equal, compare by time (earlier time is better)
      return this.created_at - otherEntry.created_at;
    } else if (sortBy === 'lines_cleared') {
      // Higher lines cleared is better
      if (this.lines_cleared > otherEntry.lines_cleared) return -1;
      if (this.lines_cleared < otherEntry.lines_cleared) return 1;
      // If lines cleared are equal, compare by score
      if (this.score > otherEntry.score) return -1;
      if (this.score < otherEntry.score) return 1;
      // If scores are also equal, compare by time (earlier time is better)
      return this.created_at - otherEntry.created_at;
    }
    
    // Default comparison by score
    return this.compareTo(otherEntry, 'score');
  }

  /**
   * Check if this entry is better than another entry
   * @param {LeaderboardEntry} otherEntry - Another leaderboard entry to compare with
   * @param {string} sortBy - Field to sort by ('score' or 'lines_cleared')
   * @returns {boolean} True if this entry is better
   */
  isBetterThan(otherEntry, sortBy = 'score') {
    return this.compareTo(otherEntry, sortBy) < 0;
  }

  /**
   * Calculate rank based on comparison with a list of entries
   * @param {Array} entries - Array of leaderboard entries to rank against
   * @param {string} sortBy - Field to sort by ('score' or 'lines_cleared')
   * @returns {number} Rank position (1-based)
   */
  calculateRank(entries, sortBy = 'score') {
    // Count how many entries are better than this one
    let rank = 1;
    for (const entry of entries) {
      if (entry.compareTo(this, sortBy) < 0) {
        rank++;
      }
    }
    return rank;
  }

  /**
   * Update rank based on comparison with a list of entries
   * @param {Array} entries - Array of leaderboard entries to rank against
   * @param {string} sortBy - Field to sort by ('score' or 'lines_cleared')
   * @returns {void}
   */
  updateRank(entries, sortBy = 'score') {
    this.rank = this.calculateRank(entries, sortBy);
  }

  /**
   * Check if this entry is in the top N
   * @param {number} n - Top N threshold (default 10)
   * @returns {boolean} True if entry is in top N
   */
  isInTopN(n = 10) {
    return this.rank > 0 && this.rank <= n;
  }

  /**
   * Check if this entry represents a personal best for the user
   * @param {Array} userEntries - Array of entries for the same user
   * @param {string} sortBy - Field to sort by ('score' or 'lines_cleared')
   * @returns {boolean} True if this is a personal best
   */
  isPersonalBest(userEntries, sortBy = 'score') {
    if (!userEntries || userEntries.length === 0) {
      return true; // If no previous entries, this is a personal best
    }

    for (const entry of userEntries) {
      if (entry.user_id === this.user_id && entry.id !== this.id) {
        if (sortBy === 'score' && entry.score > this.score) {
          return false;
        } else if (sortBy === 'lines_cleared' && entry.lines_cleared > this.lines_cleared) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Format the score for display
   * @returns {string} Formatted score string
   */
  formatScore() {
    return this.score.toLocaleString();
  }

  /**
   * Format the lines cleared for display
   * @returns {string} Formatted lines cleared string
   */
  formatLinesCleared() {
    return this.lines_cleared.toLocaleString();
  }

  /**
   * Get a formatted time string for when this entry was created
   * @param {string} locale - Locale for formatting (default 'en-US')
   * @returns {string} Formatted time string
   */
  getTimeAgo(locale = 'en-US') {
    const now = new Date();
    const diffMs = now - this.created_at;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }

  /**
   * Check if this entry is for the same user as another entry
   * @param {LeaderboardEntry} otherEntry - Another leaderboard entry
   * @returns {boolean} True if both entries are for the same user
   */
  isSameUser(otherEntry) {
    return this.user_id === otherEntry.user_id;
  }

  /**
   * Check if this entry is for the same period as another entry
   * @param {LeaderboardEntry} otherEntry - Another leaderboard entry
   * @returns {boolean} True if both entries are for the same period
   */
  isSamePeriod(otherEntry) {
    return this.period === otherEntry.period;
  }

  /**
   * Check if this entry is for the same game mode as another entry
   * @param {LeaderboardEntry} otherEntry - Another leaderboard entry
   * @returns {boolean} True if both entries are for the same game mode
   */
  isSameGameMode(otherEntry) {
    return this.game_mode === otherEntry.game_mode;
  }

  /**
   * Get a summary of this leaderboard entry
   * @returns {Object} Summary of the leaderboard entry
   */
  getSummary() {
    return {
      rank: this.rank,
      username: this.username,
      score: this.score,
      lines_cleared: this.lines_cleared,
      game_mode: this.game_mode,
      period: this.period,
      time_ago: this.getTimeAgo(),
      is_personal_best: this.isPersonalBest([this], 'score') // This will always be true for a single entry
    };
  }

  /**
   * Static method to sort entries by a specific field
   * @param {Array} entries - Array of leaderboard entries
   * @param {string} sortBy - Field to sort by ('score' or 'lines_cleared')
   * @param {string} period - Period to filter by (optional)
   * @param {string} gameMode - Game mode to filter by (optional)
   * @returns {Array} Sorted array of entries
   */
  static sortEntries(entries, sortBy = 'score', period = null, gameMode = null) {
    let filteredEntries = entries;
    
    // Filter by period if specified
    if (period) {
      filteredEntries = filteredEntries.filter(entry => entry.period === period);
    }
    
    // Filter by game mode if specified
    if (gameMode) {
      filteredEntries = filteredEntries.filter(entry => entry.game_mode === gameMode);
    }
    
    // Sort the entries
    return filteredEntries.sort((a, b) => a.compareTo(b, sortBy));
  }

  /**
   * Static method to calculate ranks for an array of entries
   * @param {Array} entries - Array of leaderboard entries
   * @param {string} sortBy - Field to sort by ('score' or 'lines_cleared')
   * @param {string} period - Period to filter by (optional)
   * @param {string} gameMode - Game mode to filter by (optional)
   * @returns {Array} Array of entries with updated ranks
   */
  static calculateRanks(entries, sortBy = 'score', period = null, gameMode = null) {
    // Sort entries first
    const sortedEntries = this.sortEntries(entries, sortBy, period, gameMode);
    
    // Assign ranks based on position in sorted array
    const rankedEntries = [];
    let currentRank = 1;
    
    for (let i = 0; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i];
      
      // Assign rank
      entry.rank = currentRank;
      
      // Increment rank for next entry
      currentRank++;
      
      rankedEntries.push(entry);
    }
    
    return rankedEntries;
  }

  /**
   * Convert leaderboard entry object to JSON for database storage
   * @returns {Object} Leaderboard entry data for database storage
   */
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      username: this.username,
      score: this.score,
      lines_cleared: this.lines_cleared,
      game_mode: this.game_mode,
      period: this.period,
      rank: this.rank,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = LeaderboardEntry;