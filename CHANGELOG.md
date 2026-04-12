# Changelog

## 2026-04-12
- Added a main menu Cheat Codes button with an in-menu code entry panel.
- Added Mayhem unlock cheat code: `CR4ZYM0D3`.
- Added Invasion unlock cheat code: `1NV4S10NY4`.
- Added Broadcast to control all troops in Invasion Mode

## 2026-04-08
- Added shared wave controller with intermission flow, scaling, and boss wave routing.
- Unified leaderboard storage under `inversia_scores` with rank/best/top queries.
- Rebuilt in-game HUD as HTML glass panels and integrated live updates.
- Added full Game Over screen with tag entry, submit/retry/mode controls.
- Replaced audio with Web Audio API `AudioEngine` and named sound library.
- Added loading splash before menu, settings panel, and gameplay pause menu.
- Added resize scaling logic to keep entity positions proportional on window resize.
- Added deployment-ready minimal README.

## 2026-04-09
- Added full 4-direction player movement in Flux and Command with dt-normalized acceleration, friction, and player-zone clamping.
- Added faint boundary line at player-zone split and enabled diving enemies to track player Y after crossing into player territory.
- Expanded Command with tactical fleet controls, dual CONTROL/COMMAND states, and touch-friendly command UI behaviors.
- Added Wave 100 one-time unlock flow with multi-step splash sequence, localStorage persistence, and menu integration.
- Added unlock-gated Mayhem mode card and dedicated `modes/mayhem.js` entry module.
- Added Mayhem variant gameplay: 50-fighter start, boss-only wave progression, staggered spawns, sync volleys, HUD boss counter, and separate Mayhem best-score tracking.
- Added synchronized fleet volleys with dynamic friendly bullet caps and cooldown-upgrade stacking.
- Added Mayhem end-wave upgrade selection: Group Shield, Replenish +20 fighters, and Lower Cooldown.
- Added Group Shield mechanic with independent shield HP pool and on-screen shield bar.
- Added Backspace power-up system across gameplay modes with stored charges, HUD button, activation rules, and 5-second laser beam.
- Added nested Backspace drop logic (standard pool + 1-in-25 conversion) and guaranteed boss-drop handling.
- Added Mayhem rotation waves (every 5th) where Backspace replaces one normal drop slot for that wave, plus rotation HUD notice.
- Added laser DPS scaling from alive fleet size in Command/Mayhem and live DPS label on Backspace HUD button.
- Fixed Command/Mayhem blank-screen startup bug caused by early `now` reference in `startCommand`.
- Improved local dev behavior by unregistering service workers on localhost to avoid stale Live Server builds.
