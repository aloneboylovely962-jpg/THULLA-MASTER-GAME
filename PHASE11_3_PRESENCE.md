# Phase 11.3 — Accepted Friends + Global Presence

## Backend contract
- Accepted friendship is represented by a `friend_requests` row with `status='accepted'`.
- Global presence is derived from authenticated live game WebSocket connections.
- Presence is ephemeral and intentionally not stored as permanent user state.
- Offline is returned after disconnect; stale entries are pruned.

## API contract to expose
- `GET /api/friends` — authenticated accepted friends with `online` boolean.
- `GET /api/friends/presence` — authenticated accepted-friend presence snapshot.

## Security
Only accepted friends are returned. Users cannot query global presence for arbitrary players.
