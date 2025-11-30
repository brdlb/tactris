-- Increase the precision of average_lines_cleared to match application logic
-- This prevents numeric field overflow errors when calculating averages

ALTER TABLE game_statistics
ALTER COLUMN average_lines_cleared TYPE NUMERIC(6, 2);

-- Add migration record
INSERT INTO migrations (name) VALUES ('20251128280000_increase_average_lines_cleared_precision.sql');