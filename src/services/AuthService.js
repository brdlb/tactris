const crypto = require('crypto');
const User = require('../models/User');
const Session = require('../models/Session');

/**
 * AuthService - Handles authentication logic including anonymous users, OAuth, and session management
 */
class AuthService {
  constructor(userRepository, sessionRepository) {
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
  }

  /**
   * Creates a new anonymous user and session
   * @returns {Promise<Object>} Object containing user and session data
   */
  async createAnonymousSession(ipAddress = null, userAgent = null) {
    // Create anonymous user
    const user = await this.userRepository.createAnonymous();
    
    // Generate a unique session token
    const sessionToken = this.generateSessionToken();
    
    // Set session to expire in 30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    // Create session
    const session = await this.sessionRepository.create({
      user_id: user.id,
      session_token: sessionToken,
      expires_at: expiresAt,
      ip_address: ipAddress,
      user_agent: userAgent
    });
    
    return { user, session: { ...session, user_id: undefined } }; // Don't expose user_id in session
  }

  /**
   * Creates a session for an authenticated user
   * @param {Object} user - User object
   * @param {string} ipAddress - User's IP address
   * @param {string} userAgent - User agent string
   * @returns {Promise<Object>} Session data
   */
  async createAuthenticatedSession(user, ipAddress = null, userAgent = null) {
    // Generate a unique session token
    const sessionToken = this.generateSessionToken();
    
    // Set session to expire in 30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    // Create session
    const session = await this.sessionRepository.create({
      user_id: user.id,
      session_token: sessionToken,
      expires_at: expiresAt,
      ip_address: ipAddress,
      user_agent: userAgent
    });
    
    return { ...session, user_id: undefined }; // Don't expose user_id in session
 }

  /**
   * Validates a session token
   * @param {string} sessionToken - Session token to validate
   * @returns {Promise<Object|null>} Valid session object or null if invalid
   */
  async validateSession(sessionToken) {
    if (!sessionToken) {
      return null;
    }

    const session = await this.sessionRepository.findByToken(sessionToken);
    
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      // Expire the session in the database
      await this.sessionRepository.expire(session.id);
      return null;
    }

    // Update last seen for the user
    await this.userRepository.updateLastSeen(session.user_id);

    return session;
 }

  /**
   * Gets user data for a valid session
   * @param {string} sessionToken - Session token
   * @returns {Promise<Object|null>} User object or null if session is invalid
   */
  async getUserBySession(sessionToken) {
    const session = await this.validateSession(sessionToken);
    if (!session) {
      return null;
    }

    return await this.userRepository.findById(session.user_id);
  }

  /**
   * Expires a session
   * @param {string} sessionToken - Session token to expire
   * @returns {Promise<boolean>} True if session was expired
   */
  async expireSession(sessionToken) {
    return await this.sessionRepository.revokeByToken(sessionToken);
  }

 /**
   * Expires all sessions for a user
   * @param {string} userId - User ID whose sessions to expire
   * @returns {Promise<number>} Number of expired sessions
   */
  async expireAllUserSessions(userId) {
    return await this.sessionRepository.expireAllForUser(userId);
  }

 /**
   * Generates a secure session token
   * @returns {string} Session token
   */
  generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Handles Google OAuth authentication and session creation
   * @param {Object} googleUser - Google user profile data
   * @param {string} ipAddress - User's IP address
   * @param {string} userAgent - User agent string
   * @returns {Promise<Object>} Object containing user and session data
   */
  async handleGoogleAuth(googleUser, ipAddress = null, userAgent = null) {
    // Google user object from passport has different field names
    const { id: googleId, emails, displayName, photos } = googleUser;
    const email = emails && emails[0] ? emails[0].value : null;
    const profilePictureUrl = photos && photos[0] ? photos[0].value : null;

    // Check if user already exists with this Google ID
    let user = await this.userRepository.findByAuthId(googleId, 'google');
    
    if (user) {
      // User already exists, update their info
      user = await this.userRepository.update(user.id, {
        email,
        display_name: displayName,
        profile_picture_url: profilePictureUrl
      });
    } else {
      // Check if there's an existing user with this email
      user = await this.userRepository.findByEmail(email);
      
      if (user) {
        // Link the Google account to the existing user
        user = await this.userRepository.update(user.id, {
          google_id: googleId,
          email,
          display_name: displayName,
          profile_picture_url: profilePictureUrl
        });
      } else {
        // Create a new authenticated user
        user = await this.userRepository.create({
          auth_id: googleId,
          auth_provider: 'google',
          username: displayName,
          email,
          avatar_url: profilePictureUrl,
          is_anonymous: false
        });
      }
    }

    // Create an authenticated session
    const session = await this.createAuthenticatedSession(user, ipAddress, userAgent);
    
    return { user, session };
  }

  /**
   * Links an anonymous user to an authenticated account
   * @param {string} anonymousId - Anonymous ID of the user to link
   * @param {Object} googleUser - Google user profile data
   * @param {string} ipAddress - User's IP address
   * @param {string} userAgent - User agent string
   * @returns {Promise<Object>} Object containing updated user and new session
   */
  async linkAnonymousToGoogle(anonymousId, googleUser, ipAddress = null, userAgent = null) {
    // Google user object from passport has different field names
    const { id: googleId, emails, displayName, photos } = googleUser;
    const email = emails && emails[0] ? emails[0].value : null;
    const profilePictureUrl = photos && photos[0] ? photos[0].value : null;

    // Find the anonymous user
    const anonymousUser = await this.userRepository.findByAnonymousId(anonymousId);
    if (!anonymousUser) {
      throw new Error('Anonymous user not found');
    }

    // Link the anonymous user to the Google account
    const user = await this.userRepository.linkAnonymousToAuthenticated(
      anonymousId,
      googleId,
      'google',
      email,
      displayName,
      profilePictureUrl
    );

    // Create an authenticated session
    const session = await this.createAuthenticatedSession(user, ipAddress, userAgent);
    
    return { user, session };
  }

  /**
   * Merges an anonymous user's data with an existing authenticated user
   * @param {string} anonymousId - Anonymous ID of the user to merge
   * @param {string} userId - ID of the existing authenticated user to merge with
   * @returns {Promise<Object>} The merged user
   */
  async mergeAnonymousWithUser(anonymousId, userId) {
    return await this.userRepository.mergeAnonymousWithUser(anonymousId, userId);
  }

  /**
   * Performs cleanup of expired sessions and old anonymous users
   * @returns {Promise<Object>} Cleanup results
   */
  async performCleanup() {
    // Clean up expired sessions
    const expiredSessionsRemoved = await this.sessionRepository.cleanupExpired();
    
    // Clean up old anonymous users (older than 30 days)
    const oldAnonymousUsersRemoved = await this.userRepository.cleanupOldAnonymousUsers(30);
    
    return {
      expiredSessionsRemoved,
      oldAnonymousUsersRemoved
    };
  }
}

module.exports = AuthService;