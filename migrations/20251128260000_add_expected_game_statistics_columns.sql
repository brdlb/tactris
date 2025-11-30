-- Add expected columns to game_statistics table to match code expectations
-- This migration adds columns that the code expects but are missing from the schema

-- Add missing columns that the code expects
ALTER TABLE game_statistics ADD COLUMN IF NOT EXISTS total_games INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE game_statistics ADD COLUMN IF NOT EXISTS wins INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE game_statistics ADD COLUMN IF NOT EXISTS losses INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE game_statistics ADD COLUMN IF NOT EXISTS draws INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE game_statistics ADD COLUMN IF NOT EXISTS total_score BIGINT DEFAULT 0 NOT NULL;
ALTER TABLE game_statistics ADD COLUMN IF NOT EXISTS total_duration BIGINT DEFAULT 0 NOT NULL;
ALTER TABLE game_statistics ADD COLUMN IF NOT EXISTS average_lines_cleared NUMERIC(5,2) DEFAULT 0 NOT NULL;
ALTER TABLE game_statistics ADD COLUMN IF NOT EXISTS average_duration NUMERIC(8,2) DEFAULT 0 NOT NULL;
ALTER TABLE game_statistics ADD COLUMN IF NOT EXISTS games_played_today INTEGER DEFAULT 0 NOT NULL;

-- Migrate existing data to the new columns
-- Copy total_games_played to total_games
UPDATE game_statistics SET total_games = total_games_played;

-- Copy total_games_won to wins
UPDATE game_statistics SET wins = total_games_won;

-- Copy total_play_time_seconds to total_duration
UPDATE game_statistics SET total_duration = total_play_time_seconds;

-- Calculate average_lines_cleared based on total_lines_cleared and total_games if total_games > 0
UPDATE game_statistics 
SET average_lines_cleared = CASE 
    WHEN total_games > 0 THEN (total_lines_cleared::NUMERIC / total_games)
    ELSE 0 
END;

-- Calculate average_duration based on total_duration and total_games if total_games > 0
UPDATE game_statistics 
SET average_duration = CASE 
    WHEN total_games > 0 THEN (total_duration::NUMERIC / total_games)
    ELSE 0 
END;

-- Add migration record
INSERT INTO migrations (name) VALUES ('2025112826000_add_expected_game_statistics_columns.sql');