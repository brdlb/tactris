-- Remove unused columns from game_statistics table
-- This migration removes the wins, losses, draws, and games_played_today columns
-- which are no longer used in the application code

-- Remove the columns that are no longer used
ALTER TABLE game_statistics DROP COLUMN IF EXISTS wins;
ALTER TABLE game_statistics DROP COLUMN IF EXISTS losses;
ALTER TABLE game_statistics DROP COLUMN IF EXISTS draws;
ALTER TABLE game_statistics DROP COLUMN IF EXISTS games_played_today;

-- Add migration record
INSERT INTO migrations (name) VALUES ('20251130000000_remove_unused_game_statistics_columns.sql');