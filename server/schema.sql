CREATE TABLE IF NOT EXISTS scores (
  user_token uuid NOT NULL,
  song text NOT NULL CHECK (song IN ('schnitzel', 'kaszebe')),
  difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'crazy')),
  nickname varchar(10) NOT NULL,
  locale char(2),
  top_score bigint NOT NULL,
  accuracy numeric(5, 2),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_token, song, difficulty)
);

CREATE INDEX IF NOT EXISTS scores_board_rank_idx
  ON scores (song, difficulty, top_score DESC);

CREATE TABLE IF NOT EXISTS api_rate_limits (
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL,
  PRIMARY KEY (bucket, window_start)
);
