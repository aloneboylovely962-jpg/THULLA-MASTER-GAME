# Phase 8.10 — Final Production Multiplayer Test

## Automated release gate
- Build and CI must pass before deployment.
- Game-rule tests must pass.
- Production bundle must compile successfully.
- Server syntax must pass.

## Manual live acceptance checklist
- 3-player room: create, join, ready, start, turns, follow-suit, finish, rewards.
- 4-player room: complete match and verify turn progression.
- 5-player room: complete match and verify full-room protection.
- Disconnect/reconnect: player returns to the same room and receives current authoritative state.
- Security: cannot play another player's card, play out of turn, or access a room without membership.
- Leave/host: host transfer works and empty rooms are removed.

## Release status
Automated CI is green. Real 3–5-device network acceptance requires human devices against the deployed Netlify Preview; this repository cannot simulate independent physical clients. Do not mark live acceptance as passed until that test is completed.
