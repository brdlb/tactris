const express = require('express');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const passport = require('passport');
const AuthService = require('../services/AuthService');
const UserRepository = require('../models/UserRepository');
const SessionRepository = require('../models/SessionRepository');
const db = require('../config/db');
const { sessionValidation } = require('../middleware/sessionValidation');

const router = express.Router();

// Initialize repositories and auth service
const userRepository = new UserRepository(db);
const sessionRepository = new SessionRepository(db);
const authService = new AuthService(userRepository, sessionRepository);

// Configure Google OAuth strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // This will be called after successful Google authentication
      // We'll handle the user creation/linking in the callback route
      return done(null, profile);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// Serialize and deserialize user for session management
passport.serializeUser((user, done) => {
  // The user here is the Google profile, not our user object
  // We'll store the profile for use in the callback
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  // In a real implementation, we would fetch the user from our database
  // For now, we'll just pass through the profile object
  done(null, obj);
});

// Route to create anonymous session
router.post('/anonymous', async (req, res) => {
  try {
    const { user, session } = await authService.createAnonymousSession(
      req.ip,
      req.get('User-Agent')
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        is_anonymous: user.is_anonymous,
        created_at: user.created_at
      },
      session: {
        token: session.session_token,
        expires_at: session.expires_at
      }
    });
  } catch (error) {
    console.error('Error creating anonymous session:', error);
    res.status(500).json({ error: 'Failed to create anonymous session' });
 }
});

// Route to initiate Google OAuth
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
 })
);

// Route to handle Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login'
  }),
 async (req, res) => {
    try {
      // Get the Google profile from the request
      const googleUser = req.user;
      
      // Check if there's an anonymous user ID stored in the express-session
      // This would have been set if the user was previously anonymous
      const anonymousId = req.session.anonymousId;
      
      let result;
      if (anonymousId) {
        // Link the anonymous user to the Google account
        result = await authService.linkAnonymousToGoogle(
          anonymousId,
          googleUser,
          req.ip,
          req.get('User-Agent')
        );
        // Clear the anonymous ID from the session
        delete req.session.anonymousId;
      } else {
        // Handle Google authentication for a new user
        result = await authService.handleGoogleAuth(
          googleUser,
          req.ip,
          req.get('User-Agent')
        );
      }
      
      // Set the session token in a cookie for frontend access
      res.cookie('sessionToken', result.session.session_token, {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true, // Prevent access from JavaScript
        secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
        sameSite: 'lax' // CSRF protection
      });
      
      // Redirect to frontend with session token (for SPA handling)
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}?sessionToken=${result.session.session_token}`);
    } catch (error) {
      console.error('Error in Google OAuth callback:', error);
      res.status(500).json({ error: 'Failed to process Google authentication' });
    }
  }
);

// Route to get current user info
router.get('/me', sessionValidation, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      display_name: req.user.display_name,
      profile_picture_url: req.user.profile_picture_url,
      is_anonymous: req.user.is_anonymous,
      created_at: req.user.created_at
    },
    session: req.session ? {
      expires_at: req.session.expires_at
    } : null
  });
});

// Route to logout (expire current session)
router.post('/logout', sessionValidation, async (req, res) => {
  if (!req.session) {
    // Even if no session in our database, clear the cookie if it exists
    res.clearCookie('sessionToken');
    return res.json({ success: true, message: 'Logged out successfully' });
  }
  
  try {
    await authService.expireSession(req.session.session_token);
    res.clearCookie('sessionToken');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

// Route to link anonymous session to Google account (for frontend initiated linking)
router.post('/link-google', sessionValidation, async (req, res) => {
 if (!req.user || !req.user.is_anonymous) {
    return res.status(400).json({ error: 'Must be an anonymous user to link accounts' });
 }
  
  try {
    // This would typically receive a Google access token and exchange it for user info
    // For security, this should be done server-side, not with a token passed from frontend
    // Instead, we'll redirect to the Google auth flow
    
    // Store the current anonymous session ID in the session for later use
    req.session.anonymousId = req.user.anonymous_id;
    
    // Redirect to Google auth
    res.redirect('/auth/google');
  } catch (error) {
    console.error('Error initiating Google link:', error);
    res.status(500).json({ error: 'Failed to initiate Google account linking' });
  }
});

module.exports = router;