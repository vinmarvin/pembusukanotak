# UI_SPEC: layout, responsiveness, behavior, language

Read in Phase 0, 4, 5, 6, 7, and whenever you touch layout, HUD, scenes, text, or input. Visual look and the per-screen corrections are in `DESIGN_REFERENCE.md`.

## 1. Principles
- All sizes and positions come from `LayoutManager`. Scenes never hard-code pixels.
- Targets: phone portrait, phone landscape, tablet, laptop. One build.
- Resizing or rotating never resets state (HP, timers, board, score, open popups).
- Tap targets are at least 44 CSS px. No page scroll, pinch zoom, pull-to-refresh, or context menu on the game.
- HTML shell: viewport meta tag (`viewport-fit=cover`), `touch-action: none` on the canvas, dynamic viewport height (`dvh`), safe-area insets respected.
- Reduced motion: follow the OS setting `prefers-reduced-motion` (no screen shake, no hit-stop). There is no in-game toggle.

## 2. LayoutManager
- `getLayout()` returns `{ orientation, width, height, uiScale, safe, zones }` and emits `layout:changed` (debounced) on resize and orientation change.
- Orientation: landscape if width > height, else portrait.
- `uiScale = clamp(min(width, height) / 720, 0.6, 1.6)` (values in `screen.config.js`). Token sizes from `DESIGN_REFERENCE.md` are authored at 1080 px tall; convert with `uiScale x 0.667`. Rendered minimums: buttons 44 px tall, body text 14 px, labels 12 px, HUD numbers 18 px.
- The board has `cols x rows` square cells (Story 8x7, Time Kill 8x8). `cellSize = min(boardZoneWidth / cols, boardZoneHeight / rows)`; the board is centered in its zone, so it is fully visible and never covered.
- Zones (defaults in `screen.config.js`):
  - **Landscape:** top bar; below it the screen content as in the mockups. Battle: fighter panel row (player card, VS badge, enemy card), countdown row, board centered below. Time Kill: score panel, timer row, board (no hint line, owner request).
  - **Portrait:** top bar; fighter cards side by side but compact (portrait thumbnail, name, HP bar); countdown row; board full width; hint line. Time Kill: score panel stacked above the timer row, board below.
  - **Compact landscape** (landscape with height <= `compactLandscape.maxHeight`, e.g. phones sideways): the board takes the full content height in a centre column. Battle: player card + VS badge in the left column, enemy card + attack countdown in the right column. Time Kill: score and best score cards + timer in the left column, effect chips in the right column. (Owner playtest: the stacked layout left ~30 px cells on a 393 px tall phone.)
  - The top bar is never shorter than `topBarMinHeight` (56 px, its buttons are 44 px); zones start below its real height. Board zones keep `boardTrayPad` free so the tray never touches the screen edge.
- Swipe threshold = 0.3 x cell size.

