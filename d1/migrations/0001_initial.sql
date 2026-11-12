CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  display_name TEXT,
  is_anonymous INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);
CREATE INDEX user_sessions_token_hash_idx ON user_sessions(token_hash);

CREATE TABLE game_sessions (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  round_number INTEGER NOT NULL,
  player_id TEXT NOT NULL REFERENCES users(id),
  player_color TEXT NOT NULL,
  score INTEGER NOT NULL,
  lines_cleared INTEGER NOT NULL,
  figures_placed INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  game_result TEXT NOT NULL,
  final_grid TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE
);
CREATE INDEX game_sessions_player_created_idx ON game_sessions(player_id, created_at);

CREATE TABLE game_statistics (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  total_games INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  average_score REAL NOT NULL DEFAULT 0,
  best_score INTEGER NOT NULL DEFAULT 0,
  total_lines_cleared INTEGER NOT NULL DEFAULT 0,
  average_lines_cleared REAL NOT NULL DEFAULT 0,
  best_lines_cleared INTEGER NOT NULL DEFAULT 0,
  total_figures_placed INTEGER NOT NULL DEFAULT 0,
  total_play_time_seconds INTEGER NOT NULL DEFAULT 0,
  average_lines_per_game REAL NOT NULL DEFAULT 0,
  rating INTEGER NOT NULL DEFAULT 1000,
  updated_at INTEGER NOT NULL
);

CREATE TRIGGER game_sessions_update_statistics
AFTER INSERT ON game_sessions
BEGIN
  INSERT INTO game_statistics (
    user_id, total_games, total_score, average_score, best_score,
    total_lines_cleared, average_lines_cleared, best_lines_cleared,
    total_figures_placed, total_play_time_seconds, average_lines_per_game, updated_at
  ) VALUES (
    NEW.player_id, 1, NEW.score, NEW.score, NEW.score,
    NEW.lines_cleared, NEW.lines_cleared, NEW.lines_cleared,
    NEW.figures_placed, NEW.duration_seconds, NEW.lines_cleared, NEW.created_at
  ) ON CONFLICT(user_id) DO UPDATE SET
    total_games = total_games + 1,
    total_score = total_score + NEW.score,
    average_score = CAST(total_score + NEW.score AS REAL) / (total_games + 1),
    best_score = MAX(best_score, NEW.score),
    total_lines_cleared = total_lines_cleared + NEW.lines_cleared,
    average_lines_cleared = CAST(total_lines_cleared + NEW.lines_cleared AS REAL) / (total_games + 1),
    best_lines_cleared = MAX(best_lines_cleared, NEW.lines_cleared),
    total_figures_placed = total_figures_placed + NEW.figures_placed,
    total_play_time_seconds = total_play_time_seconds + NEW.duration_seconds,
    average_lines_per_game = CAST(total_lines_cleared + NEW.lines_cleared AS REAL) / (total_games + 1),
    updated_at = NEW.created_at;
END;
