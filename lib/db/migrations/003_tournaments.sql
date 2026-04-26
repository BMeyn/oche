CREATE TABLE tournaments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'waiting',  -- waiting | active | finished
  format      TEXT NOT NULL,                     -- single_elim | round_robin
  game_config JSONB NOT NULL,                    -- GameConfig
  creator_id  BIGINT NOT NULL REFERENCES users(id),
  max_players INT NOT NULL DEFAULT 8,            -- 2-16
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at  TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);
CREATE INDEX ON tournaments(status, created_at DESC);

CREATE TABLE tournament_players (
  tournament_id UUID   NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id       BIGINT NOT NULL REFERENCES users(id),
  seed          INT,                              -- assigned at start, null while waiting
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tournament_id, user_id)
);

CREATE TABLE tournament_matches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID   NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  game_id       UUID   REFERENCES games(id),     -- null until "Play" clicked
  round         INT    NOT NULL,                 -- 1-indexed; round-robin: all round 1
  match_number  INT    NOT NULL,                 -- 1-indexed within round
  player1_id    BIGINT REFERENCES users(id),     -- null = TBD or bye slot
  player2_id    BIGINT REFERENCES users(id),
  winner_id     BIGINT REFERENCES users(id),
  status        TEXT   NOT NULL DEFAULT 'pending', -- pending|ready|active|finished|bye
  UNIQUE (tournament_id, round, match_number)
);
CREATE INDEX ON tournament_matches(tournament_id, round);
CREATE INDEX ON tournament_matches(game_id);
