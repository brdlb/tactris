--
-- PostgreSQL database dump
--

\restrict f66sggQAasOPwwiW2fvmcl1Ivv1c3IOUnGlRd2HHDnv8h6NkBanZ6GVgw6vW8ik

-- Dumped from database version 17.6 (Ubuntu 17.6-0ubuntu0.25.04.1)
-- Dumped by pg_dump version 17.6 (Ubuntu 17.6-0ubuntu0.25.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: tactris_user
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO tactris_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: figure_definitions; Type: TABLE; Schema: public; Owner: tactris_user
--

CREATE TABLE public.figure_definitions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    figure_type character varying(1) NOT NULL,
    cells jsonb NOT NULL,
    rotation_count integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT figure_definitions_figure_type_check CHECK (((figure_type)::text = ANY (ARRAY[('I'::character varying)::text, ('O'::character varying)::text, ('T'::character varying)::text, ('S'::character varying)::text, ('Z'::character varying)::text, ('J'::character varying)::text, ('L'::character varying)::text])))
);


ALTER TABLE public.figure_definitions OWNER TO tactris_user;

--
-- Name: TABLE figure_definitions; Type: COMMENT; Schema: public; Owner: tactris_user
--

COMMENT ON TABLE public.figure_definitions IS 'Reference table for game figure definitions';


--
-- Name: game_sessions; Type: TABLE; Schema: public; Owner: tactris_user
--

CREATE TABLE public.game_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    room_id character varying(255),
    player_id uuid NOT NULL,
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
    game_mode character varying(50) DEFAULT 'classic'::character varying,
    grid_width integer DEFAULT 10,
    grid_height integer DEFAULT 10,
    initial_grid jsonb,
    duration_seconds integer,
    score integer DEFAULT 0,
    game_result character varying(20),
    session_data jsonb,
    updated_at timestamp with time zone DEFAULT now(),
    paused_at timestamp with time zone,
    player_state jsonb,
    CONSTRAINT game_sessions_ending_reason_check CHECK (((ending_reason)::text = ANY (ARRAY[('game_over'::character varying)::text, ('disconnected'::character varying)::text, ('room_closed'::character varying)::text, ('paused'::character varying)::text])))
);


ALTER TABLE public.game_sessions OWNER TO tactris_user;

--
-- Name: TABLE game_sessions; Type: COMMENT; Schema: public; Owner: tactris_user
--

COMMENT ON TABLE public.game_sessions IS 'Individual game session records with detailed statistics';


--
-- Name: COLUMN game_sessions.final_grid; Type: COMMENT; Schema: public; Owner: tactris_user
--

COMMENT ON COLUMN public.game_sessions.final_grid IS 'JSON representation of the 10x10 grid at game end';


--
-- Name: COLUMN game_sessions.game_mode; Type: COMMENT; Schema: public; Owner: tactris_user
--

COMMENT ON COLUMN public.game_sessions.game_mode IS 'Game mode for the session (classic, challenge, etc.)';


--
-- Name: COLUMN game_sessions.grid_width; Type: COMMENT; Schema: public; Owner: tactris_user
--

COMMENT ON COLUMN public.game_sessions.grid_width IS 'Width of the game grid';


--
-- Name: COLUMN game_sessions.grid_height; Type: COMMENT; Schema: public; Owner: tactris_user
--

COMMENT ON COLUMN public.game_sessions.grid_height IS 'Height of the game grid';


--
-- Name: COLUMN game_sessions.initial_grid; Type: COMMENT; Schema: public; Owner: tactris_user
--

COMMENT ON COLUMN public.game_sessions.initial_grid IS 'JSON representation of the initial game grid state';


--
-- Name: COLUMN game_sessions.duration_seconds; Type: COMMENT; Schema: public; Owner: tactris_user
--

COMMENT ON COLUMN public.game_sessions.duration_seconds IS 'Duration of the game session in seconds';


--
-- Name: COLUMN game_sessions.score; Type: COMMENT; Schema: public; Owner: tactris_user
--

COMMENT ON COLUMN public.game_sessions.score IS 'Score achieved in the game session';


--
-- Name: COLUMN game_sessions.game_result; Type: COMMENT; Schema: public; Owner: tactris_user
--

COMMENT ON COLUMN public.game_sessions.game_result IS 'Result of the game session (win, loss, draw)';


--
-- Name: COLUMN game_sessions.session_data; Type: COMMENT; Schema: public; Owner: tactris_user
--

COMMENT ON COLUMN public.game_sessions.session_data IS 'Additional session data stored as JSON';


--
-- Name: COLUMN game_sessions.updated_at; Type: COMMENT; Schema: public; Owner: tactris_user
--

COMMENT ON COLUMN public.game_sessions.updated_at IS 'Timestamp of the last update to the game session record';


--
-- Name: game_statistics; Type: TABLE; Schema: public; Owner: tactris_user
--

