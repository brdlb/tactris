const { Pool } = require('pg');

// Database configuration from environment variables
const dbConfig = {
 host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'tactris',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  // Pool configuration
  min: parseInt(process.env.DB_POOL_MIN) || 2,
  max: parseInt(process.env.DB_POOL_MAX) || 20,
  // Connection timeout
  connectionTimeoutMillis: 5000,
  // Idle timeout
  idleTimeoutMillis: 30000,
};

// Create the connection pool
const pool = new Pool(dbConfig);

// Test the connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Function to get a client from the pool
const getClient = async () => {
  return await pool.connect();
};

// Function to execute a query
const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text, duration, rows: res.rowCount });
  return res;
};

// Health check function
const healthCheck = async () => {
  try {
    await query('SELECT 1');
    return { status: 'ok', message: 'Database is accessible' };
  } catch (error) {
    console.error('Database health check failed:', error);
    return { status: 'error', message: 'Database is not accessible' };
  }
};

// Graceful shutdown function
const closePool = async () => {
  console.log('Closing database connection pool...');
  await pool.end();
  console.log('Database connection pool closed');
};

module.exports = {
  pool,
  getClient,
  query,
  healthCheck,
  closePool,
  dbConfig,
};