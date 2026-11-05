# DESIGN_REFERENCE: follow the mockups, with corrections

Read in Phase 0, 4, 5, 6, 7, together with `UI_SPEC.md`.

## 1. Sources
`design/` holds the owner's 7 mockup PNGs (layout truth): `Main_Menu.png`, `Story_Mode_Map_Selection.png`, `Story_Mode.png`, `Time_Kill.png`, `Meme_Book.png`, `Achievement.png`, `Setings.png` (Settings). Colors, fonts, and component rules are in section 3 (an optional `design/DESIGN.md` has the same tokens).
Priority when sources disagree: `GAME_SPEC.md` > `UI_SPEC.md` > this file > the mockup. The mockups contain wrong texts and a few invented items; section 6 lists every correction. Do not build anything from the mockups that section 6 marks as wrong.

## 2. How to follow a mockup
Reproduce layout, proportions, colors, fonts, outlines, shadows, icon style, and spacing of each screen in Phaser. Open each PNG and compare your screen with it at a similar size (1280 px wide landscape). Re-create the look with code (no screenshots as backgrounds, no HTML). Portrait layouts are derived from the same components (`UI_SPEC.md` section 2). If the mockup art (logo, portraits, emblems) is a flat image inside the PNG, it is not an asset: use the owner's files from `visual/` or placeholders.

## 3. Style tokens (put in `src/config/theme.config.js`)
- Colors: canvas `#1A0B2E`; brain surface `#2D124D`; playfield tray `#1E0A33`; ink `#0B0410`; hard shadow `#060208`; slime green `#00FF66` (player HP, positive); punch magenta `#FF007F` (enemies, danger, penalties); arcade yellow `#FFE600` (timers, scores); electric cyan `#00E5FF` (freeze, power-ups); parchment `#FFF7E6` with lore ink `#2B1A3D` (Meme Book).
- Fonts: Titan One (titles), Russo One (HUD numbers, buttons), Quicksand Bold (lore and body). Install through `@fontsource` packages so they work offline; wait for fonts before drawing text; they must render the Indonesian and Italian-style accents used in the names (ì, à).
- Shape and depth: thick ink outlines (3 to 5 px), rounded corners (16 px buttons, 24 px big panels), hard offset shadows with zero blur. A pressed button moves down 4 px and its shadow shrinks.
- Gauges: player HP green, enemy HP magenta, attack countdown yellow and flashing magenta at 3 s or less.
- Power-up overlays on tiles: line = cyan arrows, freeze = ice corners, x5 = gold coin badge, bomb = bomb icon.
- UI kit in `src/ui/`: `TopBar`, `Panel`, `Button`, `Gauge`, `Slider`, `Toggle`, `InkText`, `LocalizedText`, `Popup`. Scenes use these, never raw styling.

## 4. What the mockups prove about the layout
- Landscape desktop width about 1280 px. Top bar is always present: logo, title "PEMBUSUKAN OTAK", subtitle, and on the right a sound button and a settings button (no coins, no navigation tabs).
- Story board is 8 columns x 7 rows; Time Kill board is 8 x 8, centered in a dark tray with thick border.
- Candies: Story tiles are round tokens in a dark cell; Time Kill tiles are plain cells with the candy image and an optional small code (`NGT`, `SKB`, `CAC`, `NUM`, `BLU`, `UDN`). Show codes only if `theme.showCandyCodes` is true (default false).

## 5. Allowed additions (needed but not in the mockups)
Pause and leave popup, StageClear, GameOver, Results, StoryText popup, Credits popup, Donation QR popup, Tutorial, "How to play" link in Settings, boss effect banner, freeze overlay, toasts. Design them with the same components and tokens.

## 6. Per screen: follow, correct

