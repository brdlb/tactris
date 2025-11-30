/**
 * Transaction Manager - Advanced transaction handling for database operations
 * Ensures data consistency during game session completion and statistics updates
 */

class TransactionManager {
  /**
   * Execute a function within a database transaction
   * @param {Object} db - Database connection pool or client
   * @param {Function} transactionFunction - Function to execute within the transaction
   * @returns {Promise<any>} Result of the transaction function
   */
  static async executeInTransaction(db, transactionFunction) {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Execute the transaction function with the client
      const result = await transactionFunction(client);
      
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a function with retry logic for handling concurrent access
   * @param {Object} db - Database connection pool or client
   * @param {Function} transactionFunction - Function to execute within the transaction
   * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
   * @param {number} baseDelayMs - Base delay in milliseconds between retries (default: 100)
   * @returns {Promise<any>} Result of the transaction function
   */
  static async executeWithRetry(db, transactionFunction, maxRetries = 3, baseDelayMs = 100) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.executeInTransaction(db, transactionFunction);
      } catch (error) {
        lastError = error;
        
        // If this is the last attempt, throw the error
        if (attempt === maxRetries - 1) {
          throw error;
        }
        
        // Check if the error is related to serialization or deadlock
        // These are typically retryable errors
        if (this.isRetryableError(error)) {
          // Exponential backoff: wait longer between each retry
          const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 100;
          await this.delay(delay);
          continue;
        } else {
          // If it's not a retryable error, throw immediately
          throw error;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Check if an error is retryable (serialization, deadlock, etc.)
   * @param {Error} error - The error to check
   * @returns {boolean} True if the error is retryable
   */
  static isRetryableError(error) {
    // PostgreSQL error codes for retryable errors
    // 40001: serialization_failure
    // 40P01: deadlock_detected
    const retryableErrorCodes = ['40001', '40P01'];
    return retryableErrorCodes.includes(error.code);
  }

  /**
   * Simple delay function for backoff
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>} Promise that resolves after the delay
   */
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute a function with row-level locking to prevent concurrent updates
   * @param {Object} db - Database connection pool or client
   * @param {string} table - Table to lock rows in
   * @param {string} condition - Condition for selecting rows to lock
   * @param {Array} values - Values for the condition
   * @param {Function} transactionFunction - Function to execute within the transaction
   * @returns {Promise<any>} Result of the transaction function
   */
  static async executeWithRowLocking(db, table, condition, values, transactionFunction) {
    return await this.executeInTransaction(db, async (client) => {
      // Lock the specified rows using SELECT FOR UPDATE
      const lockQuery = `SELECT * FROM ${table} WHERE ${condition} FOR UPDATE;`;
      await client.query(lockQuery, values);
      
      // Execute the transaction function
      return await transactionFunction(client);
    });
  }
}

module.exports = TransactionManager;