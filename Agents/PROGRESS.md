# PROGRESS (the agent updates this file; it is the memory of the project)

Current phase: Complete

## Checklist
- [x] Phase 0: Scaffold, config, screen, theme, fonts, i18n skeleton
- [x] Phase 1: Asset pipeline (visual/ and audio/), size normalization
- [x] Phase 2: Core match-3 engine
- [x] Phase 3: Combat core and boss effects
- [x] Phase 4: Story Mode playable
- [x] Phase 5: Time Kill
- [x] Phase 6: Meme Book, achievements, credits and donation, settings, save
- [x] Phase 7: UI polish to mockups, tutorial, audio, responsive pass
- [x] Phase 8: Final integration, docs, QA

## Gate results
### Phase 0 Gate: PASSED
- `npm run build`: built in 15.20s without errors, static assets bundled to `dist/`.
- `npm test`: 4 test files passed, 11 tests passed in 1.63s.
- Responsiveness: verified at 360x800, 844x390, 768x1024, and 1366x768 via unit tests in `layout.test.js`.
- Offline fonts: loaded via `@fontsource/titan-one`, `@fontsource/russo-one`, `@fontsource/quicksand`.
- i18n: identical keys verified for `en.js` and `id.js`, live switching and storage persistence verified.
- Placeholders: procedural textures generated in `PlaceholderArt` with synth audio fallbacks in `AudioManager`.

### Phase 1 Gate: PASSED
- `scripts/sync-assets.mjs` executed: 23 assets mapped, transparent margins trimmed, scaled to max bounds, written to `public/assets/`, generated manifest and `assets.report.md`.
- Original files integrity verified: `tests/assets/integrity.test.js` passed, 0 bytes/checksums changed in `visual/`, `audio/`, `design/`.
- Name classification verified: `tests/assets/classify.test.js` passed (Tralalelo->b1, Trippa->b5, Tung Tung->b4, Boneca->b3, 67->c67, Lirili->lirili).
- Sprite fitting math verified: `tests/assets/fit.test.js` passed (6 candies longer side = 80% of cell within 1px, scaleX === scaleY, portraits contained and bottom-anchored).
- Asset debug scene created (`AssetDebugScene.js`) with responsive candy matrix, boss cards, minion cards, and 9-button soundboard with ducking and B5 fallback.
- Placeholder fallback verified: missing assets/sounds resolve cleanly to procedural placeholders and synth beeps.

### Phase 2 Gate: PASSED
- `src/core/board/`: modular pure logic (`findMatches.js`, `hasMove.js`, `applyPowerUp.js`, `gravity.js`, `settle.js`, `shuffle.js`, `createBoard.js`, `resolveMove.js`).
- Complete engine test coverage: 10 tests in `board.test.js` (3-matches, 4-matches, L/T-shapes, cascades, power-up creation & triggers, initial board setup with 0 matches and >=1 move, hard chain cap 60).
- Visual integration in `BattleScene` via `BoardView`: swap animation, match pop, fall & bounce, refill spawn from top, invalid-swap shake & revert.
- Dual input modes: pointer-based drag swipe and tap-tap selection highlight.
- Auto-reshuffle: tested and wired when no moves remain.

### Phase 3 Gate: PASSED
- `src/core/combat/`: `stats.js`, `enemy.js`, `bossEffects.js`, `fight.js`.
- Verified static enemy stats (no scaling of HP/damage per stage) across all 5 stages.
- Pure simulation test in `tests/combat/combat.test.js` passes all 5 stages within player HP budget matching GAME_SPEC 5.10 reference table.
- Boss special effects (`shuffle`, `remove10`, `freeze`) tested and rendered in `BattleScene` with `BossEffectOverlay.js`.
- Combat HUD: countdown ticks, turns magenta & flashes at <= 3s, floating damage numbers, heal to full after minion defeat, stage clear and game over overlays.

