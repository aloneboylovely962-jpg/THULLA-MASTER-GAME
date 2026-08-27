# Phase 10.1 — Player Profile & Identity

Implemented as the first Production UX milestone of Phase 10.

## Scope
- Dedicated player profile panel accessible from the main lobby.
- Shows display name, @username, player ID, level, XP, coins, wins, losses and games played.
- Shows win rate and progression-to-next-level.
- Provides a compact profile summary in the lobby.
- Keeps account/authentication server-authoritative.
- Uses existing `/api/auth/me` profile data; no duplicate profile database is introduced.
- Mobile-friendly modal/panel layout and keyboard-friendly controls.

## Acceptance criteria
- Profile can be opened and closed without leaving the lobby.
- Player identity is clearly distinguishable by display name and username.
- Stats are read from the authenticated server profile.
- No password/session token is exposed in the UI.
- Existing room creation/joining and gameplay flows remain unchanged.
