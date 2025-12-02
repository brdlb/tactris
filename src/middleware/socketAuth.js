/**
 * Socket.IO Authentication Middleware
 * Handles authentication for socket connections including anonymous users
 */

const crypto = require('crypto');
const AuthService = require('../services/AuthService');

/**
 * Generate a secure anonymous token
 * @returns {string} Random hex token
 */
function generateAnonymousToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a new anonymous user and attach to socket
 * @param {Object} socket - Socket instance
 * @param {Function} next - Next middleware function
 * @param {Object} repositoryManager - Repository manager instance
 */
function createNewAnonymousUser(socket, next, repositoryManager) {
  repositoryManager.users.createAnonymous()
    .then(user => {
      // Generate an anonymous token for this user
      const anonymousToken = generateAnonymousToken();
      
      // Update the user record with the anonymous token
      return repositoryManager.users.updateAnonymousToken(user.id, anonymousToken)
        .then(updatedUser => {
          socket.userId = updatedUser.id; // Use the database user UUID
          socket.isAnonymous = true;
          socket.anonymousToken = anonymousToken; // Store the token for sending to client
          socket.anonymousUserRecord = updatedUser; // Store the user record for potential later use
          return next();
        })
        .catch(err => {
          console.warn('Warning: Could not update anonymous token (migration may not be run yet):', err);
          // If the column doesn't exist, use the user as-is without the token
          socket.userId = user.id; // Use the database user UUID
          socket.isAnonymous = true;
          socket.anonymousToken = null; // No token available
          socket.anonymousUserRecord = user; // Store the user record as-is
          return next();
        });
    })
    .catch(err => {
      console.error('Error creating anonymous user:', err);
      // Fallback to socket ID if user creation fails
      socket.userId = socket.id;
      socket.isAnonymous = true;
      socket.anonymousToken = null;
      return next();
    });
}

/**
 * Create Socket.IO authentication middleware
 * @param {Object} repositoryManager - Repository manager instance
 * @returns {Function} Socket.IO middleware function
 */
function createSocketAuthMiddleware(repositoryManager) {
  const authService = new AuthService(repositoryManager.users, repositoryManager.sessions);

  return (socket, next) => {
    // Extract session token from handshake auth or headers
    const sessionToken = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    const anonymousToken = socket.handshake.auth?.anonymousToken || socket.handshake.headers?.['x-anonymous-token'];
    
    // Check if the anonymous token is provided and valid
    if (anonymousToken) {
      // Validate the anonymous token by looking it up in the database
      repositoryManager.users.findByAnonymousToken(anonymousToken)
        .then(user => {
          if (user) {
            // Valid anonymous token found, use existing user
            socket.userId = user.id;
            socket.isAnonymous = true;
            socket.anonymousToken = anonymousToken; // Store the token for later use
            return next();
          } else {
            // Invalid token, create a new anonymous user
            createNewAnonymousUser(socket, next, repositoryManager);
          }
        })
        .catch(err => {
          console.error('Error validating anonymous token:', err);
          // If there's an error validating the token, create a new anonymous user
          createNewAnonymousUser(socket, next, repositoryManager);
        });
    } else if (!sessionToken) {
      // No session token and no anonymous token provided, create a new anonymous user
      createNewAnonymousUser(socket, next, repositoryManager);
    } else {
      // Validate the session token using our auth service
      authService.validateSession(sessionToken)
        .then(session => {
          if (session) {
            socket.userId = session.user_id;
            socket.isAnonymous = false;
            next();
          } else {
            // Invalid session, create an anonymous user
            createNewAnonymousUser(socket, next, repositoryManager);
          }
        })
        .catch(err => {
          // Error validating session, create an anonymous user
          createNewAnonymousUser(socket, next, repositoryManager);
        });
    }
  };
}

module.exports = {
  createSocketAuthMiddleware,
  generateAnonymousToken
};

