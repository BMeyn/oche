# OCHE

> Three darts. Zero math.

A self-hosted darts scoring webapp. Per-dart entry, automatic checkout maths, multiple game modes (X01 with straight/double/master in & out, plus High-Low). Built with Next.js + TypeScript + Tailwind, runs on Docker.

This is **V1** — single-device match scoring, no auth, no persistence yet. The Postgres container is set up and waiting for the next phase (match history, accounts, tournaments).

---

## Quick start

### Local development

```bash
# 1. Install
npm install

# 2. Run dev server
npm run dev
# → http://localhost:3000

# 3. Run engine tests
npm test
```

### Local Docker (full stack)

```bash
# 1. Create env
cp .env.example .env
# Edit .env and pick a real POSTGRES_PASSWORD

# 2. Build & start
docker compose up -d

# 3. Visit
# → http://localhost
```

The stack runs:

- **app** — Next.js scoring app, port 3000 (internal)
- **db** — Postgres 16 with persisted volume
- **caddy** — reverse proxy on ports 80/443

---

## Deploy to a VPS

Tested with Ubuntu 22.04+ and Debian 12+. You'll need Docker and Docker Compose installed (`apt install docker.io docker-compose-plugin` or follow the [official guide](https://docs.docker.com/engine/install/)).

### 1. Get the code on the server

```bash
ssh you@your-vps
git clone https://github.com/<you>/oche.git
cd oche
```

### 2. Set the env

```bash
cp .env.example .env
# Generate a strong password
openssl rand -base64 24
# Paste it as POSTGRES_PASSWORD in .env
nano .env
```

### 3. Open firewall ports

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 4. Boot the stack

```bash
docker compose up -d
docker compose logs -f       # watch it come up; Ctrl-C to detach
```

Visit `http://<your-vps-ip>` — you should see the OCHE setup screen.

### 5. Adding a domain later (with HTTPS)

When you point a domain at the server:

1. Create a DNS **A record** for `darts.example.com` → your VPS IP. Wait a minute for it to propagate.
2. In `.env`, change:

   ```env
   DOMAIN=darts.example.com
   ```

3. Restart Caddy:

   ```bash
   docker compose up -d caddy
   ```

Caddy will request and renew a Let's Encrypt cert automatically. No other config needed.

---

## Project layout

```
oche/
├── app/                       # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx               # orchestrates setup → match → summary views
│   └── globals.css
├── components/
│   ├── setup/SetupScreen.tsx
│   ├── match/
│   │   ├── MatchScreen.tsx
│   │   ├── PlayerPanel.tsx
│   │   └── Keypad.tsx
│   ├── summary/SummaryScreen.tsx
│   └── ui/primitives.tsx
├── lib/
│   ├── scoring.ts             # pure scoring engine — no React
│   ├── checkouts.ts           # 1/2/3-dart checkout hint table
│   ├── types.ts               # shared TypeScript types
│   ├── format.ts              # display helpers
│   └── db/                    # Postgres connection (unused in V1)
├── tests/
│   └── scoring.test.ts        # 24 Vitest tests on the engine
├── caddy/Caddyfile
├── scripts/migrate.mjs
├── docker-compose.yml
├── Dockerfile
└── .github/workflows/ci.yml
```

The **scoring engine** (`lib/scoring.ts`) is intentionally pure and has no UI dependencies. It can be lifted into a worker, a server endpoint, or a different framework without changes. All match logic — bust detection, double-out, double-in, master-out, leg/match completion, undo — lives there with full type coverage and tests.

---

## Game modes & rules

### X01 (the classic)

- **Starting score:** 301, 501, 701, 1001
- **In rule:** straight (any dart starts) or double-in (must hit a double before any dart counts)
- **Out rule:** straight, double, or master (double-or-triple finishes)

### High-Low

Each leg, both players throw 3 darts. Highest 3-dart total wins the leg. Ties play another round.

---

## Development workflow

### Run tests in watch mode

```bash
npm run test:watch
```

The engine tests cover bust detection, double-out, double-in (with the mid-turn opening edge case), master-out, undo across turn boundaries, and stat computation. Run them before committing scoring changes.

### Adding a new game mode

1. Add the mode ID to `GameMode` in `lib/types.ts`
2. Add an `applyDart<Mode>` function in `lib/scoring.ts`, route it from `applyDart()`
3. Add tests in `tests/scoring.test.ts`
4. Add the option to `SetupScreen.tsx` and any mode-specific UI in `MatchScreen.tsx`

### Pushing changes

```bash
git push origin main
```

CI runs tests and a Docker build on every push. To deploy a new version on the VPS:

```bash
ssh you@your-vps
cd oche
git pull
docker compose up -d --build
```

---

## Roadmap

- **Phase 3** — accounts, match persistence (the DB is already there waiting)
- **Phase 4** — live multi-device matches (one scorer, many spectators) via Postgres LISTEN/NOTIFY or websockets
- **Phase 5** — tournaments (single-elim brackets to start)
- **Phase 6** — player profiles & historical stats
- **Phase 7** — AI vision agent for camera-based auto-scoring

---

## License

Private. Don't redistribute without permission.
