# PHASES: build order (do one phase at a time; gates are acceptance tests)

Always read `PROGRESS.md` and `GAME_SPEC.md` first. Do not start a phase until the previous gate passed and is ticked in `PROGRESS.md`.

## Phase 0: Scaffold, config, screen, theme, fonts, i18n skeleton

Goal: a runnable, modular Phaser project with configurable and responsive screen handling, theme, fonts, and language switching; no gameplay yet. Read UI_SPEC, DESIGN_REFERENCE sections 3 and 4, ASSETS_SPEC.

Tasks
- [ ] Create the Vite + Phaser project (pin the Phaser version), the folder structure from GAME_SPEC section 2, and scripts `dev`, `build`, `preview`, `test`, `sync-assets` (stub).
- [ ] Create every file in `src/config/`; put `GAMEPLAY` in exactly as in GAME_SPEC section 4; `theme.config.js` from DESIGN_REFERENCE section 3.
- [ ] `screen.config.js`, `LayoutManager`, `InputManager` (pointer events), `EventBus`, `SaveManager` (try/catch, versioned, with the settings defaults), `AssetResolver`, `PlaceholderArt`, `AudioManager` skeleton, seedable `core/rng.js`.
- [ ] i18n: `t()`, `setLanguage()`, `LocalizedText`, `en.js` and `id.js` with the same keys.
- [ ] HTML shell per UI_SPEC section 1. Fonts through `@fontsource`, loaded before first render.
- [ ] UI kit skeleton in `src/ui/` (TopBar, Panel, Button, Gauge, Slider, Toggle, InkText, Popup).
- [ ] Boot scene ("Tap to start") and Preload scene (loading bar).
- [ ] An empty Battle scene with the top bar, a placeholder 8x7 board tray, and HUD boxes laid out per UI_SPEC section 2.
- [ ] Vitest set up with one passing test.

Gate
- `npm run build` and `npm test` pass.
- At 360x800, 844x390, 768x1024, and 1366x768: the board is fully visible with square cells and no HUD box overlaps it.
- Live resize and rotation re-layout correctly without errors.
- A test label switches between English and Indonesian live; the language is saved and restored after reload.
- Fonts render with no network request to Google Fonts.
- With no owner assets and no `visual/` or `audio/` folder, the game shows placeholders and no console errors.

## Phase 1: Asset pipeline (visual/ and audio/), size normalization

Goal: the owner's assets are found, mapped, normalized, and available to the game. Read ASSETS_SPEC fully.

Tasks
- [ ] `scripts/sync-assets.mjs` (scan, classify, trim, downscale, convert, manifest, report) and `src/config/assets.map.js` for owner overrides. `dev` and `build` run it first.
- [ ] `core/assets/fit.js` (pure fitting math) and `ui/SpriteFit`.
- [ ] `AssetResolver` uses the generated manifest and falls back to `PlaceholderArt`.
- [ ] `AudioManager`: bgm with crossfade, pooled sfx, boss sfx lookup with b5 fallback, volume curve, mute, hidden-tab pause, first-tap unlock, ducking.
- [ ] A temporary debug scene showing all 6 candies, all bosses, all minions, and buttons to play every sound.

Gate
- Run on the owner's real folders: `assets.report.md` is produced; the mapping (file to key) is pasted into `PROGRESS.md`; every unmatched or missing item is listed.
- Originals in `design/`, `visual/`, and `audio/` are unchanged (checksum test).
- Name-matching tests with sample file names: `Tralalelo Tralala` maps to b1, `Trippa Troppa Tralala ...` maps to b5, `tung_tung_tung_sahur` maps to b4, `Boneca Ambalabu` maps to b3 (not b5), `67.png` maps to `c67`, `Lirili Larila` maps to `lirili`.
- Fit tests: for all 6 candies the visible longer side equals 80 percent of the cell (within 1 px) whatever the source size; scaleX equals scaleY for every fitted sprite; portraits fit inside their slot.
- The debug scene shows all assets at consistent sizes on 360x800 and 1366x768; every sound plays (or the missing one is listed with a placeholder beep).
- Running with `visual/` and `audio/` removed still works with placeholders.

## Phase 2: Core match-3 engine