CREATE TABLE public.game_statistics (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    best_score integer DEFAULT 0 NOT NULL,
    best_lines_cleared integer DEFAULT 0 NOT NULL,
    total_lines_cleared bigint DEFAULT 0 NOT NULL,
    total_figures_placed bigint DEFAULT 0 NOT NULL,
    total_play_time_seconds bigint DEFAULT 0 NOT NULL,
    average_score numeric(8,2) DEFAULT 0 NOT NULL,
    average_lines_per_game numeric(4,2) DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    total_games integer DEFAULT 0 NOT NULL,
    total_score bigint DEFAULT 0 NOT NULL,
    total_duration bigint DEFAULT 0 NOT NULL,
    average_lines_cleared numeric(6,2) DEFAULT 0 NOT NULL,
    average_duration numeric(8,2) DEFAULT 0 NOT NULL
);


ALTER TABLE public.game_statistics OWNER TO tactris_user;

--
-- Name: TABLE game_statistics; Type: COMMENT; Schema: public; Owner: tactris_user
--

COMMENT ON TABLE public.game_statistics IS 'Aggregated user statistics for performance tracking';


--
-- Name: leaderboard_entries; Type: TABLE; Schema: public; Owner: tactris_user
--

CREATE TABLE public.leaderboard_entries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    game_session_id uuid NOT NULL,
    leaderboard_type character varying(20) NOT NULL,
    rank_position integer,
    score integer NOT NULL,
    lines_cleared integer NOT NULL,
    game_duration_seconds integer,
    achieved_at timestamp with time zone DEFAULT now() NOT NULL,
    period_start timestamp with time zone,
    period_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT leaderboard_entries_leaderboard_type_check CHECK (((leaderboard_type)::text = ANY (ARRAY[('global_score'::character varying)::text, ('global_lines'::character varying)::text, ('weekly_score'::character varying)::text, ('weekly_lines'::character varying)::text, ('personal_best'::character varying)::text])))
);


ALTER TABLE public.leaderboard_entries OWNER TO tactris_user;

--
-- Name: TABLE leaderboard_entries; Type: COMMENT; Schema: public; Owner: tactris_user
--

COMMENT ON TABLE public.leaderboard_entries IS 'Denormalized leaderboard data for fast queries';


--
-- Name: COLUMN leaderboard_entries.leaderboard_type; Type: COMMENT; Schema: public; Owner: tactris_user
--

COMMENT ON COLUMN public.leaderboard_entries.leaderboard_type IS 'Type of leaderboard this entry belongs to';


--
-- Name: COLUMN leaderboard_entries.period_start; Type: COMMENT; Schema: public; Owner: tactris_user
--

COMMENT ON COLUMN public.leaderboard_entries.period_start IS 'Start of time period for periodic leaderboards';


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: tactris_user
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    applied_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.migrations OWNER TO tactris_user;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: tactris_user
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.migrations_id_seq OWNER TO tactris_user;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tactris_user
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: tactris_user
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    session_token character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address inet,
    user_agent text,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.user_sessions OWNER TO tactris_user;

--
-- Name: TABLE user_sessions; Type: COMMENT; Schema: public; Owner: tactris_user
--

COMMENT ON TABLE public.user_sessions IS 'User session management with expiration and tracking';


--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: tactris_user
--

CREATE TABLE public.user_settings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    theme character varying(20) DEFAULT 'light'::character varying NOT NULL,
    player_color_hue integer DEFAULT 0 NOT NULL,
    sound_enabled boolean DEFAULT true NOT NULL,
    animations_enabled boolean DEFAULT true NOT NULL,
    show_ghost_pieces boolean DEFAULT true NOT NULL,
    show_grid boolean DEFAULT true NOT NULL,
    public_profile boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_settings_player_color_hue_check CHECK (((player_color_hue >= 0) AND (player_color_hue <= 360))),
    CONSTRAINT user_settings_theme_check CHECK (((theme)::text = ANY (ARRAY[('light'::character varying)::text, ('dark'::character varying)::text])))
);


ALTER TABLE public.user_settings OWNER TO tactris_user;

--
-- Name: TABLE user_settings; Type: COMMENT; Schema: public; Owner: tactris_user
--

COMMENT ON TABLE public.user_settings IS 'User preferences and customization settings';


--
-- Name: users; Type: TABLE; Schema: public; Owner: tactris_user
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    anonymous_id character varying(255),
    google_id character varying(255),
    email character varying(255),
    display_name character varying(100),
    profile_picture_url text,
    username character varying(100),
    is_anonymous boolean DEFAULT true NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    anonymous_token character varying(255)
);


ALTER TABLE public.users OWNER TO tactris_user;

--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: tactris_user
--

COMMENT ON TABLE public.users IS 'Core user table supporting both anonymous and authenticated users';


