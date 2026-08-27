# Phase 11.2 — Friend Requests Management

Implemented as a safe backend contract layer pending wiring into the existing server router.

## Required authenticated operations
- List incoming/outgoing pending requests.
- Accept incoming request.
- Reject incoming request.
- Cancel outgoing request.

## State model
`pending -> accepted` or `pending -> rejected/cancelled`.

All transitions must be authorized against the authenticated user and performed transactionally. Existing friendships must remain idempotent and duplicate pending requests must be prevented.

## UI requirements for the next integration step
- Friends screen with Requests tab.
- Incoming request cards with Accept/Reject.
- Outgoing request cards with Cancel.
- Pending badge on Friends navigation.
- Loading, empty and error states.
