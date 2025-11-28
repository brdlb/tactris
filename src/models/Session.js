/**
 * Session model class representing user sessions with expiration and tracking
 */
class Session {
  /**
   * Create a new Session instance
   * @param {Object} sessionData - Session data object
   * @param {string} sessionData.id - Session ID (UUID)
   * @param {string} sessionData.user_id - Associated user ID
   * @param {string} sessionData.session_token - Unique session token
   * @param {Date} sessionData.expires_at - Expiration timestamp
   * @param {Date} sessionData.created_at - Creation timestamp
   * @param {Date} sessionData.updated_at - Last update timestamp
   * @param {string} sessionData.ip_address - User's IP address
   * @param {string} sessionData.user_agent - User agent string
   * @param {boolean} sessionData.is_active - Whether the session is active
   */
  constructor(sessionData) {
    this.id = sessionData.id;
    this.user_id = sessionData.user_id;
    this.session_token = sessionData.session_token;
    this.expires_at = sessionData.expires_at ? new Date(sessionData.expires_at) : null;
    this.created_at = sessionData.created_at ? new Date(sessionData.created_at) : new Date();
    this.updated_at = sessionData.updated_at ? new Date(sessionData.updated_at) : new Date();
    this.ip_address = sessionData.ip_address || null;
    this.user_agent = sessionData.user_agent || null;
    this.is_active = sessionData.is_active !== undefined ? sessionData.is_active : true;
  }

  /**
   * Validate session data before creation or update
   * @param {Object} sessionData - Session data to validate
   * @returns {Array} Array of validation errors
   */
  static validate(sessionData) {
    const errors = [];

    if (!sessionData.user_id) {
      errors.push('User ID is required');
    }

    if (!sessionData.session_token) {
      errors.push('Session token is required');
    }

    if (!sessionData.expires_at) {
      errors.push('Expiration date is required');
    } else if (!(new Date(sessionData.expires_at) > new Date())) {
      errors.push('Expiration date must be in the future');
    }

    return errors;
  }

  /**
   * Check if the session is expired
   * @returns {boolean} True if session is expired
   */
  isExpired() {
    return new Date() > this.expires_at;
  }

  /**
   * Check if the session is still valid (active and not expired)
   * @returns {boolean} True if session is valid
   */
  isValid() {
    return this.is_active && !this.isExpired();
  }

  /**
   * Get time remaining until expiration in milliseconds
   * @returns {number} Time remaining in milliseconds
   */
  timeRemaining() {
    const now = new Date();
    const expiration = new Date(this.expires_at);
    return Math.max(0, expiration - now);
  }

 /**
   * Convert session object to JSON for database storage
   * @returns {Object} Session data for database storage
   */
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      session_token: this.session_token,
      expires_at: this.expires_at,
      created_at: this.created_at,
      updated_at: this.updated_at,
      ip_address: this.ip_address,
      user_agent: this.user_agent,
      is_active: this.is_active
    };
  }
}

module.exports = Session;