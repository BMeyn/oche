CREATE INDEX IF NOT EXISTS games_player1_status_finished_idx ON games(player1_id, status, finished_at DESC);
CREATE INDEX IF NOT EXISTS games_player2_status_finished_idx ON games(player2_id, status, finished_at DESC) WHERE player2_id IS NOT NULL;
