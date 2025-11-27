/**
 * User model class representing the user entity with authentication and profile management methods
 */
class User {
  /**
   * Create a new User instance
   * @param {Object} userData - User data object
   * @param {string} userData.id - User ID (UUID)
   * @param {string} userData.username - Username
   * @param {string} userData.email - User email (optional)
   * @param {string} userData.auth_provider - Authentication provider (google, anonymous, etc.)
   * @param {string} userData.auth_id - Authentication ID from provider
   * @param {boolean} userData.is_anonymous - Whether the user is anonymous
   * @param {Date} userData.created_at - Creation timestamp
   * @param {Date} userData.updated_at - Last update timestamp
   * @param {Date} userData.last_login_at - Last login timestamp
   */
  constructor(userData) {
    this.id = userData.id;
    this.username = userData.username;
    this.email = userData.email || null;
    this.auth_provider = userData.auth_provider || null;
    this.auth_id = userData.auth_id || null;
    this.is_anonymous = userData.is_anonymous || false;
    this.created_at = userData.created_at ? new Date(userData.created_at) : new Date();
    this.updated_at = userData.updated_at ? new Date(userData.updated_at) : new Date();
    this.last_login_at = userData.last_login_at ? new Date(userData.last_login_at) : null;
  }

 /**
   * Validate user data before creation or update
   * @param {Object} userData - User data to validate
   * @returns {Array} Array of validation errors
   */
  static validate(userData) {
    const errors = [];

    if (!userData.username || userData.username.trim().length < 3) {
      errors.push('Username must be at least 3 characters long');
    }

    if (userData.email && !this.isValidEmail(userData.email)) {
      errors.push('Invalid email format');
    }

    if (userData.auth_provider && !['google', 'anonymous'].includes(userData.auth_provider)) {
      errors.push('Invalid authentication provider');
    }

    return errors;
  }

  /**
   * Check if email format is valid
   * @param {string} email - Email to validate
   * @returns {boolean} True if email is valid
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Hash password for secure storage
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  static async hashPassword(password) {
    // In a real implementation, you would use bcrypt or similar
    // For now, we'll simulate the hashing process
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * Verify password against hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password to compare
   * @returns {Promise<boolean>} True if password matches hash
   */
  static async verifyPassword(password, hash) {
    const hashedPassword = await this.hashPassword(password);
    return hashedPassword === hash;
  }

  /**
   * Generate anonymous user ID
   * @returns {string} Anonymous user ID
   */
  static generateAnonymousId() {
    return `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a new anonymous user
   * @param {string} username - Username for the anonymous user
   * @returns {User} New anonymous user instance
   */
  static createAnonymousUser(username) {
    return new User({
      id: this.generateAnonymousId(),
      username: username || `Anonymous_${Math.floor(Math.random() * 10000)}`,
      is_anonymous: true,
      auth_provider: 'anonymous',
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  /**
   * Update user profile information
   * @param {Object} profileData - Profile data to update
   * @returns {Promise<boolean>} True if update was successful
   */
  async updateProfile(profileData) {
    const errors = User.validate({ ...this, ...profileData });
    if (errors.length > 0) {
      throw new Error(`Validation errors: ${errors.join(', ')}`);
    }

    // In a real implementation, this would update the database
    // For now, we'll just update the object properties
    Object.assign(this, profileData);
    this.updated_at = new Date();

    return true;
  }

  /**
   * Change user password
   * @param {string} currentPassword - Current password for verification
   * @param {string} newPassword - New password to set
   * @param {string} hashedCurrentPassword - Hashed current password for verification
   * @returns {Promise<boolean>} True if password was changed successfully
   */
  async changePassword(currentPassword, newPassword, hashedCurrentPassword) {
    // Verify current password
    const isCurrentPasswordValid = await User.verifyPassword(currentPassword, hashedCurrentPassword);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long');
    }

    // In a real implementation, you would hash the new password and update the database
    // For now, we'll just return true to indicate success
    return true;
  }

  /**
   * Check if user is authenticated (not anonymous)
   * @returns {boolean} True if user is authenticated
   */
  isAuthenticated() {
    return !this.is_anonymous;
  }

  /**
   * Get user display name
   * @returns {string} User's display name
   */
  getDisplayName() {
    return this.username;
  }

  /**
   * Update last login timestamp
   */
  updateLastLogin() {
    this.last_login_at = new Date();
    this.updated_at = new Date();
  }

  /**
   * Check if user can be considered active
   * @param {number} days - Number of days to check against (default 30)
   * @returns {boolean} True if user was active within the specified days
   */
  isActive(days = 30) {
    if (!this.last_login_at) return false;
    
    const timeDiff = new Date() - this.last_login_at;
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    
    return daysDiff <= days;
  }

  /**
   * Convert user object to JSON for database storage
   * @returns {Object} User data for database storage
   */
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      auth_provider: this.auth_provider,
      auth_id: this.auth_id,
      is_anonymous: this.is_anonymous,
      created_at: this.created_at,
      updated_at: this.updated_at,
      last_login_at: this.last_login_at
    };
  }
}

export default User;