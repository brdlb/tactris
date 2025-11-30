const express = require('express');
const router = express.Router();
const AuthService = require('../services/AuthService');
const { repositoryManager } = require('../config/db');

// Middleware to handle user identification for both authenticated and anonymous users
const identifyUser = async (req, res, next) => {
  try {
    // Check for session token in headers, cookies, or query parameters
    let sessionToken =
      req.headers.authorization?.replace('Bearer ', '') ||
      req.headers['x-session-token'] ||
      req.cookies?.sessionToken ||
      req.query.sessionToken;

    if (!sessionToken) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Try to identify if this is an anonymous token or a session token
    // First, try to find a user by anonymous token
    const user = await repositoryManager.users.findByAnonymousToken(sessionToken);
    
    if (user) {
      // This is an anonymous user
      req.user = user;
      req.isAnonymous = true;
    } else {
      // This might be a regular session token, use the auth service to validate
      const authService = new AuthService(repositoryManager.users, repositoryManager.sessions);
      const session = await authService.validateSession(sessionToken);
      
      if (!session) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }

      // Get user data for the valid session
      const sessionUser = await authService.getUserBySession(sessionToken);
      
      if (!sessionUser) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Attach user and session data to request
      req.user = sessionUser;
      req.session = session;
      req.isAnonymous = sessionUser.is_anonymous;
    }
    
    next();
  } catch (error) {
    console.error('User identification error:', error);
    return res.status(500).json({ error: 'Authentication service error' });
  }
};

// Apply user identification to authenticated routes
// All routes in this router will require authentication via the identifyUser middleware
router.use(identifyUser);

// GET /api/user/stats - Get user statistics (authenticated)
router.get('/stats', async (req, res) => {
  try {
    // Get the user from the request (attached by identifyUser middleware)
    const user = req.user;
    console.log('📊 [users.js] User object from request:', user);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found in session' });
    }

    // Get user statistics from the repository
    const stats = await repositoryManager.gameStatistics.findByUserId(user.id);
    console.log('📊 [users.js] Retrieved statistics from database:', stats);
    
    if (!stats) {
        console.log('📊 [users.js] No statistics found for user, returning default stats');
      // If no stats exist for the user, return default stats
      return res.status(200).json({
        user_id: user.id,
        total_games: 0,
        total_score: 0,
        total_score: 0,
        average_score: 0,
        best_score: 0,
        total_lines_cleared: 0,
        average_lines_cleared: 0,
        best_lines_cleared: 0,
        rating: 1000
      });
    }

    // Calculate average score
    const avgScore = stats.total_games > 0 ? stats.total_score / stats.total_games : 0;

    // Return formatted statistics
    const responseData = {
      user_id: user.id,
      total_games: stats.total_games,
      total_score: stats.total_score,
      average_score: avgScore,
      total_score: stats.total_score,
      average_score: stats.average_score || 0,
      best_score: stats.best_score,
      total_lines_cleared: stats.total_lines_cleared,
      average_lines_cleared: stats.average_lines_cleared || 0,
      best_lines_cleared: stats.best_lines_cleared,
      rating: stats.rating || 1000
    };
    
    console.log('📊 [users.js] Sending formatted statistics to client:', responseData);
    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

module.exports = router;