Goal: a playable responsive board with the real candy art.

Tasks
- [ ] `core/board`: `create`, `findMatches`, `resolveMove`, `hasMove`, `shuffle`, `settle` for any `cols x rows` (GAME_SPEC 5.1, decisions 1, 5, 10).
- [ ] Board view: pointer-event swap (drag and tap-tap), clear and fall animations driven by the step list (no polling), invalid swap reverts, candies fitted by ASSETS_SPEC section 4.
- [ ] Tests for all board functions.

Gate (run `npm test`)
- For both 8x7 and 8x8: 1,000 generated boards (seeded) have no starting match and at least one valid move.
- 1,000 random valid moves per size resolve and terminate; no match remains; the board is always full.
- An invalid swap returns `{ valid: false }` and leaves the grid unchanged.
- A run of 4 reports `longestRun = 4` at step 0; an L or T shape clears the whole union.
- A board with no valid move is reshuffled to one with a move and no match.
- Manual: a drag and a tap-tap swap both work at 360x800.

## Phase 3: Combat core and boss effects

Goal: a fight (player vs one enemy) works end to end in logic, tested with a fake clock.

Tasks
- [ ] `core/combat`: `statsForStage`, `enemyFor`, `Fight` (damage, enemy timers, heal rules, defeat order, game over), `bossEffects` (shuffle, remove 10, freeze).
- [ ] A headless balance test using GAME_SPEC 5.10.

Gate
- `statsForStage` matches the table in GAME_SPEC 5.2 for stages 1 to 5.
- Stage 1: destroying 2 candies deals 4 damage.
- Fake clock: a minion attacks at 15 s, a boss at 10 s; the timer resets when a new enemy appears; the timer keeps running during a freeze.
- Minion damage over 10,000 rolls is only 2, 3, or 4, each within 3 percentage points of one third. Boss damage is always 5 plus exactly one effect.
- 1,000 runs per effect on both board sizes: after shuffle and after remove 10 the board has no match and at least one valid move; remove 10 removes exactly 10 candies and adds nothing to damage, score, or counters.
- Heal to full after each enemy defeat and at stage start; game over restarts the stage.
- The balance test reproduces the boss column (80, 55, 40, 30, 35) and the worst-minion column (24, 15, 12, 9, 6) of GAME_SPEC 5.10.

## Phase 4: Story Mode playable

Goal: all 5 stages are playable with the owner's art, following `Story_Mode_Map_Selection.png` and `Story_Mode.png`.

Tasks
- [ ] StageSelect: 5-node brain map, locked, available, and cleared states, right panel with the selected stage, boss card, player stats, Start Battle (DESIGN_REFERENCE section 6).
- [ ] Battle scene per the mockup: fighter cards (player, minion or boss), VS badge, countdown row, 8x7 board, damage numbers, boss effect banner, freeze overlay.
- [ ] Stage sequence (small, small, medium, medium, large, boss) using each area's minion visuals; minion names from the mapping.
- [ ] Boss attack sfx and hit sfx, story bgm.
- [ ] StageClear, GameOver, pause and leave popup, StoryText popups (drafts in both languages).
- [ ] `core/progression/story.js`: unlock, replay stats, Fast Hand tracking (decision 18).
- [ ] `?debug=1` attack multiplier.

Gate
- Tests: stage N+1 unlocks only after clearing N; replaying a stage uses that stage's table stats and grants no extra upgrade; `gameOversSinceStage1Start` resets when Stage 1 starts and increases on game over.
- Manual (with `?debug=1`): play Stage 1 to 5 to the end; each boss defeat records the boss as defeated.
- Boss sfx plays on every boss attack (or the fallback beep plays and the missing file is listed in `PROGRESS.md`).
- Mockup check (DESIGN_REFERENCE section 8) recorded for StageSelect and Battle; responsive checklist passes for both, in English and Indonesian.

## Phase 5: Time Kill

Goal: the 2-minute score attack, following `Time_Kill.png`.

Tasks
- [ ] `core/timekill`: timer, score, wrong-swap penalty, combo bonus, match-4 bonus, four power-ups (decisions 11 to 16).
- [ ] TimeKill scene per the mockup (8x8 board, score panel, filled timer bar, active effect chips, hint line), time kill bgm, Results scene with saved best score.

