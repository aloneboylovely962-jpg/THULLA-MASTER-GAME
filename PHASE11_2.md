# Phase 11.2 — Friend Requests Management

## Status
Implemented as the social API foundation.

## Scope
- Accept an incoming friend request.
- Reject an incoming friend request.
- Cancel an outgoing pending request.
- List incoming and outgoing pending requests for the authenticated player.
- Prevent acting on another user's request.
- Preserve idempotent request state transitions.

## API contract
- `GET /api/friends/requests` — pending incoming/outgoing requests.
- `POST /api/friends/requests/:id/accept` — accept an incoming request.
- `POST /api/friends/requests/:id/reject` — reject an incoming request.
- `POST /api/friends/requests/:id/cancel` — cancel an outgoing request.

The UI can consume these authenticated endpoints in the next social screen work without using mock request data.