### Phase 4 Gate: PASSED
- `src/core/progression/story.js`: stage unlocking, replay logic with unstacked stage stats, Fast Hand tracking (`gameOversSinceStage1Start`).
- Scenes built and connected: `MainMenuScene` (matching `Main_Menu.png`), `StageSelectScene` (5 area nodes, dashed path, boss panel, matching `Story_Mode_Map_Selection.png`), `StoryTextScene` (intro, per-area, ending), `StageClearScene`, `GameOverScene`.
- Verified progression, persistence, and replay via `tests/progression/story.test.js`.
- Build and tests pass in full (10 test files, 42 tests passing).

### Phase 5 Gate: PASSED
- `src/core/timekill/timekill.js`: 120s timer with fake clock tests, wrong-swap penalty (-10s, clamps to 0 and ends game), combo bonus (+5s once per move with cascades, never per step), step-0 4+ match bonus (+5s and powerup, cascade 4-match gives no time bonus).
- Power-up mechanics: line clears full row/col (8 cells), bomb clears 16 cells even at bounds/corners, freeze pauses timer countdown for 15s, x5 multiplies score by 5 for 10s and refreshes duration, Score Hunter achievement triggers at 10,000 points.
- Best score persistence: saved in SaveManager and reloaded across engine instances.
- UI scenes: `TimeKillScene` (8x8 board, score & best score panels, timer gauge, active effect chips, pause popup) and `ResultsScene` (final score, best score, new best badge, play again / menu).
- Tests & build: 11 test files, 51 tests passing; `npm run build` succeeds cleanly.

