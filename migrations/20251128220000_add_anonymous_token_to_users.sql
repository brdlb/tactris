-- Migration: Add anonymous_token column to users table

-- Add the anonymous_token column to the users table
ALTER TABLE users ADD COLUMN anonymous_token VARCHAR(255);

-- Add a unique constraint to ensure each anonymous token is unique
CREATE UNIQUE INDEX idx_users_anonymous_token ON users(anonymous_token);

-- Add a comment to document the column
COMMENT ON COLUMN users.anonymous_token IS 'Unique token for identifying anonymous users across sessions';