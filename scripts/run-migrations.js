#!/usr/bin/env node

require('dotenv').config();

const MigrationRunner = require('../src/utils/migrationRunner');

async function runMigrations() {
  console.log('Starting database migration process...');

  try {
    const runner = new MigrationRunner();
    
    // Check migration status
    const status = await runner.status();
    console.log(`Migration Status: ${status.applied} applied, ${status.pending} pending`);
    
    if (status.pending > 0) {
      console.log('Applying pending migrations...');
      await runner.runMigrations();
      console.log('Migration process completed successfully.');
    } else {
      console.log('No pending migrations to apply.');
    }
  } catch (error) {
    console.error('Migration process failed:', error);
    process.exit(1);
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };