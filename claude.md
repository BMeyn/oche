# CLAUDE.md

Onboarding for a fresh Claude session on this codebase. Read this top to bottom before making changes.

-----

## What this is

**OCHE** — a self-hosted darts scoring webapp. Two players step up to a tablet/phone, pick a game mode, and tap their darts in. The app handles all the maths: bust detection, double-out checkout validation, leg/match completion, live 3-dart averages, checkout suggestions.

**Tagline:** *Three darts. Zero math.*

The user is building this for themselves and friends (likely a small darts community). They’ll deploy it on their own VPS via Docker. They are not a beginner but appreciate clean explanations and pragmatic choices.

The user communicates in a mix of English and German (“Weiter” = “continue”). Reply in whichever language they used in their last message; default to English.

## Where the project is now

**V1 ships per-dart scoring for two players on one device.** No accounts, no persistence, no network features. All match state lives in React. Refresh = lose the match.

Everything is wired up, tests pass, the project builds, and the Docker stack is ready to deploy. The user has a tarball but has **not yet pushed to GitHub or deployed to their VPS** as of the last session.

What’s verified working:

- 24/24 Vitest tests pass on the scoring engine
- `next build` succeeds with standalone output (~150MB final Docker image)
- `tsc --noEmit` reports zero type errors

## Tech stack & why

|Choice                                   |Why                                                                                                                                            |
|-----------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
|**Next.js 15 App Router + React 19**     |User wanted a real web app, not a static page. App Router because it’s the current default and we’ll need server routes when persistence lands.|
|**TypeScript strict**                    |Scoring rules are subtle (bust on 1, double-in mid-turn, master-out) — types catch entire categories of bugs.                                  |
|**Tailwind 3**                           |Already styled the artifact this way. Custom design tokens in `tailwind.config.mjs` matching the brand palette.                                |
|**Vitest**                               |Engine is pure functions; Vitest runs them fast without a browser.                                                                             |
|**Postgres 16 (Docker, self-hosted)**    |User explicitly chose self-hosted over Supabase. Container is up but **inert in V1** — no schema, no queries. Will be used in Phase 3.         |
|**Caddy 2**                              |Single-binary reverse proxy with automatic Let’s Encrypt. User deploys with IP only now; flipping `DOMAIN` env var enables HTTPS.              |
|**`postgres` (porsager)**                |Lightweight Postgres client. Picked over Prisma because we don’t need a heavy ORM for what’s essentially a few tables.                         |
|**`output: "standalone"` in next.config**|Cuts Docker image to ~150MB instead of ~500MB+.                                                                                                |

## Architecture decisions (the non-obvious ones)

### The scoring engine is pure and lives in `lib/scoring.ts`

No React, no DOM, no I/O. Just functions: `createMatch`, `applyDart`, `undoLastDart`, `displayRemaining`, `computeStats`. This is **the most important architectural choice in the project.** It means:

- The engine is fully unit-testable without rendering anything
- It can move to a server route, a worker, or a different framework with zero changes
- The future AI vision agent calls the same `applyDart` the keypad does — agent and human inputs share one source of truth

If you’re tempted to put scoring logic in a component, **don’t.** Add it to `lib/scoring.ts` with tests.

### Per-dart entry, not per-turn

Earlier iterations took a turn total (e.g. “60”) as input. The user explicitly asked to switch to per-dart entry because:

1. It enables real per-dart stats (triples, doubles, bulls, misses)
1. It removes mental arithmetic at the oche
1. It’s the input shape an AI agent would naturally produce

Each `Dart = { multiplier: 1|2|3, number: 0..20 | 25, score, label }`.
A `Turn` is `{ darts: Dart[1..3], total, kind: "ok"|"bust"|"win", ... }`.

### `hasStarted` for double-in is committed at turn end, not mid-turn

Early bug: when a player opened with `[S5, D10, S20]` under double-in rules, the engine committed `hasStarted = true` after D10 (mid-turn), then on the third dart took the wrong branch on finalization, counting all three darts. **Fix:** `hasStarted` only flips to `true` when the turn ends. Mid-turn detection uses `inProgress.some(isDouble)`. See `lib/scoring.ts` `applyDartX01` and the test “starts on first double; subsequent darts count”.

### Two dart-count metrics: `dartsCount` and `countedDartsCount`

Under double-in, a player can throw 3 darts that all “miss” the opening double. Those darts physically existed but don’t count toward the 3-dart average. `dartsCount` = physical, `countedDartsCount` = counted toward stats. The 3-dart average uses `countedDartsCount`.

### High-Low is a separate `applyDart` branch

Different game modes have fundamentally different turn structures (X01 = race to zero, High-Low = best-of-three darts, Cricket would be per-number counters). Rather than parameterizing one mega-function, `applyDart` dispatches to `applyDartX01` or `applyDartHighLow`. Adding Cricket later means adding `applyDartCricket` alongside.

### The DB is up but unused in V1

Postgres runs in `docker-compose.yml`, `lib/db/index.ts` reads `DATABASE_URL`, but nothing queries it yet. Why include it now? Because **changing the running stack on a VPS is more painful than starting with the right one.** When Phase 3 lands we just write migrations and start using the connection that’s already there.

### IP-only deployment with HTTPS-ready Caddyfile

User has no domain yet. Caddyfile uses `{$DOMAIN}` which falls back to `:80`. When they get a domain they edit one env var and `docker compose up -d caddy`. Caddy handles Let’s Encrypt automatically — no certbot, no nginx config gymnastics.

### Single-file artifact → modular files

Earlier sessions iterated inside Claude artifacts (single-file React). When moving to a real project we split it apart:

- One component per file under `components/`
- Engine logic into `lib/`
- Types into `lib/types.ts`

Don’t recombine these.

## Folder structure

```
oche/
├── app/                              Next.js App Router
│   ├── layout.tsx                    Root layout, font loading, body class
│   ├── page.tsx                      View orchestrator: setup → match → summary
│   └── globals.css                   Tailwind directives + custom keyframes
├── components/
│   ├── setup/SetupScreen.tsx         Mode picker, player names, format
│   ├── match/
│   │   ├── MatchScreen.tsx           Wires engine to UI; owns toast + leg overlay
│   │   ├── PlayerPanel.tsx           Big remaining number, avatar, dart slots, live avg
│   │   └── Keypad.tsx                Multiplier toggle + 1-20 + bull + miss
│   ├── summary/SummaryScreen.tsx     Winner reveal + per-player stats
│   └── ui/primitives.tsx             Tag, Label, BrandMark
├── lib/
│   ├── scoring.ts                    PURE ENGINE — read this before touching rules
│   ├── checkouts.ts                  Verified 1/2/3-dart finish hint table
│   ├── types.ts                      Match, Leg, Turn, Dart, PlayerStats, ...
│   ├── format.ts                     ruleLabel, initials display helpers
│   └── db/
│       ├── index.ts                  Postgres connection (idle in V1)
│       └── migrations/               (empty — schema lands in Phase 3)
├── tests/
│   └── scoring.test.ts               24 tests covering all rule branches
├── caddy/Caddyfile                   Reverse proxy config
├── scripts/migrate.mjs               Migration runner (no migrations to run yet)
├── public/                           (empty — favicons etc. land here)
├── .github/workflows/ci.yml          Tests + Docker build on push
├── Dockerfile                        Multi-stage Node 20 alpine
├── docker-compose.yml                app + db + caddy
├── .env.example                      POSTGRES_PASSWORD + DOMAIN
├── .dockerignore
├── .gitignore
├── next.config.mjs                   output: "standalone"
├── tailwind.config.mjs               Brand color tokens
├── postcss.config.mjs
├── tsconfig.json                     strict, paths "@/*"
├── vitest.config.ts
├── package.json
└── README.md                         User-facing deploy guide
```

## Naming conventions

- **Component files:** `PascalCase.tsx`, one component per file
- **Library files:** `camelCase.ts` or `kebab-case.ts` (we use camelCase: `scoring.ts`, not `scoring-engine.ts`)
- **Hook files (when added):** `useThing.ts`
- **Types:** PascalCase, exported from `lib/types.ts` whenever shared
- **Engine functions:** verb-first, pure: `applyDart`, `createMatch`, `computeStats`
- **Boolean fields:** `isDouble`, `hasStarted`, `notStartedYet`
- **Player-indexed arrays:** always `[number, number]` tuples (not maps), index `0 | 1`. Don’t loosen this — the type-level guarantee catches off-by-ones.
- **Color values in components:** still inlined as hex strings (e.g. `"#d4ff3a"`) where Tailwind classes weren’t enough. We could centralize but haven’t yet — fine for now.
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

## Roadmap (the user’s plan)

The user and I drafted a phased plan earlier. Current status:

- **Phase 0** Setup ✅ done (this is what’s in the tarball)
- **Phase 1** Scoring engine ✅ done with tests
- **Phase 2** Single-device match ✅ done
- **Phase 3** Accounts + match persistence ⏳ next up
- **Phase 4** Live multi-device matches (one scorer, many spectators)
- **Phase 5** Tournaments (single-elim brackets first)
- **Phase 6** Player profiles & historical stats
- **Phase 7** AI vision agent for camera-based auto-scoring (user explicitly said “skip this for now”)

