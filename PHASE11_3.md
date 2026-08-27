# Phase 11.3 — Friends List & Request UI Integration

## Status
Client integration prepared.

## Delivered
- Authenticated request client for incoming/outgoing friend requests.
- Accept, reject and cancel actions use the authenticated API.
- No mock friend-request records are generated.
- Request errors are surfaced as user-facing errors.
- API base follows the existing `VITE_ACCOUNT_API_URL` configuration.

## Remaining server integration
The existing monolithic `server/index.mjs` must import `server/friends.mjs`, call `ensureFriendsSchema(pool)` during startup, and expose the four request routes before this can be called production-complete.

This checkpoint intentionally avoids replacing the truncated server file and protects the existing multiplayer implementation.
