/**
 * UserSettings model class representing user preferences and settings
 */
class UserSettings {
  /**
   * Create a new UserSettings instance
   * @param {Object} settingsData - User settings data object
   * @param {string} settingsData.id - Settings record ID (UUID)
   * @param {string} settingsData.user_id - User ID (UUID)
   * @param {Object} settingsData.theme - Theme settings
   * @param {string} settingsData.theme.primary_color - Primary theme color
   * @param {string} settingsData.theme.secondary_color - Secondary theme color
   * @param {string} settingsData.theme.background_color - Background color
   * @param {string} settingsData.theme.text_color - Text color
   * @param {boolean} settingsData.theme.is_dark_mode - Whether dark mode is enabled
   * @param {Object} settingsData.gameplay - Gameplay settings
   * @param {boolean} settingsData.gameplay.sound_enabled - Whether sound is enabled
   * @param {number} settingsData.gameplay.sound_volume - Sound volume level (0-100)
   * @param {boolean} settingsData.gameplay.music_enabled - Whether music is enabled
   * @param {number} settingsData.gameplay.music_volume - Music volume level (0-100)
   * @param {boolean} settingsData.gameplay.show_grid - Whether to show grid lines
   * @param {boolean} settingsData.gameplay.highlight_placement - Whether to highlight placement
   * @param {number} settingsData.gameplay.animation_speed - Animation speed (1-10)
   * @param {Object} settingsData.notifications - Notification settings
   * @param {boolean} settingsData.notifications.email_notifications - Whether to receive email notifications
   * @param {boolean} settingsData.notifications.push_notifications - Whether to receive push notifications
   * @param {boolean} settingsData.notifications.game_invites - Whether to receive game invite notifications
   * @param {boolean} settingsData.notifications.friend_requests - Whether to receive friend request notifications
   * @param {Object} settingsData.privacy - Privacy settings
   * @param {boolean} settingsData.privacy.profile_visible - Whether profile is visible to others
   * @param {boolean} settingsData.privacy.show_email - Whether to show email publicly
   * @param {boolean} settingsData.privacy.allow_friend_requests - Whether to allow friend requests
   * @param {Object} settingsData.customization - Customization settings
   * @param {string} settingsData.customization.figure_color - Default figure color
   * @param {string} settingsData.customization.grid_style - Grid style preference
   * @param {string} settingsData.customization.avatar_url - URL to user's avatar
   * @param {Date} settingsData.created_at - Creation timestamp
   * @param {Date} settingsData.updated_at - Last update timestamp
   */
  constructor(settingsData) {
    this.id = settingsData.id;
    this.user_id = settingsData.user_id;
    
    // Theme settings
    this.theme = {
      primary_color: settingsData.theme?.primary_color || '#3498db',
      secondary_color: settingsData.theme?.secondary_color || '#2ecc71',
      background_color: settingsData.theme?.background_color || '#ffffff',
      text_color: settingsData.theme?.text_color || '#000000',
      is_dark_mode: settingsData.theme?.is_dark_mode || false
    };
    
    // Gameplay settings
    this.gameplay = {
      sound_enabled: settingsData.gameplay?.sound_enabled !== undefined ? settingsData.gameplay.sound_enabled : true,
      sound_volume: settingsData.gameplay?.sound_volume || 80,
      music_enabled: settingsData.gameplay?.music_enabled !== undefined ? settingsData.gameplay.music_enabled : true,
      music_volume: settingsData.gameplay?.music_volume || 60,
      show_grid: settingsData.gameplay?.show_grid !== undefined ? settingsData.gameplay.show_grid : true,
      highlight_placement: settingsData.gameplay?.highlight_placement !== undefined ? settingsData.gameplay.highlight_placement : true,
      animation_speed: settingsData.gameplay?.animation_speed || 5 // 1-10 scale
    };
    
    // Notification settings
    this.notifications = {
      email_notifications: settingsData.notifications?.email_notifications !== undefined ? settingsData.notifications.email_notifications : true,
      push_notifications: settingsData.notifications?.push_notifications !== undefined ? settingsData.notifications.push_notifications : true,
      game_invites: settingsData.notifications?.game_invites !== undefined ? settingsData.notifications.game_invites : true,
      friend_requests: settingsData.notifications?.friend_requests !== undefined ? settingsData.notifications.friend_requests : true
    };
    
    // Privacy settings
    this.privacy = {
      profile_visible: settingsData.privacy?.profile_visible !== undefined ? settingsData.privacy.profile_visible : true,
      show_email: settingsData.privacy?.show_email !== undefined ? settingsData.privacy.show_email : false,
      allow_friend_requests: settingsData.privacy?.allow_friend_requests !== undefined ? settingsData.privacy.allow_friend_requests : true
    };
    
    // Customization settings
    this.customization = {
      figure_color: settingsData.customization?.figure_color || '#3498db',
      grid_style: settingsData.customization?.grid_style || 'standard',
      avatar_url: settingsData.customization?.avatar_url || null
    };
    
    this.created_at = settingsData.created_at ? new Date(settingsData.created_at) : new Date();
    this.updated_at = settingsData.updated_at ? new Date(settingsData.updated_at) : new Date();
  }

