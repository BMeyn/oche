-- 005_profiles.sql — display names, avatar colours, friend requests

ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_color TEXT NOT NULL DEFAULT '#6d736f';

CREATE TABLE IF NOT EXISTS friend_requests (
  id            BIGSERIAL PRIMARY KEY,
  requester_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending',  -- pending | accepted | declined
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);
CREATE INDEX IF NOT EXISTS friend_requests_addressee_idx ON friend_requests(addressee_id, status);
CREATE INDEX IF NOT EXISTS friend_requests_requester_idx ON friend_requests(requester_id, status);
