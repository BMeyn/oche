-- Track when a game row was last touched. Used to detect stale active games
-- (no match_state update for N days) and to drive the prune cron.
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS games_set_updated_at ON games;
CREATE TRIGGER games_set_updated_at
BEFORE UPDATE ON games
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS games_status_updated_at_idx
  ON games(status, updated_at);
