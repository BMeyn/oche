-- Add season_halves to tournaments (1 = single round-robin, 2 = home + away)
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS season_halves INT NOT NULL DEFAULT 1;
