-- Add game_mode column to game_sessions table
-- This migration adds the game_mode column that is required by the application code

-- Add the game_mode column with a default value
ALTER TABLE game_sessions 
ADD COLUMN game_mode VARCHAR(50) DEFAULT 'classic';

-- Add a comment to document the column
COMMENT ON COLUMN game_sessions.game_mode IS 'Game mode for the session (classic, challenge, etc.)';