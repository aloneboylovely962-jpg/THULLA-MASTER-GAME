# THULLA MASTER — Production Roadmap

## Phase 8 — Stability & Security
- Fix room lifecycle bugs
- Add request/action idempotency
- Reduce multiplayer race-condition risk
- Add API abuse/rate-limit protection
- Harden sessions and input validation
- Add automated game-rule tests

## Phase 9 — Shared Game Engine
- Make `src/game/engine.ts` the single rules source
- Remove duplicated server game rules
- Add deterministic rule tests for 3/4/5 players
- Verify dealing, turns, follow-suit, tricks and Bhabhi outcome

## Phase 10 — Production UX
- Profile screen
- Match history screen
- Leaderboard screen
- Better reconnect/loading/error states
- Mobile touch/animation polish
- Accessibility pass

## Phase 11 — Production Deployment
- Pin dependencies and generate lockfile
- Verify GitHub Actions build
- Verify Netlify Functions build
- Verify Netlify Blobs persistence
- Test registration/login/logout
- Test 3-player multiplayer end-to-end
- Test 4-player and 5-player rooms
- Test refresh/reconnect/leave

## Phase 12 — Release
- Final security audit
- Final gameplay audit
- Performance audit
- Remove/label legacy deployment files
- Merge release branch into `main`
- Verify Netlify production deployment
- Smoke-test live production URL
- Tag v1.0.0