## What to tackle next (Phase 3 detail)

When the user is ready for Phase 3:

1. **Schema design** — `users`, `matches`, `legs`, `turns` tables. Turns store the full dart array as JSONB so we don’t lose granularity. Probably a `match_config` JSONB column too rather than 8 nullable rule columns.
1. **Auth** — Keep it simple. Magic-link email or even just a name+PIN to start. The user is hosting for themselves and friends, not the public; Auth.js or Lucia both work.
1. **Save-on-completion** — Easiest first step: save matches when they end (in `SummaryScreen`’s effect). Persisting in-progress matches is a Phase 4 problem.
1. **Match history page** — `/history` listing past matches with click-through to the summary.
1. **Migration** — Drop `001_initial.sql` into `lib/db/migrations/`, run via `npm run db:migrate` (script already exists, just needs migrations to find).

**Don’t do Phase 3 work without asking the user first.** They might want to play with V1 on their VPS first.

## Things to verify before claiming “done”

When making engine changes:

```bash
npm test           # all 24 should pass; add new tests for new rules
npx tsc --noEmit   # zero errors
```

When making bigger changes:

```bash
npm run build      # full Next.js build must succeed
```

Optional but useful:

```bash
docker build -t oche:test .   # confirms the Dockerfile still works
```

## Working with the user

- They appreciate clean, terse responses with reasoning shown briefly. Don’t over-explain.
- They want code that *works*, not abstractly elegant code. The engine is intentionally a 400-line file rather than 7 small files.
- When they ask for a feature, propose the smallest version that delivers value, then ask if they want extensions.
- They will ask for things in mixed German/English. Reply in their last-message language.
- They review work by playing the app and looking at the UI. **Visual polish matters to them.** The brand has personality (electric green / cream / red on near-black, big condensed display type, italic serif accents like *“game shot.”*). Don’t strip the personality when refactoring.
- They don’t want generic SaaS aesthetics — see the original brief for the look they’re going for.

## Pitfalls / gotchas a fresh session might hit

1. **Don’t add `localStorage` or `sessionStorage`.** This is a Next.js app, not a Claude artifact — it’s allowed in real Next.js. But the user hasn’t asked for it. State currently lives in React only; that’s fine for V1.
1. **Don’t break the engine purity.** No `Date.now()`, `fetch`, `console.log`, or component imports inside `lib/scoring.ts` (one exception: `Date.now()` for `startedAt`/`endedAt` timestamps, which is acceptable).
1. **The double-in branch is fragile.** Read the existing tests before changing it. If you change anything in `applyDartX01`, run all 24 tests and add new ones.
1. **Player tuples must stay `[T, T]`.** Don’t loosen to `T[]`. The fixed-size tuple is what makes the player-index types check.
1. **Don’t refactor the brand styles to a CSS-modules / shadcn / styled-components setup.** Tailwind + a few inline hex values is the explicit choice.
1. **When adding a new game mode**, follow the existing pattern: extend `GameMode` in types, add `applyDart<Mode>` in scoring, route from `applyDart`, add tests, add UI option, add mode-specific rendering in `MatchScreen` if needed.
1. **The Postgres container is up but unused.** Don’t be surprised. Don’t write queries for it yet unless we’re explicitly in Phase 3.
1. **Caddy is in the stack but not strictly required for V1.** If the user just wants to run `next dev`, they don’t need Docker at all. Docker is for the VPS deploy.

## Recent session history (for context)

The user and I went through several iterations:

1. **Design showcase** — built a marketing-style multi-screen artifact showing the brand vision (hero, live match, AI agent, tournament bracket, profile). This established the look.
1. **Step-by-step plan** — drafted 7-phase roadmap (above).
1. **First playable V1** — turn-total entry. User pushed back: “I’d need to calculate scores myself; per-dart would be better and unlock stats.”
1. **Per-dart V1** — switched to per-dart input with double/triple multipliers.
1. **More modes + live averages** — user asked for multiple game modes (single-out / double-out / others) and live averages during the match.
1. **Production scaffold** — converted artifact into a real Next.js project with Docker. **This is where we are now.**

The user has not yet:

- Pushed to GitHub
- Deployed to their VPS
- Played a real match on the deployed app

So the next likely user request is “I deployed it and X is broken” or “I played a leg, here’s a UX issue” — be ready to debug deployment or UX, not just write more features.