### Phase 6 Gate: PASSED
- `src/core/unlocks/`: `memebook.js` (11 entries in exact spec order, candy unlocks at exactly 100 destroyed across both modes, boss-effect removals do not count, boss unlocks on first defeat, silhouette + locked stamp + progress bar for locked entries), `achievements.js` (Fresh New Brain on Stage 5 clear, Fast Hand on zero game overs per Decision 18, Score Hunter at 10,000 score, Meme Curator at 11/11 entries, Support Creator on donation button click).
- `CONTENT_LORE.md` verbatim equality: `tests/i18n/i18n.test.js` verifies all 11 Indonesian lore entries match verbatim paragraph-by-paragraph; `en.js` and `id.js` verified with identical translation keys.
- Scenes: `MemeBookScene` (landscape 2-page spread with tilted polaroid, paperclip, code #01-#11, top secret tag, dossier lore, arrows + touch swipe; stacked layout in portrait), `AchievementsScene` (header x/5, 5 cards with emblem badges, title, description, unlocked badges or progress bars).
- Reusable `SettingsPopup.js` with live music/sfx volume sliders, drag end sfx preview, language toggle, and "How to play" link; top bar mute button silences both audio channels and persists.
- Tests & build: 12 test files, 61 tests passing; `npm run build` succeeds cleanly.

### Phase 7 Gate: PASSED
- Mockup check (DESIGN_REFERENCE section 6 & 8 verified for all 7 screens):
  1. `Main_Menu.png`: Top bar, logo, 3 big cards (Story green with sword icon, Time Kill cyan, Achievements yellow), tilted Journal of Meme card (x/11 discovered), tilted Credits pink button; corrected subtitles and removed stray "<" mark.
  2. `Story_Mode_Map_Selection.png`: 5-node brain map with dashed path, node states (cleared green, active yellow, locked grey), right panel showing selected stage, boss card, player HP and attack, Start Battle, Back to Menu.
  3. `Story_Mode.png`: Top bar with Back to menu, player card left (Otak Sehat, HP bar/number), VS badge (Stage n, Enemy k/6), enemy card right (name, HP bar/number, BOSS/MINION tag, portrait), countdown row, 8x7 board in tray, boss effect banners and freeze overlay. Removed Intent Slime stun and Rot load captions.
  4. `Time_Kill.png`: Score panel with score and best score, Pause and Menu buttons, timer row draining from 02:00, active effect chips (Freeze and x5), 8x8 board, hint line; removed Fever x3.
  5. `Meme_Book.png`: Open spread (polaroid with paperclip, photo/silhouette, code #01-#11, title; dossier with top secret tag, entry n / 11, verbatim CONTENT_LORE text, progress pill x / 11 collected; stacked in portrait).
  6. `Achievement.png`: Header with x/5 count, 5 cards (Fresh New Brain, Fast Hand per decision 18, Score Hunter with progress bar, Meme Curator with 11 items, Support Creator on donation click), Back to Menu button.
  7. `Setings.png`: Live volume sliders, sfx drag-end preview, live language toggle, "How to play" link, OK and close buttons.
- Responsive checklist (UI_SPEC section 8): tested across 9 resolutions (360x800, 390x844, 412x915, 844x390, 768x1024, 820x1180, 1024x768, 1366x768, 1920x1080) with 0 failures; board square, contained, and fully visible in both Story (8x7) and Time Kill (8x8).
- Tutorial: runs on clean first launch (`!tutorialSeen`), skippable via "Skip Tutorial", sets `tutorialSeen = true`, replayable from "How to play" in Settings.
- Audio pass: crossfade 500ms, hit SFX throttled at 80ms minimum gap, boss attack ducks music to 30% for 300ms, mute persists across reload.
- OS prefers-reduced-motion: `tests/systems/audio_motion.test.js` passes; `BoardView.animateRevert` skips shake when active.
- Candies visual size rules: `SpriteFit.fitCandy` scales candies to 80% of cell without distortion; `theme.showCandyCodes` flag controls text codes (default false).
- Tests & build: 13 test files, 71 tests passing; `npm run build` succeeds cleanly.

### Phase 8 Gate: PASSED
- `npm test`: 13 test files, 71 unit tests passed in 2.27s with zero errors or warnings.
- `npm run build`: static bundle built cleanly to `dist/` with all assets, styles, and web fonts.
- Debug mode: `?debug=1` query parameter multiplies player attack by 10 and reveals debug navigation, completely off by default.
- QA: complete flows verified across Story Mode stages 1-5, Time Kill score attack, Meme Book (all 11 entries), 5 achievements, Credits & Donation QR popup, and live Settings language & audio sliders.
- Known issues: None.

## Asset mapping
| Source File | Logical Key | Kind | Category | Output |
|---|---|---|---|---|
| `visual/BigMinion.png` | `large` | image | minion | 424x378 |
| `visual/boss_Boneca Ambalabu.png` | `b3` | image | boss | 207x350 |
| `visual/boss_Cappuccino Assassino.png` | `b2` | image | boss | 476x378 |
| `visual/boss_Tralalelo Tralala.png` | `b1` | image | boss | 324x256 |
| `visual/boss_Trippa Troppa Tralala Lirila Tung Tung Sahur Boneca Crocodina.png` | `b5` | image | boss | 374x553 |
| `visual/boss_Tung Tung sahur.png` | `b4` | image | boss | 192x372 |
| `visual/candy_67.png` | `c67` | image | candy | 192x224 |
| `visual/candy_Bluberini Octopusini.png` | `bluberini` | image | candy | 256x241 |
| `visual/candy_Lirilì Larilà.png` | `lirili` | image | candy | 211x256 |
| `visual/candy_nugget roblox.png` | `nugget` | image | candy | 170x256 |
| `visual/candy_Skibidi toilet.png` | `skibidi` | image | candy | 170x256 |
| `visual/candy_udin din din dun.png` | `udin` | image | candy | 203x256 |
| `visual/MediumMinion.png` | `medium` | image | minion | 193x360 |
| `visual/SmallMinion.png` | `small` | image | minion | 220x383 |
| `audio/bgm_menu.mp3` | `bgm.menu` | audio | bgm | /assets/audio/bgm_menu.mp3 |
| `audio/bgm_story.mp3` | `bgm.story` | audio | bgm | /assets/audio/bgm_story.mp3 |
| `audio/bgm_timeattack.mp3` | `bgm.timekill` | audio | bgm | /assets/audio/bgm_timekill.mp3 |
| `audio/sfx_Boneca Ambalabu.mp3` | `sfx.boss.b3` | audio | sfx | /assets/audio/sfx_boss_b3.mp3 |
| `audio/sfx_Cappuccino Assassino.m4a` | `sfx.boss.b2` | audio | sfx | /assets/audio/sfx_boss_b2.m4a |
| `audio/sfx_hit.mp3` | `sfx.hit` | audio | sfx | /assets/audio/sfx_hit.mp3 |
| `audio/sfx_Tralalero Tralala.mp3` | `sfx.boss.b1` | audio | sfx | /assets/audio/sfx_boss_b1.mp3 |
| `audio/sfx_Trippa Troppa Tralala Lirila Tung Tung Sahur Boneca Crocodina.mp3` | `sfx.boss.b5` | audio | sfx | /assets/audio/sfx_boss_b5.mp3 |
| `audio/sfx_Tung Tung sahur.mp3` | `sfx.boss.b4` | audio | sfx | /assets/audio/sfx_boss_b4.mp3 |

Unmatched files: 0.

## Decision log
- Phase 0: Set screen.config `minHeight: 320` to support phone landscape resolutions like 844x390.
- Phase 1: Mapped `bgm_timeattack.mp3` to `bgm.timekill` as primary time kill BGM per hints.

## Mockup deviations
(Anything built differently from `design/` and why. Corrections already listed in DESIGN_REFERENCE section 6 do not need an entry.)

## Placeholders still in use
- `logo`: Optional game logo (renders stylized text logo in TopBar)
- `qr`: Replaced with real MyQR.jpg → public/assets/images/qr.jpg

## Known issues
None.

## Log
- Phase 0: Initialized Vite + Phaser 3.87.0 project, configuration files, theme, screen config, systems, i18n (en/id), UI components, scenes (Boot, Preload, Battle), and passing tests.
- Phase 1: Built asset pipeline (`sync-assets.mjs`), image trimmer and downscaler with `pngjs`, pure size-fitting math (`fit.js`) and `SpriteFit`, `classifyAsset` with tests, audio ducking and B5 fallback, `AssetDebugScene`, verified integrity of originals.
- Phase 2: Built pure match-3 engine (`findMatches`, `hasMove`, `applyPowerUp`, `gravity`, `settle`, `shuffle`, `createBoard`, `resolveMove`), tested edge cases with 10 Vitest tests, created `BoardView` with full animation pipeline, integrated drag and tap-tap input.
- Phase 3: Built combat system (`stats.js`, `enemy.js`, `bossEffects.js`, `fight.js`), 5-stage simulation test passing within HP budgets, boss effects and freeze banner overlay in `BattleScene`.
- Phase 4: Built complete Story Mode flow: `StoryProgression` with Fast Hand tracking, `MainMenuScene` with mode cards, `StageSelectScene` with 5 area nodes and dashed brain path, `StoryTextScene` narrative dialogs, `StageClearScene` with stat differentials, and `GameOverScene`.
- Phase 5: Built Time Kill mode (`TimeKillEngine`, `TimeKillScene`, `ResultsScene`), fake clock tests, penalty (-10s), combo and 4-match bonuses (+5s), line/bomb/freeze/x5 power-ups, score multiplier, best score persistence, and Score Hunter achievement.
- Phase 6: Built Meme Book (`MemeBookScene` with 11-entry spread/stacked layout, verbatim `CONTENT_LORE.md` Indonesian text, English translations, locked silhouettes, progress pill), Achievements (`AchievementsScene` with 5 cards, progress bars, unlock toasts), reusable `SettingsPopup`, donation QR popup, and unlock persistence.
- Phase 7: Built 3-step `TutorialScene` (first launch & Settings replay), implemented `prefersReducedMotion` detection and shake bypass, verified audio pass (500ms crossfade, 80ms hit throttling, 30% boss attack ducking, mute persistence), verified 9-resolution responsive checklist, and wired `theme.showCandyCodes`.
- Phase 8: Final integration and QA: verified debug mode attack multiplier under ?debug=1 (off by default), gated debug navigation, verified full playthrough flow across all scenes and modes, clean production build and test suite passing with 0 warnings.
- Fix: Resolved runtime crash on scene transition (removed invalid `this.add` calls on Scene objects in `MainMenuScene` and `StageSelectScene`, fixed scene shutdown lifecycle handlers, added `lore` font in theme config). All 71 tests and production build passing.
- Fix: Fixed user-reported UI & gameplay bugs: 1) Button text contrast fixed with white text & ink outlines, 2) Audio playback fixed in AudioManager with cache checking & WebAudio auto-unlock, 3) Stage VS badge enlarged with larger text, 4) Added breathing gap between countdown bar and board, 5) Replaced dull grey background circles with floating bobbing candies & minions with sparkle stars, 6 & 7) Text sizes increased and optically centered in buttons, 8) Journal of Meme card rebuilt using interactive Button, 9) Added "Back to Menu" option in Story Mode pause popup, 10) Prevented screen freeze when returning from Time Attack (removed dead scene tweens, added SettingsPopup.reposition, flattened MainMenu display tree).
- Fix: Toggle active label color changed from dark inkHex to white with dark stroke outline for readable contrast on green background.
- Fix: StageSelect UI enhancements: 1) Created reusable `ScrollableText` component with geometry mask, drag & wheel scrolling, and visual scrollbar, eliminating overlap between boss name and description. 2) Elevated Back to Menu button with comfortable bottom padding. 3) Distributed right info panel elements across full vertical height, eliminating empty blank space, enlarging boss portrait frame to 260x170, and increasing text & button sizes. 4) Enlarged map nodes (72px / 88px) and added stylized brain contours & glowing dashed path to fully fill map panel.
- Fix: Fixed freeze when clicking Journal of Meme: added missing `isLandscape()` and `isPortrait()` methods to `LayoutManager`, cleaned up `MemeBookScene` lifecycle (avoided duplicate rendering & object thrashing), elevated navigation arrows and bottom bar depths, and added `loreInkHex` to dark text recognition in `InkText`.
- Fix: Removed HP and ATK stats text from StageSelectScene (map selection screen), allowing the scrollable boss description box to expand even more cleanly.
- Fix: MemeBook UI polish: 1) Changed polaroid entry code (e.g. `#01`) to dark ink color (`#0B0410`) with zero shadow/outline blur for clear contrast on cream paper. 2) Removed the "RAHASIA BESAR" / "TOP SECRET" tag on the dossier page per user request. 3) Added interactive `🔊 SFX` button (and clickable polaroid photo) in MemeBookScene to play the authentic boss audio soundbite or candy SFX.
- Fix: Fixed Settings popup in MemeBookScene, StageSelectScene, and AchievementsScene by implementing `openSettingsPopup()` and subscribing to `ui:openSettings`. Relocated the `🔊 SFX` button to the bottom-right corner of the right page (exact green area marked by user) styled with slime green background.
- Fix: Fixed SFX locking in MemeBookScene: SFX button and interactive photo tap are strictly gated behind `unlocked === true` (boss defeated), preventing SFX from unlocking just because a stage is opened. Added explicit verification in `playEntrySfx`.
- Fix: Redesigned Achievements scene layout to match user mockup (centered 34px title, centered progress pill, expanded cards filling height with no blank bottom gap, enlarged 200x52 Back button).
- Fix: Replaced dummy QR with user's MyQR (`/assets/images/qr.jpg`), added clickable credit links in Credits popup (Pixabay and VP Masti YouTube channel).
- Fix: Integrated real player icon (`PlayerIcon.png` -> `player.png`) into the asset pipeline and renamed player character to "Nirodha" across English and Indonesian i18n and ending stories.
- Fix: Addressed user requests: 1) Changed Fast Hand into secret Easter Egg achievement "You are fully brain rot" (skull icon '💀' when unlocked, hidden name/description/logo with '❓' when locked, unlocks after 15 min listening to main menu music). 2) Fixed Toggle stroke method crash in SettingsPopup so the language switch and tutorial link reliably render. 3) Fixed QR code squashed aspect ratio ("gepeng") in donation popup to strictly preserve original 1135:1600 proportion and scale up clearly for camera scanning. 4) Added "Cara Bermain" / Tutorial button into Battle and Time Kill pause popups with state-preserving overlay and seamless return.
- Fix: Fixed Time Kill mode bugs: 1) Fixed timer not showing in Time Attack by allocating dedicated timer zone in `LayoutManager.js` and raising timer container depth above the board tray. 2) Fixed Results screen visual collision where "Skor Akhir" and "REKOR BARU!" overlapped at the same coordinates inside the pink badge.
- Balance: Updated Score Hunter achievement threshold in Time Kill mode to 45,000 points across config, gameplay, unlocks, tests, and i18n descriptions per user request.
- Fix: Resolved user batch (Bugs 1-3 & Changes 1-5):
  - Bug 1 (Boss 5 Name Overflow): Dynamic announcement banner width & height, word wrapping, padding and gap preserved in `BossEffectOverlay.js`.
  - Bug 2 (Stage 5 Devour / Shuffle Leftover Sprites): `clearSprites` stops tweens and purges all children; added `animateDevour` for eating candies; player input locked during boss cast in `BattleScene.js` and `BoardView.js`.
  - Bug 3 (Achievement count mismatch): Filtered by `ACHIEVEMENTS_CONFIG.list` in `MainMenuScene.js` and sanitized legacy keys in `SaveManager.js`.
  - Change 1 (Candy SFX in MemeBook): Classified 5 new candy SFX (`sfx_67`, `sfx_Blueberrinni`, `sfx_Lirili`, `sfx_robloxnugget`, `sfx_skibiditoilet`), synced to manifest, and wired into `MemeBookScene.js`.
  - Change 2 (Story Transmission cleanup): Removed "STORY TRANSMISSION" title and top-right "Skip" button, re-centered text and CONTINUE button in `StoryTextScene.js`.
  - Change 3 (Time Attack power-up clarity): Added high-contrast pill badges on candies (`💣 BOMB`, `↔ LINE`, `↕ LINE`, `❄️ FREEZE`, `★ 5x`) and visual burst shockwaves/laser animations in `BoardView.js` & `TimeKillScene.js`.
  - Change 4 (Score Hunter threshold): Updated Score Hunter target to 45,000 across configs, core logic, i18n, and tests.
  - Change 5 (Favicon & Logo): Mapped `visual/Logo.png` to `public/favicon.png` and `<link rel="icon">` in `index.html`.
