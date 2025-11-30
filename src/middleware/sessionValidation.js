const AuthService = require('../services/AuthService');
const UserRepository = require('../models/UserRepository');
const SessionRepository = require('../models/SessionRepository');
const db = require('../config/db');

// Initialize repositories and auth service
const userRepository = new UserRepository(db);
const sessionRepository = new SessionRepository(db);
const authService = new AuthService(userRepository, sessionRepository);

/**
 * Session validation middleware
 * Checks for a valid session token in the request and attaches user data to req
 */
const sessionValidation = async (req, res, next) => {
  try {
    // Look for session token in headers, cookies, or query parameters
    let sessionToken = 
      req.headers.authorization?.replace('Bearer ', '') ||
      req.headers['x-session-token'] ||
      req.cookies?.sessionToken ||
      req.query.sessionToken;

    if (!sessionToken) {
      // No session token provided, continue without authentication
      req.user = null;
      req.session = null;
      return next();
    }

    // Validate the session
    const session = await authService.validateSession(sessionToken);
    
    if (!session) {
      // Invalid or expired session
      req.user = null;
      req.session = null;
      
      // For API routes, return 401; for other routes, continue without authentication
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }
      
      return next();
    }

    // Get user data for the valid session
    const user = await authService.getUserBySession(sessionToken);
    
    // Attach user and session data to request
    req.user = user;
    req.session = session;
    
    // Continue with the request
    next();
  } catch (error) {
    console.error('Session validation error:', error);
    req.user = null;
    req.session = null;
    next();
  }
};

/**
 * Authentication required middleware
 * Ensures the request has a valid session, otherwise returns 401
 */
const authRequired = async (req, res, next) => {
  try {
    // Look for session token in headers, cookies, or query parameters
    let sessionToken = 
      req.headers.authorization?.replace('Bearer ', '') ||
      req.headers['x-session-token'] ||
      req.cookies?.sessionToken ||
      req.query.sessionToken;

    if (!sessionToken) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate the session
    const session = await authService.validateSession(sessionToken);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Get user data for the valid session
    const user = await authService.getUserBySession(sessionToken);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user and session data to request
    req.user = user;
    req.session = session;
    
    // Continue with the request
    next();
  } catch (error) {
    console.error('Authentication required error:', error);
    return res.status(500).json({ error: 'Authentication service error' });
 }
};

module.exports = {
  sessionValidation,
  authRequired
};