# Phase 6 — Match History, Leaderboard & Anti-Cheat

Implemented on `phase-6-history-leaderboard-anticheat`.

## Persistent data

- `matches` records completed games.
- `match_players` records each authenticated participant's finishing position, coin delta and XP delta.
- Existing `users` statistics are updated only by the authoritative server when a game reaches `finished`.

## API

- `GET /api/leaderboard` — top 100 players ranked by wins, then XP, then games played.
- `GET /api/matches` — authenticated player's last 50 match records.
- Existing `GET /api/profile` remains available for current stats.

## Anti-cheat validation

Every card play is validated on the server before changing game state:

1. Game must be active.
2. Player must own the requested card.
3. It must be that player's turn.
4. Follow-suit rules are checked against the server's private hand.
5. The server removes the card and advances the authoritative turn.
6. The server resolves each trick and determines the final loser.
7. Client messages cannot directly award coins, XP, wins or losses.

## Production note

PostgreSQL must be configured with `DATABASE_URL` before persistent match history and leaderboard data are enabled. Without a database, the multiplayer server can still run, but Phase 6 persistence endpoints return a configuration error.
