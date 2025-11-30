-- Add missing columns to game_sessions table
-- This migration adds the columns that are expected by the application code but missing from the schema

-- Add grid_width column
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS grid_width INTEGER DEFAULT 10;

-- Add grid_height column  
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS grid_height INTEGER DEFAULT 10;

-- Add initial_grid column
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS initial_grid JSONB;

-- Add duration_seconds column
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- Add score column
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;

-- Add game_result column
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS game_result VARCHAR(20);

-- Add session_data column
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS session_data JSONB;

-- Add comments to document the new columns
COMMENT ON COLUMN game_sessions.grid_width IS 'Width of the game grid';
COMMENT ON COLUMN game_sessions.grid_height IS 'Height of the game grid';
COMMENT ON COLUMN game_sessions.initial_grid IS 'JSON representation of the initial game grid state';
COMMENT ON COLUMN game_sessions.duration_seconds IS 'Duration of the game session in seconds';
COMMENT ON COLUMN game_sessions.score IS 'Score achieved in the game session';
COMMENT ON COLUMN game_sessions.game_result IS 'Result of the game session (win, loss, draw)';
COMMENT ON COLUMN game_sessions.session_data IS 'Additional session data stored as JSON';