Gate (tests with a fake clock)
- Destroying 4 candies scores 400.
- A wrong swap costs 10 s; a penalty that takes the timer to 0 or below ends the run.
- Combo bonus is +5 s once per move that triggers at least one cascade, never per cascade step.
- A step-0 run of 4 or more gives +5 s and exactly one power-up on the moved candy; cascade matches of 4 give nothing.
- A power-up never fires by itself; it fires when matched or on the second tap.
- Line break clears one full row or column; bomb clears exactly 16 cells inside the board, including near edges and corners; freeze pauses the timer for 15 s; x5 multiplies points for 10 s and refreshes on re-activation.
- Best score persists after reload.
- Mockup check and responsive checklist pass for TimeKill and Results.

## Phase 6: Meme Book, achievements, credits and donation, settings, save

Tasks
- [ ] `core/unlocks`: Meme Book counters and unlocks (decision 17); achievements.
- [ ] MemeBook scene per `Meme_Book.png` (spread, 11 entries, locked state, progress pill), with lore from `CONTENT_LORE.md`: `lore.id.js` verbatim, `lore.en.js` translated.
- [ ] Achievements scene per `Achievement.png`, with unlock toast.
- [ ] Credits popup, Donation QR popup (decision 22).
- [ ] Settings popup per `Setings.png`: live music and sfx sliders, language toggle, "How to play" link; mute button in the top bar.
- [ ] Full save and load.

Gate
- Tests: a candy entry unlocks at exactly 100 destroyed candies of that type and counts across both modes; boss-effect removals do not count; a boss entry unlocks once on the first defeat; Meme Curator unlocks only when all 11 are unlocked; Score Hunter unlocks at 10000 or more in Time Kill; Fresh New Brain unlocks on clearing Stage 5; Fast Hand follows decision 18; Support Creator unlocks on the first donation click.
- `lore.id.js` equals the text in `CONTENT_LORE.md` (test); `en.js` and `id.js` have identical key sets (test).
- Reload restores stage progress, counters, achievements, best score, volumes, mute, and language.
- Moving the music slider changes the playing music volume immediately; the sfx slider changes sfx volume immediately and plays a preview; the mute button silences both and persists.
- Switching language updates every visible text on the open screen and popups without a restart.
- Mockup check and responsive checklist pass for MemeBook, Achievements, Settings, Credits, and the QR popup, in both languages (longest texts do not overflow).

## Phase 7: UI polish to mockups, tutorial, audio, responsive pass

Tasks
- [ ] MainMenu per `Main_Menu.png` with the corrected subtitles; menu bgm.
- [ ] Tutorial (UI_SPEC section 5), feedback effects (UI_SPEC section 4), OS reduced-motion handling.
- [ ] Basic sfx for match, invalid swap, win, lose (owner files if present, else generated).
- [ ] Final portrait and landscape pass for every scene; side-by-side comparison with each mockup.

Gate
- Full UI_SPEC section 8 checklist passes for every screen at every listed size, in English and Indonesian.
- Mockup check (DESIGN_REFERENCE section 8) recorded for all 7 mockup screens.
- No audio before the first tap; music changes by scene with a crossfade; reduced motion disables shake and hit-stop.
- A new player can start and finish Stage 1 using the tutorial only.
- Measured FPS and load time are recorded in `PROGRESS.md`.

## Phase 8: Final integration, docs, QA

Tasks
- [ ] Re-run `sync-assets` on the owner's folders; update the mapping and placeholder lists in `PROGRESS.md`.
- [ ] README: how to run, build, deploy, where to put assets, how to fix a wrong asset mapping in `assets.map.js`, how to change numbers and texts.
- [ ] Traceability table in `PROGRESS.md`: each requirement in GAME_SPEC (decisions 1 to 30, sections 5.1 to 5.8) with status and file.
- [ ] Final QA: a full Story playthrough, a game over and retry, and a Time Kill run, each with no console errors.

Gate
- `npm test` and `npm run build` pass; `PROGRESS.md` fully ticked.
- Three QA sessions logged with no console errors.
- The UI_SPEC section 8 checklist is re-run on the production build (`npm run preview`).
