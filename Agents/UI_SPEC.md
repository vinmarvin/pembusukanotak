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
  - **Landscape:** top bar; below it the screen content as in the mockups. Battle: fighter panel row (player card, VS badge, enemy card), countdown row, board centered below. Time Kill: score panel, timer row, board, hint line.
  - **Portrait:** top bar; fighter cards side by side but compact (portrait thumbnail, name, HP bar); countdown row; board full width; hint line. Time Kill: score panel stacked above the timer row, board below.
- Swipe threshold = 0.3 x cell size.

## 3. Screens (visual details in DESIGN_REFERENCE section 6)
- **Top bar (all screens):** logo, title, subtitle on the left; on the right the sound (mute) button and the settings button. Battle and Time Kill add "Back to main menu" on the right side too.
- **MainMenu:** Story Mode, Time Kill, Achievement buttons; Journal of Meme card; Credits button. Stacked and centered in portrait.
- **StageSelect:** brain map with 5 nodes (areas) joined by a dashed path; right panel with the selected stage, boss card, player stats for that stage, Start Battle; Back to Menu. Locked nodes show a lock and "Clear stage n-1 first".
- **StoryText:** short text popup before Stage 1 (intro), when entering each area, and after Stage 5 (ending). Skippable.
- **Battle:** fighter panel (player card, VS badge with "Stage n" and "Enemy k/6", enemy card with MINION or BOSS tag), attack countdown row, board.
- **TimeKill:** score and best score, Pause, Back to main menu, timer bar and time, active effect chips, board, hint line.
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
First launch, skippable: 1) swap candies to match 3, 2) destroyed candies damage the enemy, 3) watch the enemy countdown and boss effects. Set `tutorialSeen` when finished or skipped. Replayable from "How to play" in Settings.

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
Window sizes: 360x800, 390x844, 412x915 (phone portrait); 844x390 (phone landscape); 768x1024, 820x1180, 1024x768 (tablet); 1366x768, 1920x1080 (laptop).
For each size check:
- [ ] Board is fully visible and not covered by any HUD element; cells are square.
- [ ] All text readable in English and Indonesian; all buttons at least 44 CSS px; no overflow.
- [ ] Both swap methods work with touch or mouse (drag, tap-tap).
- [ ] Live resize and rotation keep HP, timers, board, and open popups.
- [ ] Menus, Meme Book, Achievements, Settings, and popups fit without scrolling the page.
Browsers: Chrome, Safari (iOS and macOS), Firefox, Edge.
