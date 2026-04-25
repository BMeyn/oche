-- 001_auth.sql — users, magic link tokens, sessions

CREATE TABLE users (
  id         BIGSERIAL PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One-time tokens sent via email. Raw token is never stored — only its SHA-256 hash.
CREATE TABLE magic_tokens (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ           -- NULL = unused
);

-- Long-lived sessions identified by a random 32-byte hex id stored in a cookie.
CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX ON magic_tokens(token_hash);
CREATE INDEX ON sessions(user_id);