## 3. Screens (visual details in DESIGN_REFERENCE section 6)
- **Top bar (all screens):** logo, title, subtitle on the left; on the right the sound (mute) button and the settings button. Battle and Time Kill add "Back to main menu" on the right side too.
- **MainMenu:** Story Mode, Time Kill, Achievement buttons; Journal of Meme card; Credits button. Stacked and centered in portrait.
- **StageSelect:** brain map with 5 nodes (areas) joined by a dashed path; right panel with the selected stage, boss card, player stats for that stage, Start Battle; Back to Menu. Locked nodes show a lock and "Clear stage n-1 first". The map background is a code-drawn brain (GAME_SPEC decision 34). Yellow Hard Mode and red Boss Mode buttons sit left of the Menu button in the top bar (width >= 900 px) or next to Back in the bottom row; both show a lock until Story Mode is finished (GAME_SPEC decisions 35, 36). Hard mode battles show the green Heal and orange ATK x2 power-up tiles with a charge fill and a status caption.
- **StoryText:** short text popup before Stage 1 (intro), when entering each area, and after Stage 5 (ending). Skippable.
- **Battle:** fighter panel (player card, VS badge with "Stage n" and "Enemy k/6", enemy card with MINION or BOSS tag), attack countdown row, board.
- **TimeKill:** score and best score, Pause, Back to main menu, timer bar and time, active effect chips, board. (The hint line was removed at the owner's request.)
- **StageClear:** HP and attack before and after, Next stage, Retry, Menu.
- **GameOver:** Retry stage, Menu.
- **Results (Time Kill):** score, best score, new-best marker, Play again, Menu.
- **MemeBook:** see section 6.
- **Achievements:** header with count x/5 and 5 cards.
- **Settings popup:** see section 7.
- **Credits popup:** credits text, "Support the creator" button (opens the QR popup), close.
- **Donation QR popup:** QR image or placeholder, thank-you text, close.
- **Pause and leave popup:** opened by Pause or by "Back to main menu"; Resume, Restart (Story), Main menu. Timers stay paused while open.

## 4. Feedback (every attack and effect must be readable)
- Floating damage numbers on hits (player and enemy). Hit flash on the target.
- The countdown bar turns magenta and flashes when 3 seconds or less remain.
- Boss effect banner naming the effect (Shuffle, Remove 10, Freeze) with the boss name; freeze overlay with a visible countdown; input ignored while frozen.
- Time Kill popups: +5 s combo, +5 s match bonus, -10 s wrong swap. Power-up candies show an icon overlay. Active effect chips (Time Freeze and Score x5) with remaining seconds, shown only while active.
- Wrong swap: candies swap back with a short shake.
- Stage clear and boss defeat get a celebratory effect and, for a boss, a "Meme Book entry unlocked" toast.

## 5. Tutorial
Per mode, no tutorial at first launch (owner). Popup over the paused game the first time a mode is played, replayable from that mode's pause menu ("How to play"); not in Settings. Steps and art live in `src/config/tutorials.config.js`; every number shown comes from `GAMEPLAY`.
- **Story** (3 steps): swap candies to match 3, destroyed candies damage the enemy, watch the enemy countdown and boss effects. Flag `tutorialSeen`.
- **Time Kill** (4 steps): match for points (100 per candy), race the 2:00 clock (wrong swap -10 s, chain reaction +5 s), power-ups (match 4+ for +5 s and a power candy: line, bomb, freeze 15 s, score x5 for 10 s), and reach as high a score as you can. Flag `timeKillTutorialSeen`.

## 6. Meme Book
- Landscape: two pages side by side (left = polaroid with the brainrot image, name, and entry number; right = dossier page).
- Portrait: image on top, lore below; Previous and Next arrows plus swipe.
- 11 entries in the order of decision 17. Right page: title = meme name, two lore paragraphs in the current language, entry number "n / 11". Progress pill "x / 11 collected".
- Locked: silhouette on the left with a LOCKED stamp; right page shows the unlock hint ("Defeat this boss once" or "Destroy 100 of this candy: 37/100"), not the lore.
- Long Indonesian or English text must fit: wrap, then shrink to a minimum size, then scroll inside the page.

## 7. Settings, language, text
- **Settings popup** (matches the mockup): Music slider, SFX slider, Language toggle (English | Indonesia), OK, close (X), and a small "How to play" link. Sliders apply live and are saved. Details in `ASSETS_SPEC.md` section 5.
- **Language:** `i18n.t(key, params)`. Keys are grouped by screen (`menu.story.title`). Both `en.js` and `id.js` must contain exactly the same keys (a test checks it). Default English. Switching language updates every visible text immediately, including the open screen and popups, through `LocalizedText`; it never restarts the scene or resets state. Save the choice.
- Not translated: game title, boss names, candy names, area names.
- Indonesian text is often 20 to 30 percent longer: buttons and cards must wrap or shrink; never overflow.
- No visible text is hard-coded outside `i18n/`.

## 8. Responsive QA checklist (used in the gates)
Window sizes: 360x800, 390x844, 412x915 (phone portrait); 844x390, 851x393, 870x393, 874x402 (phone landscape); 768x1024, 820x1180, 1024x768, 1180x820, 1280x800 (tablet); 1366x768, 1920x1080 (laptop).
For each size check:
- [ ] Board is fully visible and not covered by any HUD element; cells are square.
- [ ] All text readable in English and Indonesian; all buttons at least 44 CSS px; no overflow.
- [ ] Both swap methods work with touch or mouse (drag, tap-tap).
- [ ] Live resize and rotation keep HP, timers, board, and open popups.
- [ ] Menus, Meme Book, Achievements, Settings, and popups fit without scrolling the page.
Browsers: Chrome, Safari (iOS and macOS), Firefox, Edge.
