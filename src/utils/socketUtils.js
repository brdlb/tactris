/**
 * Socket utilities - Helper functions for socket operations
 */

/**
 * Helper function to create a short hash of userId for logging
 * @param {string} userId - User ID to hash
 * @returns {string} Short hash (last 6 characters) or 'unknown' if userId is falsy
 */
function shortUserIdHash(userId) {
  if (!userId) return 'unknown';
  return userId.slice(-6); // Take last 6 characters of userId
}

module.exports = {
  shortUserIdHash
};



