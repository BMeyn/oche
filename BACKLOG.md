# Features Backlog

Ideas and planned features for OCHE, roughly grouped by area. Not prioritised top-to-bottom — pick whatever feels right next.

-----

## Match history & stats (Phase 4)

- [x] **Match history page** — `/history` listing finished games with per-game stats (avg, 180s, best finish, W/L, legs). Aggregate stats bar at top (games, win rate, avg, 180s). Also shows finished tournament history with rank.
- [x] **Player stats** — aggregate stats shown on `/history`: total games, win rate, 3-dart avg, 180s, best finish callout.
- [ ] **Per-game detail view** — click into a finished game to see full leg-by-leg breakdown, dart-by-dart replay data.

## Tournaments (Phase 5)

- [x] **Single-elimination bracket** — create tournament, auto-seed players (random shuffle), generate bracket with byes, advance winners automatically after each match.
- [x] **Tournament lobby / bracket view** — live bracket visualisation (rounds as columns), standings for round-robin, 5s polling, waiting/active/finished views.
- [x] **Round-robin format** — all N×(N-1)/2 matches generated at start, all ready simultaneously. Optional "Full season" mode plays home + away (each pair twice).
- [x] **Finished tournament results** — champion moment screen, final standings table with rank (gold/silver/bronze), win%, elimination label. Tournaments visible for 7 days after finishing.
- [x] **Cancel tournament** — creator can cancel (with confirm step) in waiting or active state.
- [ ] **Host can add users** — tournament host can add/invite players to the tournament directly (currently invite-link only).

## Player profiles & leaderboards (Phase 6)

- [ ] **Display names** — users currently identified by email prefix. A `display_name` column on `users` would allow custom names without changing the email.
- [ ] **Player profile page** — `/player/[id]` showing match history, stats, recent form.
- [ ] **Leaderboards** — rank players by avg, win rate, 180s, highest checkout, etc.

## Additional game modes

- [ ] **Cricket** — needs per-number-hit counters; different scoreboard layout.
- [ ] **Around the Clock** — sequential targets 1 → 20.
- [ ] **Shanghai** — hit S+D+T of one number per turn.
- [ ] **Killer** — usually 3+ players; needs multi-player support first.

## Match flow improvements

- [ ] **Rematch flow** — after summary, "Rematch" auto-creates a new game with same config and sends both players back.
- [ ] **Checkout suggestions** — show possible finishes on the scoreboard when remaining is ≤ 170.
- [ ] **Undo across turns** — currently undo works within a turn; allow undoing the previous completed turn.

## UX & polish

- [ ] **Sound effects** — subtle audio feedback on dart entry, bust, game shot.
- [ ] **Animations** — leg-win celebration, 180 special effect.
- [ ] **Offline / PWA** — service worker for local play without internet.
- [ ] **Dark / light theme toggle** — currently dark-only.

## Infrastructure

- [ ] **WebSocket sync** — replace polling with WebSockets for instant multi-device updates.
- [ ] **AI vision agent** — camera-based auto-scoring (Phase 7, deferred).
