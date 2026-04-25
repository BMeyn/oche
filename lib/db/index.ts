// lib/db/index.ts — Postgres connection (used from Phase 3 onward)
//
// V1 doesn't persist anything — match state lives in React. This file is
// here so the Docker compose stack stands up with a working DB, and so
// adding match persistence later is a small change rather than a refactor.

import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

export const sql = connectionString
  ? postgres(connectionString, { max: 10 })
  : null;

export const dbConfigured = !!connectionString;
