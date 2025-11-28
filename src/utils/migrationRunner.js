const fs = require('fs');
const path = require('path');
const { query } = require('../config/db');

class MigrationRunner {
  constructor() {
    this.migrationsDir = path.join(__dirname, '../../migrations');
  }

  /**
   * Get all migration files from the migrations directory
   * @returns {string[]} Array of migration file names sorted chronologically
   */
 getMigrationFiles() {
    const files = fs.readdirSync(this.migrationsDir);
    const sqlFiles = files.filter(file => file.endsWith('.sql'));
    return sqlFiles.sort(); // Sort chronologically by filename
  }

  /**
   * Get all applied migrations from the database
   * @returns {Promise<string[]>} Array of applied migration names
   */
  async getAppliedMigrations() {
    try {
      // Check if migrations table exists
      const result = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'migrations'
        ) AS table_exists;
      `);

      if (!result.rows[0].table_exists) {
        // If migrations table doesn't exist, return empty array
        return [];
      }

      const result2 = await query('SELECT name FROM migrations ORDER BY applied_at');
      return result2.rows.map(row => row.name);
    } catch (error) {
      console.error('Error getting applied migrations:', error);
      return [];
    }
  }

  /**
   * Run pending migrations
   * @returns {Promise<number>} Number of migrations applied
   */
  async runMigrations() {
    const allMigrations = this.getMigrationFiles();
    const appliedMigrations = await this.getAppliedMigrations();

    // Find pending migrations
    const pendingMigrations = allMigrations.filter(migration => 
      !appliedMigrations.includes(migration)
    );

    console.log(`Found ${pendingMigrations.length} pending migrations:`, pendingMigrations);

    let appliedCount = 0;

    for (const migration of pendingMigrations) {
      console.log(`Applying migration: ${migration}`);
      
      try {
        // Read migration file
        const migrationPath = path.join(this.migrationsDir, migration);
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        // Execute migration in a transaction
        await query('BEGIN');
        
        // Apply the migration
        await query(migrationSql);
        
        // Record the migration as applied
        await query(
          'INSERT INTO migrations (name) VALUES ($1)', 
          [migration]
        );
        
        await query('COMMIT');
        
        console.log(`✓ Successfully applied migration: ${migration}`);
        appliedCount++;
      } catch (error) {
        await query('ROLLBACK');
        console.error(`✗ Error applying migration ${migration}:`, error.message);
        throw error;
      }
    }

    if (appliedCount === 0) {
      console.log('No new migrations to apply.');
    } else {
      console.log(`Successfully applied ${appliedCount} migration(s).`);
    }

    return appliedCount;
  }

  /**
   * Rollback the last migration
   * @returns {Promise<boolean>} True if rollback was successful, false otherwise
   */
  async rollbackMigration() {
    try {
      // Get the last applied migration
      const result = await query(`
        SELECT name FROM migrations 
        ORDER BY applied_at DESC 
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        console.log('No migrations to rollback.');
        return false;
      }

      const lastMigration = result.rows[0].name;
      console.log(`Rolling back migration: ${lastMigration}`);

      // In a real application, you would have separate rollback files
      // For now, we'll just remove the migration record
      // In a production system, you'd want to implement proper rollback logic
      await query('BEGIN');
      await query('DELETE FROM migrations WHERE name = $1', [lastMigration]);
      await query('COMMIT');

      console.log(`✓ Successfully rolled back migration: ${lastMigration}`);
      return true;
    } catch (error) {
      await query('ROLLBACK');
      console.error('Error rolling back migration:', error);
      return false;
    }
  }

  /**
   * Check the status of all migrations
   * @returns {Promise<Object>} Migration status information
   */
  async status() {
    const allMigrations = this.getMigrationFiles();
    const appliedMigrations = await this.getAppliedMigrations();

    const pending = allMigrations.filter(migration => 
      !appliedMigrations.includes(migration)
    );

    return {
      total: allMigrations.length,
      applied: appliedMigrations.length,
      pending: pending.length,
      appliedMigrations,
      pendingMigrations: pending
    };
  }
}

module.exports = MigrationRunner;