| Mockup | Follow | Correct (wrong or invented in the mockup) |
|---|---|---|
| `Main_Menu.png` | Top bar, logo image, three big mode buttons (green Story Mode, cyan Time Kill, yellow Achievement), tilted "Journal of Meme" card bottom-left, tilted pink "Credits" button bottom-right, slime drips, sparkles | Story subtitle "Campaign Chapter 1-1" becomes "5 areas" plus progress (for example "2/5 cleared"). Time Kill "60-sec rush arcade" becomes "2-minute score attack". Achievement "42/50" becomes "x/5 unlocked". Journal "184 Discovered" becomes "x/11 discovered". The Story button has an empty icon square: add a sword or play icon. Remove the stray yellow "<" mark at the left. |
| `Story_Mode_Map_Selection.png` | Map panel with a faint brain outline, dashed path between nodes, node states (cleared green, active yellow, locked grey), boss-style final node, right panel with "Stage n", boss card, Start Battle button, bottom bar with Back to Menu | Exactly **5 nodes = 5 areas**, numbered 1 to 5 (remove "1-x" badges and the stars). Node label = area name (decision 28). The right panel must show the **selected** stage and its own boss (the mockup shows "Stage 4" with Tralalelo, which is stage 1's boss). Boss name must not be cut off ("TRALALELO ..."): wrap or shrink. Card description = first sentence of the boss lore in the current language. Add one line under the card: the player's HP and attack for that stage. The last node is the final area (combined boss). |
| `Story_Mode.png` | Top bar with "Back to main menu", player card left ("Otak Sehat", portrait, HP bar and number), yellow VS badge, enemy card right (name, HP bar and number, BOSS or MINION tag, portrait), countdown row, board in tray | Board 8 x 7. Remove "Intent: Slime stun (3 turns)" (boss effects are random on each attack, shown by a banner when they happen). Remove the bar captions "Vitality: Optimal" and "Rot load: Overcharged" and the "Buff" and "Status" lines. The VS badge tag "Stage 04" becomes "Stage n", plus "Enemy k/6". Countdown shows seconds with one decimal. "Back to main menu" opens the pause and leave popup. Minion fights use the same card with the MINION tag and the minion's art. |
| `Time_Kill.png` | Top bar; score panel with big score and "Best high score"; Pause and Back to main menu buttons; timer row with big time and a filled bar; board 8 x 8; hint line at the bottom | Remove "Fever x3" and "Active combo 3x". Use those two slots for the active effect chips (Time Freeze and Score x5 with remaining seconds, only while active). "Timer sisa waktu" must come from i18n ("Time left" / "Sisa waktu"). The mockup timer bar is empty: it must be filled and drain from 02:00. Remove the hint line at the bottom (owner request). |
| `Meme_Book.png` | Open spread: dark left panel with a tilted polaroid (paperclip, image, name, entry code), vertical timeline between pages, cream right page with "Top secret" tag, big title, two paragraphs, yellow arrows at both edges, bottom row with Back to Menu and a progress pill | **11 entries**, progress "x / 11 collected". Remove "Play soundbyte" and the "Bio-class: Meme SSS" badge. "Page 03" becomes "Entry n / 11". Right page body = the two lore paragraphs of the entry (`CONTENT_LORE.md`), not invented text. Polaroid code becomes "#nn". Fix the clipped "OOKS" text on the polaroid. Locked entries use the locked state in `UI_SPEC.md` section 6. |
| `Achievement.png` | Header "Achievements" with count pill, five cards (emblem, small tag line, title, description, state or progress), Back to Menu button | Count "4 / 12" becomes "x / 5". Cards and texts: Fresh New Brain "Finish Story Mode"; Fast Hand per decision 18 (not the "5-match combo" text); Score Hunter "Reach 10000 score in Time Kill" with a progress bar (best score / 10000); Meme Curator "Unlock all 11 Meme Book entries" with one chip per entry (not 6 invented names such as Mewing King); Support Creator "Click the donation button". Remove "Story mastery Ch.1", "Cleared: 100% Synapse Integrity", the record line, "Honorary", "special community events", and the "Golden Coffee Cup cosmetic tile skin". Emblems come from `visual/` if present, else icon badges. |
| `Setings.png` | Popup with title, Music slider, SFX slider, Language toggle (English / Indonesia), OK button, round close (X) button | Add only a small "How to play" link below the language toggle. Sliders are live and saved; the language toggle switches all text immediately (`UI_SPEC.md` section 7). |

## 7. Art rules
- Never use art from the mockup PNGs in the game. Use the owner's files in `visual/` or placeholders.
- Use the 6 candies of GAME_SPEC 5.7 consistently on every screen.

## 8. Check (used in the Phase 4, 5, 6, and 7 gates)
For each screen, list in `PROGRESS.md` the elements followed and the corrections applied, using the table in section 6.
