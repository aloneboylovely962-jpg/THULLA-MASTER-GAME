# Phase 10.3 — Centralized Mobile Home

Status: IMPLEMENTED

## Delivered
- Portrait-first centralized home/lobby surface.
- Player identity, level, XP, wins, games and coin balance at the top.
- Primary **Play Online** action connected to the real `create_room` endpoint.
- Private room join with validated 6-digit code connected to `join_room`.
- Match History entry point reserved for the existing history flow.
- Friends, Daily Rewards and Coin Shop are surfaced as roadmap entries without pretending they are implemented yet.
- Responsive card-grid layout for mobile and desktop.
- Server connection indicator and lightweight toast feedback.
- Existing multiplayer room/table remains the underlying game experience after a room is created or joined.

## Guardrails
- No fake coin balance or fake online status is persisted by this phase.
- No purchase flow is introduced here; economy/payment belongs to later phases.
- Existing authenticated account and server-authoritative room APIs are reused.

## Next
Phase 10.4: home navigation/profile polish and production-grade transition states.