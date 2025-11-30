/**
 * UserSettingsRepository - Handles user preferences
 */
class UserSettingsRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Creates a new user settings record
   * @param {Object} settingsData - Settings data to create
   * @returns {Promise<Object>} The created settings record
   */
  async create(settingsData) {
    const {
      user_id,
      theme,
      sound_enabled,
      music_volume,
      sound_volume,
      grid_size,
      cell_size,
      animation_speed,
      show_grid_lines,
      custom_colors,
      language,
      notifications_enabled
    } = settingsData;

    const query = `
      INSERT INTO user_settings (
        user_id, theme, sound_enabled, music_volume, sound_volume,
        grid_size, cell_size, animation_speed, show_grid_lines,
        custom_colors, language, notifications_enabled
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `;

    const values = [
      user_id, theme, sound_enabled, music_volume, sound_volume,
      grid_size, cell_size, animation_speed, show_grid_lines,
      custom_colors, language, notifications_enabled
    ];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating user settings: ${error.message}`);
    }
  }

  /**
   * Finds settings by user ID
   * @param {string} userId - User ID to find settings for
   * @returns {Promise<Object|null>} The found settings or null
   */
  async findByUserId(userId) {
    const query = 'SELECT * FROM user_settings WHERE user_id = $1;';
    const values = [userId];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding user settings: ${error.message}`);
    }
  }

  /**
   * Updates user settings
   * @param {string} userId - User ID to update settings for
   * @param {Object} updates - Settings to update
   * @returns {Promise<Object>} The updated settings
   */
  async update(userId, updates) {
    const allowedFields = [
      'theme', 'sound_enabled', 'music_volume', 'sound_volume',
      'grid_size', 'cell_size', 'animation_speed', 'show_grid_lines',
      'custom_colors', 'language', 'notifications_enabled'
    ];
    
    const updateFields = [];
    const values = [];
    let valueIndex = 2;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${valueIndex}`);
        values.push(value);
        valueIndex++;
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    const query = `
      UPDATE user_settings 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE user_id = $1
      RETURNING *;
    `;
    values.unshift(userId); // Add user ID as the first parameter

    try {
      const result = await this.db.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('User settings not found');
      }
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error updating user settings: ${error.message}`);
    }
  }

  /**
   * Gets a specific setting value for a user
   * @param {string} userId - User ID to get setting for
   * @param {string} settingName - Name of the setting to get
   * @returns {Promise<any>} The setting value
   */
  async getSetting(userId, settingName) {
    const allowedSettings = [
      'theme', 'sound_enabled', 'music_volume', 'sound_volume',
      'grid_size', 'cell_size', 'animation_speed', 'show_grid_lines',
      'custom_colors', 'language', 'notifications_enabled'
    ];
    
    if (!allowedSettings.includes(settingName)) {
      throw new Error(`Invalid setting name: ${settingName}`);
    }

    const query = `SELECT ${settingName} FROM user_settings WHERE user_id = $1;`;
    const values = [userId];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0] ? result.rows[0][settingName] : null;
    } catch (error) {
      throw new Error(`Error getting user setting: ${error.message}`);
    }
  }

  /**
   * Updates a single setting for a user
   * @param {string} userId - User ID to update setting for
   * @param {string} settingName - Name of the setting to update
   * @param {any} value - New value for the setting
   * @returns {Promise<Object>} The updated settings
   */
  async updateSetting(userId, settingName, value) {
    const allowedSettings = [
      'theme', 'sound_enabled', 'music_volume', 'sound_volume',
      'grid_size', 'cell_size', 'animation_speed', 'show_grid_lines',
      'custom_colors', 'language', 'notifications_enabled'
    ];
    
    if (!allowedSettings.includes(settingName)) {
      throw new Error(`Invalid setting name: ${settingName}`);
    }

    const query = `
      UPDATE user_settings 
      SET ${settingName} = $2, updated_at = NOW()
      WHERE user_id = $1
      RETURNING *;
    `;
    const values = [userId, value];

    try {
      const result = await this.db.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('User settings not found');
      }
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error updating user setting: ${error.message}`);
    }
  }

  /**
   * Resets user settings to default values
   * @param {string} userId - User ID to reset settings for
   * @returns {Promise<Object>} The reset settings
   */
  async resetToDefaults(userId) {
    const defaultSettings = {
      theme: 'default',
      sound_enabled: true,
      music_volume: 0.7,
      sound_volume: 0.7,
      grid_size: 'normal',
      cell_size: 30,
      animation_speed: 1.0,
      show_grid_lines: true,
      custom_colors: null,
      language: 'en',
      notifications_enabled: true
    };

    return await this.update(userId, defaultSettings);
  }

  /**
   * Creates default settings for a user if they don't exist
   * @param {string} userId - User ID to create default settings for
   * @returns {Promise<Object>} The created or existing settings
   */
  async createDefaultIfNotExists(userId) {
    const existingSettings = await this.findByUserId(userId);
    
    if (existingSettings) {
      return existingSettings;
    }
    
    const defaultSettings = {
      user_id: userId,
      theme: 'default',
      sound_enabled: true,
      music_volume: 0.7,
      sound_volume: 0.7,
      grid_size: 'normal',
      cell_size: 30,
      animation_speed: 1.0,
      show_grid_lines: true,
      custom_colors: null,
      language: 'en',
      notifications_enabled: true
    };
    
    return await this.create(defaultSettings);
  }

  /**
   * Imports settings from another user
   * @param {string} targetUserId - User ID to import settings to
   * @param {string} sourceUserId - User ID to import settings from
   * @returns {Promise<Object>} The updated settings
   */
  async importFromUser(targetUserId, sourceUserId) {
    const sourceSettings = await this.findByUserId(sourceUserId);
    
    if (!sourceSettings) {
      throw new Error('Source user settings not found');
    }
    
    // Prepare settings data without the source user's ID
    const settingsToImport = { ...sourceSettings };
    delete settingsToImport.id;
    delete settingsToImport.user_id;
    delete settingsToImport.created_at;
    delete settingsToImport.updated_at;
    
    // Add the target user ID
    settingsToImport.user_id = targetUserId;
    
    // Check if target user already has settings
    const targetSettings = await this.findByUserId(targetUserId);
    
    if (targetSettings) {
      // Update existing settings
      return await this.update(targetUserId, settingsToImport);
    } else {
      // Create new settings
      return await this.create(settingsToImport);
    }
  }
}

module.exports = UserSettingsRepository;