--
-- Name: COLUMN users.anonymous_id; Type: COMMENT; Schema: public; Owner: tactris_user
--

COMMENT ON COLUMN public.users.anonymous_id IS 'Session-based ID for users playing without authentication';


--
-- Name: COLUMN users.google_id; Type: COMMENT; Schema: public; Owner: tactris_user
--

COMMENT ON COLUMN public.users.google_id IS 'Unique Google OAuth user identifier';


--
-- Name: COLUMN users.username; Type: COMMENT; Schema: public; Owner: tactris_user
--

COMMENT ON COLUMN public.users.username IS 'Display name for the user';


--
-- Name: COLUMN users.is_anonymous; Type: COMMENT; Schema: public; Owner: tactris_user
--

COMMENT ON COLUMN public.users.is_anonymous IS 'Flag indicating if user is playing anonymously';


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: tactris_user
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: figure_definitions figure_definitions_figure_type_key; Type: CONSTRAINT; Schema: public; Owner: tactris_user
--

ALTER TABLE ONLY public.figure_definitions
    ADD CONSTRAINT figure_definitions_figure_type_key UNIQUE (figure_type);


--
-- Name: figure_definitions figure_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: tactris_user
--

ALTER TABLE ONLY public.figure_definitions
    ADD CONSTRAINT figure_definitions_pkey PRIMARY KEY (id);


--
-- Name: game_sessions game_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: tactris_user
--

ALTER TABLE ONLY public.game_sessions
    ADD CONSTRAINT game_sessions_pkey PRIMARY KEY (id);


--
-- Name: game_statistics game_statistics_pkey; Type: CONSTRAINT; Schema: public; Owner: tactris_user
--

ALTER TABLE ONLY public.game_statistics
    ADD CONSTRAINT game_statistics_pkey PRIMARY KEY (id);


--
-- Name: game_statistics game_statistics_user_id_key; Type: CONSTRAINT; Schema: public; Owner: tactris_user
--

ALTER TABLE ONLY public.game_statistics
    ADD CONSTRAINT game_statistics_user_id_key UNIQUE (user_id);


--
-- Name: leaderboard_entries leaderboard_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: tactris_user
--

ALTER TABLE ONLY public.leaderboard_entries
    ADD CONSTRAINT leaderboard_entries_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: public; Owner: tactris_user
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: tactris_user
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: tactris_user
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: tactris_user
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_session_token_key UNIQUE (session_token);


--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: tactris_user
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);


--
-- Name: user_settings user_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: tactris_user
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_key UNIQUE (user_id);


--
-- Name: users users_anonymous_id_key; Type: CONSTRAINT; Schema: public; Owner: tactris_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_anonymous_id_key UNIQUE (anonymous_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: tactris_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_google_id_key; Type: CONSTRAINT; Schema: public; Owner: tactris_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_key UNIQUE (google_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: tactris_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_game_sessions_restore; Type: INDEX; Schema: public; Owner: tactris_user
--

CREATE INDEX idx_game_sessions_restore ON public.game_sessions USING btree (player_id, room_id, paused_at DESC) WHERE ((ending_reason)::text = 'paused'::text);


--
-- Name: game_sessions update_game_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: tactris_user
--

CREATE TRIGGER update_game_sessions_updated_at BEFORE UPDATE ON public.game_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: game_statistics update_game_statistics_updated_at; Type: TRIGGER; Schema: public; Owner: tactris_user
--

CREATE TRIGGER update_game_statistics_updated_at BEFORE UPDATE ON public.game_statistics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_sessions update_user_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: tactris_user
--

CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON public.user_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_settings update_user_settings_updated_at; Type: TRIGGER; Schema: public; Owner: tactris_user
--

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: tactris_user
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: game_sessions game_sessions_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tactris_user
--

ALTER TABLE ONLY public.game_sessions
    ADD CONSTRAINT game_sessions_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: game_statistics game_statistics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tactris_user
--

ALTER TABLE ONLY public.game_statistics
    ADD CONSTRAINT game_statistics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: leaderboard_entries leaderboard_entries_game_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tactris_user
--

ALTER TABLE ONLY public.leaderboard_entries
    ADD CONSTRAINT leaderboard_entries_game_session_id_fkey FOREIGN KEY (game_session_id) REFERENCES public.game_sessions(id) ON DELETE CASCADE;


--
-- Name: leaderboard_entries leaderboard_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tactris_user
--

ALTER TABLE ONLY public.leaderboard_entries
    ADD CONSTRAINT leaderboard_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tactris_user
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_settings user_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tactris_user
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO tactris_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO tactris_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO tactris_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO tactris_user;


--
-- PostgreSQL database dump complete
--

\unrestrict f66sggQAasOPwwiW2fvmcl1Ivv1c3IOUnGlRd2HHDnv8h6NkBanZ6GVgw6vW8ik

