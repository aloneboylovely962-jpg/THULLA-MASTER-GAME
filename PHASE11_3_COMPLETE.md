# Phase 11.3 — Friends List + Real Presence

## Completed
- Accepted-friends data contract.
- Authenticated friends/presence client.
- Real online/offline state is derived from live authenticated WebSocket presence.
- Presence is ephemeral and stale entries are pruned.
- Friend request actions remain server-authorized.
- No fake online users or mock friend records.

## Verification note
The repository connector does not execute the project's CI/build locally. GitHub Actions must be used as the final build/test gate. This phase is functionally implemented, but should not be called CI-PASS until the workflow reports success.
