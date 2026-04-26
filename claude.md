# CLAUDE.md

Onboarding for a fresh Claude session on this codebase. Read this top to bottom before making changes.

-----

## What this is

**OCHE** — a self-hosted darts scoring webapp. Two players step up to a tablet/phone, pick a game mode, and tap their darts in. The app handles all the maths: bust detection, double-out checkout validation, leg/match completion, live 3-dart averages, checkout suggestions.

**Tagline:** *Three darts. Zero math.*

The user is building this for themselves and friends (likely a small darts community). They deploy it on their own VPS via Docker at **oche.cloud** (HTTPS via Caddy + Let's Encrypt). They are not a beginner but appreciate clean explanations and pragmatic choices.

The user communicates in a mix of English and German ("Weiter" = "continue"). Reply in whichever language they used in their last message; default to English.

## Where the project is now

**Phases 3–5 (accounts, lobby, matches, tournaments, history) are implemented.**

What's verified working:

- 24/24 Vitest tests pass on the scoring engine
- `next build` succeeds with standalone output
- `tsc --noEmit` reports zero type errors
- Magic-link email login (via Resend, sending domain `contact.oche.cloud`)
- Session cookies, 30-day expiry, Postgres-backed
- Lobby: create a game → share invite link → opponent joins → live match synced via polling
- Local/guest play: skip invite, enter opponent name, game starts immediately on one device
- "Your games" section in lobby: shows the user's non-finished games (waiting + active), polls every 5s, with Rejoin and Leave buttons
- Match state persisted to DB on every turn (JSONB); both devices see updates within 1.5s
- **Tournaments:** single-elimination brackets + round-robin (with optional full-season home/away). Invite link join, creator starts, matches auto-advance, finished results screen with rankings.
- **Match history:** `/history` page showing all finished games (W/L, avg, 180s, best finish) + tournament history (rank, format, W/P). Aggregate stats bar at top.
- Applied migrations on VPS: `001_auth.sql`, `002_games.sql`, `003_tournaments.sql`, `004_season_halves.sql`

## Tech stack & why

|Choice                                   |Why                                                                                                                                            |
|-----------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
|**Next.js 15 App Router + React 19**     |App Router for server components + route handlers. `export const dynamic = "force-dynamic"` required on any layout that reads cookies via a helper function.|
|**TypeScript strict**                    |Scoring rules are subtle (bust on 1, double-in mid-turn, master-out) — types catch entire categories of bugs.                                  |
|**Tailwind 3**                           |Custom design tokens in `tailwind.config.mjs` matching the brand palette. Inline hex values used where Tailwind classes aren't enough.        |
|**Vitest**                               |Engine is pure functions; Vitest runs them fast without a browser.                                                                             |
|**Postgres 16 (Docker, self-hosted)**    |User explicitly chose self-hosted over Supabase. Schema: `users`, `magic_tokens`, `sessions`, `games`.                                        |
|**Caddy 2**                              |Reverse proxy with automatic Let's Encrypt. `DOMAIN=oche.cloud` in `.env` enables HTTPS. Do NOT add `:80` suffix — that forces HTTP-only.     |
|**`postgres` (porsager)**                |Lightweight Postgres client. No ORM. `db.json(value as never)` needed to pass typed objects due to strict JSONValue typing.                   |
|**`output: "standalone"` in next.config**|Cuts Docker image to ~150MB. Requires explicit `COPY` of `node_modules/postgres` in Dockerfile (not bundled automatically).                   |
|**Resend**                               |Transactional email for magic links. Verified sending domain: `contact.oche.cloud`. `RESEND_FROM_DOMAIN` env var separates it from `APP_URL`. |

## Architecture decisions (the non-obvious ones)

### The scoring engine is pure and lives in `lib/scoring.ts`

No React, no DOM, no I/O. Just functions: `createMatch`, `applyDart`, `undoLastDart`, `displayRemaining`, `computeStats`. This is **the most important architectural choice in the project.** It means:

- The engine is fully unit-testable without rendering anything
- It can move to a server route, a worker, or a different framework with zero changes
- The future AI vision agent calls the same `applyDart` the keypad does

If you're tempted to put scoring logic in a component, **don't.** Add it to `lib/scoring.ts` with tests.

### Auth: two-layer security

1. **Middleware** (`middleware.ts`) — fast cookie-presence check, redirects to `/login` if no cookie
2. **`app/(app)/layout.tsx`** — full DB session validation via `getCurrentUser()`

The layout **must** have `export const dynamic = "force-dynamic"`. Without it, Next.js 15 statically pre-renders it at build time (no cookie → redirect to login → cached for all users). This was a hard-won debugging lesson.

### Cookie `secure` flag uses `APP_URL`, not `NODE_ENV`

In Docker local dev, `NODE_ENV=production` but the app runs over HTTP. Use `appUrl.startsWith("https://")` to set the `secure` flag, not `process.env.NODE_ENV`.

### `NextResponse.redirect()` required in Route Handlers for Set-Cookie

Using `redirect()` from `next/navigation` in a Route Handler doesn't reliably attach the Set-Cookie header. Always use `NextResponse.redirect()` + `response.cookies.set()` in Route Handlers.

### Match state persistence: full JSONB snapshot per turn

The scorer device calls `applyDart()` locally (instant UI), then fire-and-forgets a `PATCH /api/games/[id]/state` with the full `Match` object. The server stores it as JSONB. Spectators poll `GET /api/games/[id]` every 1.5s. Simple, no conflict handling needed (one physical scorer device).

### Game invites: private link, not public lobby

Games are not listed publicly. Creator gets a `/match/[id]` URL to share. The opponent visits the link, sees a "Join" screen, clicks Accept — match starts on both devices. The `games` table uses UUID primary keys (hard to guess).

### Local/guest play: no invite needed

When creating a game, the creator can choose "Play locally" instead of "Invite". They enter the opponent's name (stored as display name only — no account). The API creates the game immediately with `status=active` and `match_state` initialised — skipping the waiting screen entirely. `player2_id` stays NULL, so no long-term stats are attributed to the guest.

### "Your games" in lobby: rejoin after lost connection

`GET /api/games` returns the current user's non-finished games (player1 or player2). The lobby polls this every 5s and shows a "Your games" section with status indicators and Rejoin/Leave buttons. Leaving calls `DELETE /api/games/[id]`, which hard-deletes the row (only allowed if user is a participant and game is not finished).

### Per-dart entry, not per-turn

Each `Dart = { multiplier: 1|2|3, number: 0..20 | 25, score, label }`. A `Turn` is `{ darts: Dart[1..3], total, kind: "ok"|"bust"|"win", ... }`.

### `hasStarted` for double-in is committed at turn end, not mid-turn

See `lib/scoring.ts` `applyDartX01` and the test "starts on first double; subsequent darts count". Do not change this without running all 24 tests.

### Two dart-count metrics: `dartsCount` and `countedDartsCount`

`dartsCount` = physical darts thrown. `countedDartsCount` = darts counting toward 3-dart average (excludes pre-double-in misses). The 3-dart average uses `countedDartsCount`.

### High-Low is a separate `applyDart` branch

`applyDart` dispatches to `applyDartX01` or `applyDartHighLow`. Adding Cricket later means adding `applyDartCricket` alongside.

## Folder structure

```
oche/
├── app/                              Next.js App Router
│   ├── layout.tsx                    Root layout, font loading, body class
│   ├── page.tsx                      Redirects → /lobby
│   ├── globals.css                   Tailwind directives + custom keyframes
│   ├── (auth)/
│   │   ├── layout.tsx                Minimal bare layout (no nav)
│   │   └── login/
│   │       ├── page.tsx              Email form (server, reads searchParams)
│   │       └── LoginForm.tsx         Client form component
│   ├── (app)/
│   │   ├── layout.tsx                DB session validation (force-dynamic!)
│   │   ├── lobby/page.tsx            Landing page after login
│   │   ├── play/page.tsx             Redirects → /lobby (retired)
│   │   ├── history/page.tsx          Server: fetch game + tournament history, render HistoryPage
│   │   ├── match/[id]/
│   │   │   ├── page.tsx              Server: fetches game + user
│   │   │   └── MatchClient.tsx       Client: scorer/spectator, polling, invite flow; ?tournament= param for back-link
│   │   └── tournament/[id]/
│   │       ├── page.tsx              Server: fetch tournament + user
│   │       └── TournamentClient.tsx  Client: waiting/bracket/standings/finished views, 5s poll, cancel
│   └── api/
│       ├── auth/
│       │   ├── request/route.ts      POST email → send magic link
│       │   ├── verify/route.ts       GET ?token= → set cookie → redirect /lobby
│       │   └── logout/route.ts       POST → delete session → redirect /login
│       ├── games/
│       │   ├── route.ts              GET user's active games, POST create (with optional guestName)
│       │   ├── [id]/route.ts         GET game state (polled by spectators), DELETE leave/cancel
│       │   ├── [id]/join/route.ts    POST join game
│       │   └── [id]/state/route.ts  PATCH update match state; calls finishTournamentMatch when winner set
│       └── tournaments/
│           ├── route.ts              GET my tournaments, POST create
│           ├── [id]/route.ts         GET tournament, DELETE cancel (creator only)
│           ├── [id]/join/route.ts    POST join via invite link
│           ├── [id]/start/route.ts   POST start (creator only) → generates matches
│           └── [id]/matches/[matchId]/start/route.ts  POST → creates game, returns gameId
├── components/
│   ├── lobby/
│   │   ├── LobbyPage.tsx            Client: create + tournament + history buttons; fixed history shortcut
│   │   ├── CreateGameForm.tsx        Client: modal config form; invite or local (guest name) mode
│   │   └── OpenGames.tsx            Client: polls /api/games every 5s; Rejoin/Leave buttons
│   ├── history/
│   │   └── HistoryPage.tsx          Client: game history list + tournament history + aggregate stats
│   ├── tournament/
│   │   ├── CreateTournamentForm.tsx  Modal: name, format, game config, max players, season halves
│   │   ├── TournamentBracket.tsx     Single-elim bracket (rounds as columns, match cards)
│   │   ├── TournamentStandings.tsx   Round-robin standings table + match list (grouped by half)
│   │   └── YourTournaments.tsx       Lobby section: active + recently finished tournaments
│   ├── setup/SetupScreen.tsx         Mode picker, player names, format (offline mode)
│   ├── match/
│   │   ├── MatchScreen.tsx           Wires engine to UI; owns toast + leg overlay
│   │   ├── PlayerPanel.tsx           Big remaining number, avatar, dart slots, live avg
│   │   └── Keypad.tsx                Multiplier toggle + 1-20 + bull + miss
│   ├── summary/SummaryScreen.tsx     Winner reveal + per-player stats; onBackToTournament prop
│   └── ui/primitives.tsx             Tag, Label, BrandMark
├── lib/
│   ├── scoring.ts                    PURE ENGINE — read this before touching rules
│   ├── checkouts.ts                  Verified 1/2/3-dart finish hint table
│   ├── types.ts                      All shared types (auth, engine, games, tournaments)
│   ├── tournament.ts                 Pure bracket logic: generateMatches, computeStandings, computeRankings, getAdvancementSlot
│   ├── format.ts                     ruleLabel, initials display helpers
│   ├── auth.ts                       getCurrentUser(), SESSION_COOKIE, SESSION_MAX_AGE
│   ├── email.ts                      sendMagicLink() via Resend REST API
│   └── db/
│       ├── index.ts                  Postgres connection (sql singleton)
│       ├── users.ts                  findOrCreateUser, getUserById
│       ├── tokens.ts                 createMagicToken, consumeMagicToken, createSession, getSession, deleteSession
│       ├── games.ts                  createGame, joinGame, getGame, getOpenGames, getMyGames, deleteGame, updateGameState
│       ├── tournaments.ts            createTournament, joinTournament, startTournament, getTournament, getMyTournaments, startTournamentMatch, finishTournamentMatch, deleteTournament
│       ├── history.ts                getGameHistory, getTournamentHistory (server-side stats computation)
│       └── migrations/
│           ├── 001_auth.sql          users, magic_tokens, sessions tables
│           ├── 002_games.sql         games table
│           ├── 003_tournaments.sql   tournaments, tournament_players, tournament_matches tables
│           └── 004_season_halves.sql ALTER tournaments ADD COLUMN season_halves
├── tests/
│   └── scoring.test.ts               24 tests covering all rule branches
├── scripts/
│   ├── migrate.mjs                   Migration runner (idempotent, tracks in migrations table)
│   └── test-email.mjs                Tests Resend API directly
├── caddy/Caddyfile                   Reverse proxy config ({$DOMAIN} env var)
├── public/                           (empty)
├── .github/workflows/ci.yml          Tests + Docker build on push
├── Dockerfile                        Multi-stage Node 20 alpine
├── docker-compose.yml                app + db + caddy
├── .env.example                      All required env vars documented
├── next.config.mjs                   output: "standalone"
├── tailwind.config.mjs               Brand color tokens
├── tsconfig.json                     strict, paths "@/*"
└── vitest.config.ts
```

## Environment variables (all required in production)

```
POSTGRES_PASSWORD=          # DB password
POSTGRES_USER=oche          # default
POSTGRES_DB=oche            # default
DATABASE_URL=               # constructed from above in docker-compose
APP_URL=https://oche.cloud  # used for magic link URLs and cookie secure flag
AUTH_SECRET=                # openssl rand -hex 32
RESEND_API_KEY=             # from resend.com (optional in dev — logs link to console)
RESEND_FROM_DOMAIN=contact.oche.cloud  # Resend-verified sending domain
DOMAIN=oche.cloud           # Caddy domain (NO :80 suffix — breaks HTTPS)
```

## DB migrations

```bash
# Local (Docker running):
docker compose exec app node scripts/migrate.mjs

# On VPS after deploy:
docker compose exec app node scripts/migrate.mjs
```

The script is idempotent. Re-running is safe — already-applied migrations show `✓ already applied`.

## Naming conventions

- **Component files:** `PascalCase.tsx`, one component per file
- **Library files:** `camelCase.ts`
- **Types:** PascalCase, exported from `lib/types.ts` whenever shared
- **Engine functions:** verb-first, pure: `applyDart`, `createMatch`, `computeStats`
- **Boolean fields:** `isDouble`, `hasStarted`, `notStartedYet`
- **Player-indexed arrays:** always `[number, number]` tuples (not maps), index `0 | 1`. Don't loosen this.
- **CSS classes:** `f-display`, `f-mono`, `f-serif` for fonts; `live-dot`, `bang`, `rise`, `dart-in` for animations. All in `globals.css`.

## Game modes — current state

|Mode                            |Status     |Notes                                                                  |
|--------------------------------|-----------|-----------------------------------------------------------------------|
|**X01 / 301 / 501 / 701 / 1001**|✅ shipped  |configurable in/out rules                                              |
|**Straight-out**                |✅ shipped  |any dart finishes                                                      |
|**Double-out**                  |✅ shipped  |must finish on a double; bull counts                                   |
|**Master-out**                  |✅ shipped  |double or triple finishes                                              |
|**Straight-in**                 |✅ shipped  |default                                                                |
|**Double-in**                   |✅ shipped  |mid-turn opening edge case is the gnarliest piece of code in the engine|
|**High-Low**                    |✅ shipped  |each leg, both throw 3 darts, higher total wins                        |
|**Cricket**                     |❌ not built|needs per-number-hit counters; different scoreboard layout             |
|**Around the Clock**            |❌ not built|sequential targets 1→20                                                |
|**Shanghai**                    |❌ not built|hit S+D+T of one number per turn                                       |
|**Killer**                      |❌ not built|usually 3+ players                                                     |

## Roadmap (the user's plan)

- **Phase 0** Setup ✅ done
- **Phase 1** Scoring engine ✅ done with tests
- **Phase 2** Single-device match ✅ done
- **Phase 3** Accounts + lobby + multi-device matches ✅ done and live on oche.cloud
- **Phase 4** Match history / player stats pages ✅ done (`/history` with game list + tournament history + aggregate stats)
- **Phase 5** Tournaments ✅ done (single-elim + round-robin, full-season option, results screen, cancel)
- **Phase 6** Extended player profiles & leaderboards
- **Phase 7** AI vision agent for camera-based auto-scoring (user said "skip this for now")

## What to tackle next

See **[BACKLOG.md](BACKLOG.md)** for the full features backlog. Top candidates:

- **Per-game detail view** — click into a finished game to see leg-by-leg / dart-by-dart breakdown
- **Display names** — `display_name` column on `users` for custom names
- **Leaderboards** — rank players by avg, win rate, 180s, highest checkout
- **Rematch flow** — auto-create a new game with same config after summary

## Things to verify before claiming "done"

When making engine changes:

```bash
npm test           # all 24 should pass; add new tests for new rules
npx tsc --noEmit   # zero errors
```

When making bigger changes:

```bash
npm run build      # full Next.js build must succeed
docker compose up -d --build app
docker compose exec app node scripts/migrate.mjs
```

## Working with the user

- They appreciate clean, terse responses with reasoning shown briefly. Don't over-explain.
- They want code that *works*, not abstractly elegant code. The engine is intentionally a 400-line file rather than 7 small files.
- When they ask for a feature, propose the smallest version that delivers value, then ask if they want extensions.
- They will ask for things in mixed German/English. Reply in their last-message language.
- They review work by playing the app and looking at the UI. **Visual polish matters to them.** The brand has personality (electric green / cream / red on near-black, big condensed display type, italic serif accents like *"game shot."*). Don't strip the personality when refactoring.
- They don't want generic SaaS aesthetics.

## Pitfalls / gotchas a fresh session might hit

1. **`export const dynamic = "force-dynamic"` is required** on `app/(app)/layout.tsx` and any other layout/page that reads cookies via a helper. Without it Next.js 15 caches a build-time redirect-to-login for all users.
2. **Don't break the engine purity.** No `fetch`, `console.log`, or component imports inside `lib/scoring.ts`.
3. **The double-in branch is fragile.** Read existing tests before changing anything in `applyDartX01`. Run all 24 tests after any scoring change.
4. **Player tuples must stay `[T, T]`.** Don't loosen to `T[]`.
5. **Don't refactor the brand styles** to CSS-modules / shadcn / styled-components. Tailwind + inline hex is the explicit choice.
6. **`db.json(value as never)`** is the pattern for passing typed objects (GameConfig, Match) to porsager/postgres's `json()` helper — the strict JSONValue type doesn't accept our tupled interfaces.
7. **`node_modules/postgres` must be copied in the Dockerfile** — Next.js standalone output doesn't include it automatically. See the `COPY --from=builder` lines.
8. **Cookie `secure` flag**: use `appUrl.startsWith("https://")`, not `NODE_ENV === "production"`.
9. **`DOMAIN` env var for Caddy**: never add `:80` suffix — that forces HTTP-only and breaks Let's Encrypt.
10. **When adding a new game mode**: extend `GameMode` in types, add `applyDart<Mode>` in scoring, route from `applyDart`, add tests, add UI option in `CreateGameForm`, add mode-specific rendering in `MatchScreen`.
11. **Tournament bracket logic is pure** (`lib/tournament.ts` — no I/O). Same principle as the scoring engine. DB operations live in `lib/db/tournaments.ts`.
12. **`finishTournamentMatch` is a no-op** if the game_id doesn't appear in `tournament_matches` — safe to call unconditionally from the game state route.
13. **Round-robin halves use the `round` column**: round=1 = first half, round=2 = second half (reversed home/away). The `season_halves` column on `tournaments` controls whether round 2 is generated.
14. **Tournament `getMyTournaments` includes finished ones up to 7 days old** — ordered active first, finished last. LIMIT 15.
