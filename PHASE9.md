# Phase 9 — Shared Game Engine & Complete Rule Validation

## 9.1 Shared rules boundary
- Keep card, dealing, legality, turn and winner rules in `src/game/engine.ts` as the canonical game-rule module.
- Client-side code may use the engine for presentation/optimistic validation, but the Netlify API remains authoritative for multiplayer state.

## 9.2 Complete rule validation
- 52-card deck integrity and uniqueness
- 3–5 player validation
- Deal integrity
- Starting player (`2-clubs`)
- Follow-suit enforcement
- Highest lead-suit trick winner
- Turn ownership and card ownership
- Final trick / Bhabhi outcome
- Invalid and stale actions

## 9.3 Release gate
- `npm test` must pass.
- `npm run build` must pass.
- Netlify Functions syntax must pass.
- Live multiplayer acceptance remains a separate manual gate.

## Status
Phase 9 roadmap initialized. Existing automated game-rule coverage is retained and will be expanded while the server/client rule boundary is consolidated.
