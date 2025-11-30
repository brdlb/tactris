-- Add player restore support to game_sessions table

-- UP
ALTER TABLE game_sessions ADD COLUMN paused_at timestamp with time zone DEFAULT NULL;
ALTER TABLE game_sessions ADD COLUMN player_state jsonb DEFAULT NULL;

ALTER TABLE game_sessions DROP CONSTRAINT IF EXISTS game_sessions_ending_reason_check;
ALTER TABLE game_sessions ADD CONSTRAINT game_sessions_ending_reason_check CHECK (
    ending_reason = ANY(ARRAY['game_over'::character varying, 'disconnected'::character varying, 'room_closed'::character varying, 'paused'::character varying]::text[])
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_restore ON game_sessions (player_id, room_id, paused_at DESC) WHERE ending_reason = 'paused';

-- DOWN
DROP INDEX IF EXISTS idx_game_sessions_restore;
ALTER TABLE game_sessions DROP CONSTRAINT IF EXISTS game_sessions_ending_reason_check;
ALTER TABLE game_sessions ADD CONSTRAINT game_sessions_ending_reason_check CHECK (
    ending_reason = ANY(ARRAY['game_over'::character varying, 'disconnected'::character varying, 'room_closed'::character varying]::text[])
);
ALTER TABLE game_sessions DROP COLUMN IF EXISTS paused_at;
ALTER TABLE game_sessions DROP COLUMN IF EXISTS player_state;

-- Record this migration
INSERT INTO migrations (name) VALUES ('20251130120000_add_player_restore_support.sql') ON CONFLICT (name) DO NOTHING;