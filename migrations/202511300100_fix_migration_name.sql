-- Fix migration name issue
-- This migration fixes the issue with the incorrectly named migration record

-- Remove the incorrectly named migration record if it exists
DELETE FROM migrations WHERE name = '202513000000_remove_unused_game_statistics_columns.sql';

-- Add the correct migration record if it doesn't exist
INSERT INTO migrations (name) VALUES ('2025130000000_remove_unused_game_statistics_columns.sql')
ON CONFLICT (name) DO NOTHING;

-- Actually remove the columns (in case they still exist)
ALTER TABLE game_statistics DROP COLUMN IF EXISTS wins;
ALTER TABLE game_statistics DROP COLUMN IF EXISTS losses;
ALTER TABLE game_statistics DROP COLUMN IF EXISTS draws;
ALTER TABLE game_statistics DROP COLUMN IF EXISTS games_played_today;

-- Add migration record for this fix
INSERT INTO migrations (name) VALUES ('20251300100_fix_migration_name.sql');