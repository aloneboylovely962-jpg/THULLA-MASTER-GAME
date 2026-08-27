# THULLA MASTER — Gameplay Video UX Audit

The uploaded reference video was reviewed scene-by-scene. These are product requirements to use as inspiration, not assets or an exact visual copy.

## Additional product points found

### Home / Main Menu
- Player avatar with country/flag indicator.
- Trophy/rank progress meter beside the player identity.
- Two clearly separated primary modes: Classic Mode and Play With Friends.
- Daily Spin entry point.
- Free Rewards entry point.
- Premium/VIP entry point.
- Remove Ads option.
- Friends shortcut.
- Daily Bonus with countdown timer and claim state.
- Invite shortcut with reward affordance.
- Free Coins reward entry point.
- Leaderboard shortcut with season/countdown indicator.
- Shop shortcut.
- Inbox/mail, rules/help and settings icons.
- Notification badges on claimable features.

### Rewards / Retention
- Multi-day Daily Login Bonus calendar.
- Claimed/today/locked reward states.
- Countdown until next daily reset.
- Daily Spin with reward wheel.
- Free coin claim flow.
- Reward claim animation/feedback.
- Streak/retention progression should be server-authoritative.

### Friends / Private Play
- Dedicated Friends screen.
- Online Friends state and empty state.
- Friend invitation CTA.
- Private room code display/share.
- Room capacity shown visually.
- Friend invite from room.
- Private-room currency/ticket concept can be supported as an optional economy item, but must not block free private play unless intentionally configured.

### Matchmaking
- Dedicated matchmaking screen.
- Entry fee displayed before joining.
- Coin/gem balances remain visible.
- Player slots show searching/loading states.
- VS presentation when opponents are found.
- Cancel/back navigation.
- Matchmaking tips while searching.
- Clear insufficient-coins state before charging entry fee.

### Game Table
- Outdoor/tabletop themed board rather than a generic flat web panel.
- Four primary seats around the table.
- Five-player mode must have a clear layout variant.
- Large player avatars and names.
- Player status/connection indicators.
- Center card/trick area.
- Strong active-turn highlight.
- Visible suit/follow-suit instruction.
- Card sorting control.
- Quick emote/chat button.
- Table/menu button.
- Cards should have realistic proportions and clear rank/suit hierarchy.
- Played cards animate into the center and resolve visibly.
- Winner/trick feedback should be obvious.
- End-of-round result should transition cleanly to match result/rematch.

### Social / Communication
- Quick emotes during a match.
- Lightweight chat/quick messages rather than unrestricted chat by default.
- Mute/report/block affordances should be available from player menus.
- Social actions should never interrupt a turn.

### Economy / Monetization UX
- Coin balance and premium currency balance visible globally.
- Add/buy buttons next to currencies.
- Shop with clearly separated packages.
- Premium/VIP option.
- Remove Ads option.
- Entry-fee matchmaking must reserve/deduct coins atomically on the server.
- Zero-balance flow should offer legitimate ways to earn or purchase coins.
- Paid coin purchases for Android should use Google Play Billing with server verification; no fake client-side balance updates.

### Settings / Help
- Sound/music controls.
- Rules/help screen.
- Language/localization readiness.
- Account/logout controls.
- Connection diagnostics/reconnect option.

## Design direction for THULLA MASTER
- Keep THULLA MASTER's own dark-green + gold brand identity.
- Adopt the reference video's information hierarchy: identity/currency at top, two strong primary play actions, secondary features around them.
- Use a centralized mobile-first UI rather than a desktop webpage compressed onto a phone.
- Make the actual four-player table the visual hero of the product.
- Use original assets and artwork; do not copy proprietary characters, exact screens, logos, or art.

## Rules clarification
- The first trick is started by the player holding **A♠ (Ace of Hukam)**.
- A non-A♠ card must not be accepted as the first opening card.
- This rule must be enforced by the authoritative game engine/server and covered by deterministic tests.

## Recommended roadmap additions
1. Home/retention hub.
2. Daily rewards + spin.
3. Friends/invite/private-room UX.
4. Matchmaking/entry-fee UX.
5. Premium/shop/economy UX.
6. Game-table visual overhaul.
7. Emotes/quick chat.
8. Settings/help/inbox.
9. Reward and match-result animations.
10. Real-device UX QA for portrait mobile.
