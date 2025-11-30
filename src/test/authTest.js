const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'tactris',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_password',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Import our authentication modules
const UserRepository = require('../models/UserRepository');
const SessionRepository = require('../models/SessionRepository');
const AuthService = require('../services/AuthService');

async function runTests() {
  console.log('Starting Authentication System Tests...\n');
  
  try {
    // Initialize repositories and auth service
    const userRepository = new UserRepository(pool);
    const sessionRepository = new SessionRepository(pool);
    const authService = new AuthService(userRepository, sessionRepository);
    
    console.log('✓ Initialized repositories and auth service\n');
    
    // Test 1: Create anonymous user and session
    console.log('Test 1: Creating anonymous user and session...');
    const { user: anonUser, session: anonSession } = await authService.createAnonymousSession('127.0.0.1', 'Test-Agent');
    console.log('✓ Created anonymous user:', anonUser.username);
    console.log('✓ Created session with token:', anonSession.session_token.substring(0, 10) + '...');
    
    // Test 2: Validate the session
    console.log('\nTest 2: Validating session...');
    const validatedSession = await authService.validateSession(anonSession.session_token);
    if (validatedSession) {
      console.log('✓ Session validated successfully');
    } else {
      console.log('✗ Session validation failed');
      return;
    }
    
    // Test 3: Get user by session
    console.log('\nTest 3: Getting user by session...');
    const sessionUser = await authService.getUserBySession(anonSession.session_token);
    if (sessionUser && sessionUser.id === anonUser.id) {
      console.log('✓ Retrieved correct user by session:', sessionUser.username);
    } else {
      console.log('✗ Failed to retrieve correct user by session');
      return;
    }
    
    // Test 4: Expire the session
    console.log('\nTest 4: Expiring session...');
    const expired = await authService.expireSession(anonSession.session_token);
    if (expired) {
      console.log('✓ Session expired successfully');
    } else {
      console.log('✗ Failed to expire session');
      return;
    }
    
    // Test 5: Try to validate the expired session
    console.log('\nTest 5: Validating expired session (should fail)...');
    const expiredValidation = await authService.validateSession(anonSession.session_token);
    if (!expiredValidation) {
      console.log('✓ Expired session correctly rejected');
    } else {
      console.log('✗ Expired session was still valid');
      return;
    }
    
    // Test 6: Test cleanup of expired sessions
    console.log('\nTest 6: Testing cleanup of expired sessions...');
    const cleanupResult = await authService.performCleanup();
    console.log('✓ Cleanup completed. Removed', cleanupResult.expiredSessionsRemoved, 'expired sessions and', cleanupResult.oldAnonymousUsersRemoved, 'old anonymous users');
    
    console.log('\n🎉 All authentication system tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
    console.log('\nDatabase connection closed.');
  }
}

// Run the tests
if (require.main === module) {
  runTests();
}

module.exports = { runTests };