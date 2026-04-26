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
- [x] **Host can add friends** — tournament host can invite friends directly from the waiting room (friend must be accepted contact). Invited players see the tournament in their lobby.

## Player profiles & leaderboards (Phase 6)

- [x] **Display names** — `display_name` + `avatar_color` columns on `users`. Custom names shown everywhere (match, lobby, tournaments, history). Settings page at `/settings` to update name + pick colour.
- [x] **Avatar component** — coloured square with initials, used in lobby header, settings, friend cards, match client.
- [x] **Friends system** — send/accept/decline/remove friend requests by email. Friend list in `/settings` with head-to-head stats (games played, win rate). Notification badge on avatar when pending requests exist.
- [x] **Friend leaderboard** — in `/settings`, table of friends + current user ranked by win rate.
- [x] **Friend quick-invite in match** — when waiting for opponent, creator sees friends list with per-friend "Copy link" button.
- [ ] **Player profile page** — `/player/[id]` showing match history, stats, recent form.
- [ ] **Global leaderboard** — rank all players by avg, win rate, 180s, highest checkout.

## Additional game modes

- [ ] **Cricket** — needs per-number-hit counters; different scoreboard layout.
- [ ] **Around the Clock** — sequential targets 1 → 20.
- [ ] **Shanghai** — hit S+D+T of one number per turn.
- [ ] **Killer** — usually 3+ players; needs multi-player support first.

## Match flow improvements

- [ ] **Rematch flow** — after summary, "Rematch" auto-creates a new game with same config and sends both players back.
- [x] **Checkout suggestions** — smart finish hints shown in the scoring UI (up to 170, 1/2/3-dart combos from `lib/checkouts.ts`).
- [ ] **Undo across turns** — currently undo works within a turn; allow undoing the previous completed turn.
- [ ] **Per-game detail view** — click into a finished game to see full leg-by-leg breakdown, dart-by-dart replay data.

## UX & polish

- [ ] **Sound effects** — subtle audio feedback on dart entry, bust, game shot.
- [ ] **Animations** — leg-win celebration, 180 special effect.
- [ ] **Offline / PWA** — service worker for local play without internet.
- [ ] **Dark / light theme toggle** — currently dark-only.

## UX & polish

- [ ] **Sound effects** — subtle audio feedback on dart entry, bust, game shot.
- [ ] **Leg-win animation** — celebration effect when a leg is won.
- [ ] **Offline / PWA** — service worker for local play without internet.

## Infrastructure

- [ ] **WebSocket sync** — replace polling with WebSockets for instant multi-device updates.
- [ ] **AI vision agent** — camera-based auto-scoring (Phase 7, deferred).

## Done this session

- [x] **Landing page** — full-width scroll-based marketing page at `/` with hero CTA (email form inline), feature cards (Tournaments / Live Stats / Friends), game-modes strip, how-it-works, second CTA, footer. SEO: Open Graph, Twitter card, canonical URL, JSON-LD SoftwareApplication schema.
- [x] **Feedback button** — floating "Feedback" button on all app pages (lower-left). Sends bug reports / feature requests by email (Resend) in production; logs to console locally.
- [x] **AVG display improved** — moved from tiny header text to large display font next to the remaining score in PlayerPanel.
