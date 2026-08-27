# Phase 8 — Stability & Security

## 8.1 Multiplayer concurrency & room-state protection
- Use strong Netlify Blobs consistency for room reads/writes.
- Validate the full authoritative state on every action.
- Reject stale/invalid turn actions server-side.
- Correct room cleanup when the last player leaves.
- Keep all card ownership and turn transitions server-authoritative.

## Remaining Phase 8
- 8.2 Rate limiting and abuse controls
- 8.3 Session hardening
- 8.4 Automated game-rule tests
- 8.5 Reconnect/edge-case test coverage
- 8.6 Dependency lockfile and CI verification
- 8.7 Production stress testing
