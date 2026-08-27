# THULLA MASTER — Final Product Roadmap

This roadmap replaces feature-by-feature guessing with a complete mobile-first production plan. The uploaded gameplay video is used only as UX inspiration; THULLA MASTER keeps its own branding, assets and game identity.

## Phase 10 — Core Game Experience
### 10.1 Player Identity
- Login/register
- Unique private Player ID
- Username/display name
- Profile, level, XP and coins

### 10.2 Match History
- Completed matches
- Win/loss result
- Opponents and player count
- Date/time
- XP/coin result

### 10.3 Centralized Lobby
- Mobile-first home screen
- Play Now
- Create Private Room
- Join by room code
- Friends entry point
- Coins/profile HUD
- Daily reward entry point

## Phase 11 — Social & Multiplayer
### 11.1 Friends
- Search by Player ID
- Friend requests
- Accept/reject/remove
- Online/offline presence
- Invite to room

### 11.2 Matchmaking & Rooms
- Public matchmaking
- Private rooms
- 3-player, 4-player and 5-player rooms
- Ready/host controls
- Room persistence
- Rejoin after refresh

### 11.3 Realtime Reliability
- Authoritative server state
- Reconnect/resume
- Heartbeats
- Duplicate-action protection
- Graceful disconnect handling

## Phase 12 — Authentic Card Gameplay
### 12.1 Rules
- `src/game/engine.ts` remains the single rules source
- 52-card deck/deal validation
- **A♠ (Hukam ka A) starts the first trick**
- Player holding A♠ is the opening player
- Follow-suit enforcement
- Trick winner calculation
- Bhabhi/loser detection
- 3/4/5 player deterministic tests

### 12.2 Table UI
- Central felt table
- Realistic card proportions
- Four-seat primary layout
- Five-player room support
- Player avatars around table
- Turn indicator
- Center trick pile
- Card fan/selection
- Deal/play/win animations
- Sound and haptic feedback where supported

### 12.3 Match Flow
- Room → ready → deal → play → tricks → Bhabhi/result
- Result screen
- Rematch
- Return to lobby
- Match history write

## Phase 13 — Progression & Economy
### 13.1 Coins
- Server-authoritative wallet
- Earn/spend rules
- Transaction ledger
- Balance validation
- Zero-coin state

### 13.2 Rewards
- Daily reward
- XP progression
- Win streaks
- Achievements
- Reward feedback/animations

### 13.3 Purchases
- Coin packages
- Google Play Billing integration for Android app
- Server-side purchase verification
- Duplicate/replay protection
- Restore handling

## Phase 14 — Competitive & Social UX
### 14.1 Leaderboards
- Global leaderboard
- Weekly/monthly views
- Player rank
- Win rate/streak metrics

### 14.2 Social Layer
- Emotes
- Quick chat
- Friend invites
- Player report/block flow

### 14.3 Personalization
- Avatar/profile customization
- Table themes
- Card-back themes
- Unlockable cosmetics

## Phase 15 — Production Quality
### 15.1 Mobile Polish
- Portrait-first responsive layout
- Safe-area handling
- One-hand touch controls
- Large tap targets
- Smooth animations
- Reduced-motion support

### 15.2 States & Errors
- Loading screens
- Offline screen
- Reconnecting overlay
- Server maintenance state
- Friendly validation errors
- Retry actions

### 15.3 Accessibility
- Keyboard navigation
- Screen-reader labels
- Contrast checks
- Focus states
- Reduced motion

## Phase 16 — Security & Backend Hardening
- Authentication/session hardening
- Server-side validation of every game action
- Rate limiting
- Idempotency keys
- Abuse protection
- Wallet/coin integrity
- Purchase verification
- Audit logging
- No secrets in client

## Phase 17 — Deployment & Real Device QA
- Pin dependencies and lockfile
- GitHub Actions build/test
- Netlify Functions build
- Persistence verification
- Registration/login/logout test
- 3-player end-to-end test
- 4-player end-to-end test
- 5-player room test
- Refresh/reconnect/leave tests
- Android Chrome test
- iPhone Safari test
- 3–5 simultaneous real devices

## Phase 18 — Release v1.0.0
- Full security audit
- Full gameplay audit
- Performance audit
- Remove/label legacy deployment artifacts
- Production environment verification
- Merge release branch into `main`
- Smoke-test production
- Tag `v1.0.0`
- Freeze core rules before release

## Definition of Done
THULLA MASTER is not considered complete merely because the page loads or deployment is green. Release requires:

1. A real player account and private Player ID.
2. Friends and room/invite flow.
3. Real-time 3/4/5-player multiplayer.
4. A♠/Hukam opening rule enforced by the authoritative engine.
5. Complete match lifecycle and persistent history.
6. Working coin ledger and verified purchases for the supported Android app.
7. Mobile-first centralized game UI.
8. Reconnect/error/accessibility handling.
9. Passing automated tests plus real-device multiplayer testing.
10. Production deployment and v1.0.0 release verification.
