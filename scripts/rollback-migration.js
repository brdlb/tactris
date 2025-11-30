#!/usr/bin/env node

require('dotenv').config();

const MigrationRunner = require('../src/utils/migrationRunner');

async function rollbackMigration() {
  console.log('Starting migration rollback process...');

  try {
    const runner = new MigrationRunner();
    
    // Check migration status
    const status = await runner.status();
    console.log(`Current Migration Status: ${status.applied} applied, ${status.pending} pending`);
    
    if (status.applied > 0) {
      console.log('Rolling back the last migration...');
      const success = await runner.rollbackMigration();
      
      if (success) {
        console.log('Migration rollback completed successfully.');
      } else {
        console.log('Migration rollback failed or was not needed.');
      }
    } else {
      console.log('No migrations to rollback.');
    }
  } catch (error) {
    console.error('Migration rollback failed:', error);
    process.exit(1);
  }
}

// Run rollback if this file is executed directly
if (require.main === module) {
  rollbackMigration();
}

module.exports = { rollbackMigration };