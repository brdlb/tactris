/**
 * Public Routes - Routes that don't require authentication
 */

const express = require('express');
const { shortUserIdHash } = require('../utils/socketUtils');

/**
 * Create public routes
 * @param {Object} repositoryManager - Repository manager instance
 * @returns {express.Router} Express router with public routes
 */
function createPublicRoutes(repositoryManager) {
  const router = express.Router();
  
  /**
   * Public endpoint for user statistics
   * GET /api/user/stats/public?user_id=<user_id>
   */
  router.get('/api/user/stats/public', async (req, res) => {
    try {
      const { user_id } = req.query;
      console.log('Received request for user stats with user_id:', shortUserIdHash(user_id));
      
      if (!user_id) {
        return res.status(400).json({ error: 'user_id parameter is required' });
      }

      // Get user statistics from the repository
      const stats = await repositoryManager.gameStatistics.findByUserId(user_id);
      
      if (!stats) {
        // If no stats exist for the user, return default stats
        return res.status(200).json({
          user_id: user_id,
          total_games: 0,
          total_score: 0,
          average_score: 0,
          best_score: 0,
          total_lines_cleared: 0,
          average_lines_cleared: 0,
          best_lines_cleared: 0,
          total_figures_placed: 0,
          total_play_time_seconds: 0,
          average_lines_per_game: 0,
          rating: 1000
        });
      }

      // Return formatted statistics
      const responseData = {
        user_id: user_id,
        total_games: stats.total_games,
        total_score: stats.total_score,
        average_score: stats.average_score || 0,
        best_score: stats.best_score,
        total_lines_cleared: stats.total_lines_cleared,
        average_lines_cleared: stats.average_lines_cleared || 0,
        best_lines_cleared: stats.best_lines_cleared,
        total_figures_placed: stats.total_figures_placed || 0,
        total_play_time_seconds: stats.total_play_time_seconds || 0,
        average_lines_per_game: stats.average_lines_per_game || 0,
        rating: stats.rating || 1000
      };
      
      res.status(200).json(responseData);
    } catch (error) {
      console.error('Error fetching public user stats:', error);
      res.status(500).json({ error: 'Failed to fetch user statistics' });
    }
  });

  return router;
}

module.exports = createPublicRoutes;