  /**
   * Validate settings data
   * @param {Object} settingsData - Settings data to validate
   * @returns {Array} Array of validation errors
   */
  static validate(settingsData) {
    const errors = [];

    // Validate theme settings
    if (settingsData.theme) {
      if (settingsData.theme.sound_volume !== undefined && 
          (settingsData.theme.sound_volume < 0 || settingsData.theme.sound_volume > 100)) {
        errors.push('Sound volume must be between 0 and 100');
      }
      
      if (settingsData.theme.music_volume !== undefined && 
          (settingsData.theme.music_volume < 0 || settingsData.theme.music_volume > 100)) {
        errors.push('Music volume must be between 0 and 100');
      }
      
      if (settingsData.theme.animation_speed !== undefined && 
          (settingsData.theme.animation_speed < 1 || settingsData.theme.animation_speed > 10)) {
        errors.push('Animation speed must be between 1 and 10');
      }
    }

    // Validate gameplay settings
    if (settingsData.gameplay) {
      if (settingsData.gameplay.sound_volume !== undefined && 
          (settingsData.gameplay.sound_volume < 0 || settingsData.gameplay.sound_volume > 100)) {
        errors.push('Sound volume must be between 0 and 100');
      }
      
      if (settingsData.gameplay.music_volume !== undefined && 
          (settingsData.gameplay.music_volume < 0 || settingsData.gameplay.music_volume > 100)) {
        errors.push('Music volume must be between 0 and 100');
      }
      
      if (settingsData.gameplay.animation_speed !== undefined && 
          (settingsData.gameplay.animation_speed < 1 || settingsData.gameplay.animation_speed > 10)) {
        errors.push('Animation speed must be between 1 and 10');
      }
    }

    return errors;
  }

  /**
   * Update theme settings
   * @param {Object} themeSettings - New theme settings
   * @returns {void}
   */
  updateTheme(themeSettings) {
    this.theme = {
      ...this.theme,
      ...themeSettings
    };
    this.updated_at = new Date();
  }

  /**
   * Update gameplay settings
   * @param {Object} gameplaySettings - New gameplay settings
   * @returns {void}
   */
  updateGameplay(gameplaySettings) {
    this.gameplay = {
      ...this.gameplay,
      ...gameplaySettings
    };
    this.updated_at = new Date();
  }

  /**
   * Update notification settings
   * @param {Object} notificationSettings - New notification settings
   * @returns {void}
   */
  updateNotifications(notificationSettings) {
    this.notifications = {
      ...this.notifications,
      ...notificationSettings
    };
    this.updated_at = new Date();
  }

  /**
   * Update privacy settings
   * @param {Object} privacySettings - New privacy settings
   * @returns {void}
   */
  updatePrivacy(privacySettings) {
    this.privacy = {
      ...this.privacy,
      ...privacySettings
    };
    this.updated_at = new Date();
  }

  /**
   * Update customization settings
   * @param {Object} customizationSettings - New customization settings
   * @returns {void}
   */
  updateCustomization(customizationSettings) {
    this.customization = {
      ...this.customization,
      ...customizationSettings
    };
    this.updated_at = new Date();
  }

  /**
   * Get all settings as a single object
   * @returns {Object} Complete settings object
   */
  getAllSettings() {
    return {
      theme: this.theme,
      gameplay: this.gameplay,
      notifications: this.notifications,
      privacy: this.privacy,
      customization: this.customization
    };
  }

  /**
   * Get a specific category of settings
   * @param {string} category - Category name ('theme', 'gameplay', 'notifications', 'privacy', 'customization')
   * @returns {Object} Settings for the specified category
   */
  getSettings(category) {
    switch(category) {
      case 'theme':
        return this.theme;
      case 'gameplay':
        return this.gameplay;
      case 'notifications':
        return this.notifications;
      case 'privacy':
        return this.privacy;
      case 'customization':
        return this.customization;
      default:
        return null;
    }
  }

