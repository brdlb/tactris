-- Initial schema for Tactris game
-- This migration creates all the base tables for the application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create figure_definitions table
CREATE TABLE figure_definitions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    figure_type character varying(1) NOT NULL UNIQUE,
    cells jsonb NOT NULL,
    rotation_count integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT figure_definitions_figure_type_check CHECK (
        figure_type = ANY(ARRAY['I'::character varying, 'O'::character varying, 'T'::character varying, 'S'::character varying, 'Z'::character varying, 'J'::character varying, 'L'::character varying]::text[])
    )
);

COMMENT ON TABLE figure_definitions IS 'Reference table for game figure definitions';

-- Create users table
CREATE TABLE users (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    anonymous_id character varying(255) UNIQUE,
    google_id character varying(255) UNIQUE,
    email character varying(255) UNIQUE,
    display_name character varying(100),
    profile_picture_url text,
    username character varying(100),
    is_anonymous boolean DEFAULT true NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add updated_at trigger to users
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE users IS 'Core user table supporting both anonymous and authenticated users';
COMMENT ON COLUMN users.anonymous_id IS 'Session-based ID for users playing without authentication';
COMMENT ON COLUMN users.google_id IS 'Unique Google OAuth user identifier';
COMMENT ON COLUMN users.is_anonymous IS 'Flag indicating if user is playing anonymously';
COMMENT ON COLUMN users.username IS 'Display name for the user';

-- Create user_sessions table
CREATE TABLE user_sessions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token character varying(255) NOT NULL UNIQUE,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address inet,
    user_agent text,
    is_active boolean DEFAULT true NOT NULL
);

-- Add updated_at trigger to user_sessions
CREATE TRIGGER update_user_sessions_updated_at 
    BEFORE UPDATE ON user_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_sessions IS 'User session management with expiration and tracking';

-- Create user_settings table
CREATE TABLE user_settings (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    theme character varying(20) DEFAULT 'light' NOT NULL,
    player_color_hue integer DEFAULT 0 NOT NULL,
    sound_enabled boolean DEFAULT true NOT NULL,
    animations_enabled boolean DEFAULT true NOT NULL,
    show_ghost_pieces boolean DEFAULT true NOT NULL,
    show_grid boolean DEFAULT true NOT NULL,
    public_profile boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_settings_player_color_hue_check CHECK (
        (player_color_hue >= 0) AND (player_color_hue <= 360)
    ),
    CONSTRAINT user_settings_theme_check CHECK (
        theme = ANY(ARRAY['light'::character varying, 'dark'::character varying]::text[])
    )
);

-- Add updated_at trigger to user_settings
CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON user_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_settings IS 'User preferences and customization settings';

-- Create game_sessions table
CREATE TABLE game_sessions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id character varying(255),
    player_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    player_color character varying(7) DEFAULT '#FF0000'::character varying NOT NULL,
    final_score integer DEFAULT 0 NOT NULL,
    lines_cleared integer DEFAULT 0 NOT NULL,
    total_lines_cleared integer DEFAULT 0 NOT NULL,
    figures_placed integer DEFAULT 0 NOT NULL,
    game_duration_seconds integer,
    final_grid jsonb,
    ending_reason character varying(20),
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    average_time_per_figure numeric(5,2),
    max_combo integer DEFAULT 0 NOT NULL,
    max_single_game_score integer DEFAULT 0 NOT NULL,
    CONSTRAINT game_sessions_ending_reason_check CHECK (
        ending_reason = ANY(ARRAY['game_over'::character varying, 'disconnected'::character varying, 'room_closed'::character varying]::text[])
    )
);

COMMENT ON TABLE game_sessions IS 'Individual game session records with detailed statistics';
COMMENT ON COLUMN game_sessions.final_grid IS 'JSON representation of the 10x10 grid at game end';

-- Create game_statistics table
CREATE TABLE game_statistics (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    total_games_played integer DEFAULT 0 NOT NULL,
    total_games_won integer DEFAULT 0 NOT NULL,
    best_score integer DEFAULT 0 NOT NULL,
    best_lines_cleared integer DEFAULT 0 NOT NULL,
    total_lines_cleared bigint DEFAULT 0 NOT NULL,
    total_figures_placed bigint DEFAULT 0 NOT NULL,
    total_play_time_seconds bigint DEFAULT 0 NOT NULL,
    average_score numeric(8,2) DEFAULT 0 NOT NULL,
    average_lines_per_game numeric(4,2) DEFAULT 0 NOT NULL,
    win_rate numeric(5,4) DEFAULT 0 NOT NULL,
    max_score_streak integer DEFAULT 0 NOT NULL,
    max_combo_achieved integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add updated_at trigger to game_statistics
CREATE TRIGGER update_game_statistics_updated_at 
    BEFORE UPDATE ON game_statistics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE game_statistics IS 'Aggregated user statistics for performance tracking';

-- Create leaderboard_entries table
CREATE TABLE leaderboard_entries (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_session_id uuid NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    leaderboard_type character varying(20) NOT NULL,
    rank_position integer,
    score integer NOT NULL,
    lines_cleared integer NOT NULL,
    game_duration_seconds integer,
    achieved_at timestamp with time zone DEFAULT now() NOT NULL,
    period_start timestamp with time zone,
    period_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT leaderboard_entries_leaderboard_type_check CHECK (
        leaderboard_type = ANY(ARRAY['global_score'::character varying, 'global_lines'::character varying, 'weekly_score'::character varying, 'weekly_lines'::character varying, 'personal_best'::character varying]::text[])
    )
);

COMMENT ON TABLE leaderboard_entries IS 'Denormalized leaderboard data for fast queries';
COMMENT ON COLUMN leaderboard_entries.leaderboard_type IS 'Type of leaderboard this entry belongs to';
COMMENT ON COLUMN leaderboard_entries.period_start IS 'Start of time period for periodic leaderboards';

-- Create migrations table to track applied migrations
CREATE TABLE migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert this migration into the migrations table
INSERT INTO migrations (name) VALUES ('20251128120000_initial_schema.sql');