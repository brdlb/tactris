-- Remove remaining unused columns from game_statistics table
-- This migration removes additional columns that are no longer used in the application code

-- Remove the additional columns that are no longer used
ALTER TABLE game_statistics DROP COLUMN IF EXISTS total_games_played;
ALTER TABLE game_statistics DROP COLUMN IF EXISTS total_games_won;
ALTER TABLE game_statistics DROP COLUMN IF EXISTS win_rate;
ALTER TABLE game_statistics DROP COLUMN IF EXISTS max_score_streak;
ALTER TABLE game_statistics DROP COLUMN IF EXISTS max_combo_achieved;

-- Add migration record
INSERT INTO migrations (name) VALUES ('202511300300_remove_remaining_unused_game_statistics_columns.sql')
ON CONFLICT (name) DO NOTHING;