  /**
   * Apply default settings for any missing values
   * @returns {void}
   */
  applyDefaults() {
    // Apply default theme settings
    this.theme = {
      primary_color: this.theme.primary_color || '#3498db',
      secondary_color: this.theme.secondary_color || '#2ecc71',
      background_color: this.theme.background_color || '#ffffff',
      text_color: this.theme.text_color || '#000000',
      is_dark_mode: this.theme.is_dark_mode !== undefined ? this.theme.is_dark_mode : false
    };
    
    // Apply default gameplay settings
    this.gameplay = {
      sound_enabled: this.gameplay.sound_enabled !== undefined ? this.gameplay.sound_enabled : true,
      sound_volume: this.gameplay.sound_volume || 80,
      music_enabled: this.gameplay.music_enabled !== undefined ? this.gameplay.music_enabled : true,
      music_volume: this.gameplay.music_volume || 60,
      show_grid: this.gameplay.show_grid !== undefined ? this.gameplay.show_grid : true,
      highlight_placement: this.gameplay.highlight_placement !== undefined ? this.gameplay.highlight_placement : true,
      animation_speed: this.gameplay.animation_speed || 5
    };
    
    // Apply default notification settings
    this.notifications = {
      email_notifications: this.notifications.email_notifications !== undefined ? this.notifications.email_notifications : true,
      push_notifications: this.notifications.push_notifications !== undefined ? this.notifications.push_notifications : true,
      game_invites: this.notifications.game_invites !== undefined ? this.notifications.game_invites : true,
      friend_requests: this.notifications.friend_requests !== undefined ? this.notifications.friend_requests : true
    };
    
    // Apply default privacy settings
    this.privacy = {
      profile_visible: this.privacy.profile_visible !== undefined ? this.privacy.profile_visible : true,
      show_email: this.privacy.show_email !== undefined ? this.privacy.show_email : false,
      allow_friend_requests: this.privacy.allow_friend_requests !== undefined ? this.privacy.allow_friend_requests : true
    };
    
    // Apply default customization settings
    this.customization = {
      figure_color: this.customization.figure_color || '#3498db',
      grid_style: this.customization.grid_style || 'standard',
      avatar_url: this.customization.avatar_url || null
    };
    
    this.updated_at = new Date();
  }

  /**
   * Check if sound is enabled based on settings
   * @returns {boolean} True if sound is enabled
   */
  isSoundEnabled() {
    return this.gameplay.sound_enabled;
  }

  /**
   * Check if music is enabled based on settings
   * @returns {boolean} True if music is enabled
   */
  isMusicEnabled() {
    return this.gameplay.music_enabled;
  }

  /**
   * Get effective sound volume based on settings
   * @returns {number} Sound volume level (0-100)
   */
  getSoundVolume() {
    return this.gameplay.sound_enabled ? this.gameplay.sound_volume : 0;
  }

  /**
   * Get effective music volume based on settings
   * @returns {number} Music volume level (0-100)
   */
  getMusicVolume() {
    return this.gameplay.music_enabled ? this.gameplay.music_volume : 0;
  }

  /**
   * Check if dark mode is enabled
   * @returns {boolean} True if dark mode is enabled
   */
  isDarkMode() {
    return this.theme.is_dark_mode;
  }

  /**
   * Get theme colors based on dark mode setting
   * @returns {Object} Theme colors object
   */
  getThemeColors() {
    if (this.theme.is_dark_mode) {
      return {
        primary: this.theme.primary_color,
        secondary: this.theme.secondary_color,
        background: '#1e1e1e',
        text: '#ffffff'
      };
    } else {
      return {
        primary: this.theme.primary_color,
        secondary: this.theme.secondary_color,
        background: this.theme.background_color,
        text: this.theme.text_color
      };
    }
  }

  /**
   * Check if a specific notification type is enabled
   * @param {string} notificationType - Type of notification ('game_invites', 'friend_requests', etc.)
   * @returns {boolean} True if notification type is enabled
   */
  isNotificationEnabled(notificationType) {
    return this.notifications[notificationType] || false;
  }

 /**
   * Export settings to a portable format
   * @returns {Object} Exportable settings object
   */
  exportSettings() {
    return {
      theme: this.theme,
      gameplay: this.gameplay,
      notifications: this.notifications,
      privacy: this.privacy,
      customization: this.customization
    };
  }

  /**
   * Import settings from a portable format
   * @param {Object} settings - Settings object to import
   * @returns {void}
   */
  importSettings(settings) {
    this.theme = { ...this.theme, ...settings.theme };
    this.gameplay = { ...this.gameplay, ...settings.gameplay };
    this.notifications = { ...this.notifications, ...settings.notifications };
    this.privacy = { ...this.privacy, ...settings.privacy };
    this.customization = { ...this.customization, ...settings.customization };
    this.updated_at = new Date();
  }

  /**
   * Convert user settings object to JSON for database storage
   * @returns {Object} User settings data for database storage
   */
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      theme: this.theme,
      gameplay: this.gameplay,
      notifications: this.notifications,
      privacy: this.privacy,
      customization: this.customization,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = UserSettings;