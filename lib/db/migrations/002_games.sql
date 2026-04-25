-- 002_games.sql — lobby game sessions
CREATE TABLE games (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status      TEXT NOT NULL DEFAULT 'waiting',  -- waiting | active | finished
  config      JSONB NOT NULL,                   -- GameConfig (mode, startingScore, legsToWin, rules)
  player1_id  BIGINT NOT NULL REFERENCES users(id),
  player2_id  BIGINT REFERENCES users(id),      -- set when someone joins
  match_state JSONB,                            -- full Match object, updated on each turn
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at  TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX ON games(status, created_at DESC);
