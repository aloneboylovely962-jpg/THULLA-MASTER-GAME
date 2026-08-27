# Phase 11.1 — Player ID Lookup & Friend Request Foundation

## Status
Implemented.

## Delivered
- Authenticated player lookup by exact username or UUID Player ID.
- No password/session token is exposed in lookup results.
- Self-lookup is rejected for friend requests.
- Persistent `friend_requests` table with sender/recipient/status/timestamps.
- Duplicate/pending requests are prevented.
- Existing accepted friendship is detected.
- Friend request API foundation is ready for the Phase 11.2 request-management UI.
- Input is normalized and bounded before database queries.

## API
- `GET /api/players/:query` — authenticated exact lookup.
- `POST /api/friends/requests` — authenticated request creation.

## Security
- All endpoints require a valid authenticated session.
- UUID/username formats are validated.
- Database constraints prevent duplicate pending requests.
- Responses expose only public player identity fields.