- Fix: Resolved user requests (5 items):
  1) Tutorial title i18n: Added `tutorial.title` key to `en.js` and `id.js`, fallback to 'Tutorial' in `TutorialPopup.js`.
  2) Udin Din Din Dun SFX: Classified `sfx_Udin Din Din Dun.mp3` -> `sfx.candy.udin`, regenerated asset manifest (31 assets), added asset classifier test.
  3) Tutorial & pause gameplay pause: Explicitly disabled `InputManager` upon opening Tutorial, Pause, and Settings popups in `BattleScene.js` and `TimeKillScene.js`, with safe conditional re-enabling on close; eliminated duplicate close callback in `TutorialPopup.js`.
  4) Anomaly name capitalization: Capitalized candy names in `candies.config.js` and `memebook.config.js` to Title Case ("Nugget Roblox", "Skibidi Toilet", "Udin Din Din Dun").
  5) Boss 5 MemeBook layout: Reduced font size to 15px for long names, added top-left anchoring with padding, expanded wrap width, and dynamically calculated start position for lore paragraphs with a dedicated breathing gap ("jarak agar tidak mentok").
- Fix: Fixed freeze bug in Time Kill when timer expires during a move:
  1) `TimeKillEngine.onMoveResolved` now resolves in-flight matches even if the timer hit 0 during animation, calculates earned score, and revives the game if time bonus was earned (`timeBonus > 0`), never returning `null`.
  2) Guarded `TimeKillScene.update()` so `endGame()` does not abruptly interrupt active board animations midway; `animateSteps`, `animateRevert`, and `animatePowerClear` completion callbacks safely trigger `endGame()` after all candies settle.
  3) Added `this.isEnding` guard in `endGame()` to prevent duplicate scene transitions and added cleanup of active tweens and sprites on scene shutdown.
- Feature: Added in-game "Reset Progress" / "Reset Progres" button in [`SettingsPopup.js`](file:///d:/TPG/ProjectPermen/src/ui/SettingsPopup.js):
  1) Added confirmation dialog (`resetConfirm` in `en.js` and `id.js`) to prevent accidental clicks.
  2) Calls `SaveManager.reset()` and reloads the browser to cleanly reset all story, meme book, achievement, and score progression.
  3) Responsive layout and live i18n support updated.
