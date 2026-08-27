# Phase 11.4 — Friend → Room Invite

Implemented:
- Authenticated `POST /api/rooms/:roomCode/invites`.
- Authenticated `GET /api/invites`.
- Accept / reject / cancel invite endpoints.
- Only accepted friends can be invited.
- Room must exist, be in lobby, and have a free seat.
- Invite expires after 2 minutes.
- WebSocket `room_invite` notification to authenticated recipient sockets.
- Friends list gets an Invite action when a six-digit room is active.
- Incoming invite notification with Accept action.
- Accept returns the room code and fills the lobby room-code input when available.
- Friend API exports fixed so the Friends panel build imports are valid.

Verification:
- GitHub CI was triggered for the server wiring commit. Final CI must be green on the latest branch head before calling this phase CI-PASS.
