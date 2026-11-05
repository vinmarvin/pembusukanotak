# ASSETS_SPEC: owner assets, size normalization, audio

Read in Phase 0, 1, 7, 8, and whenever you touch assets, images, audio, or `scripts/sync-assets.mjs`.

## 1. Sources (read-only)
- `visual/`: minions, bosses, candy items (and optionally logo, player portrait, donation QR, meme images, achievement emblems). Any folder structure, any image sizes (png, webp, jpg).
- `audio/`: bgm for menu, story, and time kill; sfx for hits; monster and boss sfx; any other sfx.
- Never modify, rename, move, or delete originals. A test compares checksums before and after `sync-assets`.

## 2. Sync script (`scripts/sync-assets.mjs`)
Runs automatically before `dev` and `build` (and by `npm run sync-assets`). Steps:
1. Scan `visual/` and `audio/` recursively.
2. Classify each file into a logical key using folder names, file names, and the hints in section 3, then apply owner overrides from `src/config/assets.map.js` (an override always wins).
3. Images: trim transparent borders (record original size and trimmed size), downscale to the max sizes in section 4 (never upscale), write to `public/assets/`.
4. Audio: copy to `public/assets/audio/`. Formats that iOS Safari cannot play (ogg, flac, wav files over 1 MB) are converted to mp3 when a converter is available (for example the `ffmpeg-static` package); otherwise keep the file and log it.
5. Write `src/config/assets.generated.js` (the manifest: key, path, original size, trimmed size, kind) and `assets.report.md`.
6. The report lists: mapped files (file -> key), unmatched files, missing keys, files without transparency (candies and portraits should have it), files with a very different aspect ratio than the rest of their group. Copy the summary into `PROGRESS.md` "Asset mapping".
7. Missing folders or files never fail the script or the game. Missing keys use placeholders.

## 3. Logical keys and name hints
Normalize names first: lowercase, letters and digits only (`Tung_Tung-Sahur.png` -> `tungtungsahur`). Match specific keys before general ones. If two files match one key, prefer the longest hint match and log the other.

**Candies** (folder hint: `candy`, `item`, `permen`): `c67` hints `67`, `six`, `seven`; `nugget` hints `nugget`; `skibidi` hints `skibidi`, `toilet`; `lirili` hints `lirili`, `larila`, `cactus`, `kaktus`; `udin` hints `udin`; `bluberini` hints `bluberini`, `octopus`, `gurita`.

**Bosses** (folder hint: `boss`). Assign `b5` first by `combined`, `trippa`, `troppa`, `crocodina`, `final`; then `b1` by `tralalelo`; `b2` by `cappuccino`, `assassino`; `b3` by `ambalabu`; `b4` by `tungtung`, `sahur`. (The combined boss name contains the other boss names, which is why `b5` goes first.) Add `boneca` to `b3` only if no other file matched `b5` or `b3`.

**Minions** (folder hint: `minion`, `kroco`, `enemy`, `monster`): size from `small`/`kecil`/`s`, `medium`/`sedang`/`m`, `large`/`big`/`besar`/`l`; area from a digit in `area`, `stage`, `a` or `s` + number, or from the area names. There should be 15 (3 sizes x 5 areas) but the count may differ. If names do not say area and size, sort the files by path and assign area-major, size order small, medium, large; log it as a Decision; the owner can correct it in `assets.map.js`. Display name = cleaned file name (Title Case).

**Optional images**: `logo`; `player` or `otak` (the "Otak Sehat" portrait); `qr` (donation QR); `meme` or `book` (Meme Book polaroid image; if absent, use the boss or candy art); `ach` or `emblem` (achievement emblems; if absent, draw icon badges). Boss effect banner icons: a file name with `effect`/`efek` (or starting with `fx`) plus `shuffle`/`acak` -> `fx.shuffle`, `devour`/`remove`/`lahap`/`eat` -> `fx.remove10`, `freeze`/`beku`/`ice`/`frozen` -> `fx.freeze` (checked before boss names); if absent, the emoji from `src/config/effects.config.js` is used. Max stored size 256 px; fitted contain inside the banner's square badge.

**Audio keys**: `bgm.menu` (`menu`, `start`, `title`, `main`), `bgm.story` (`story`), `bgm.timekill` (`timekill`, `time kill`, `timekiller`, `tk`), `sfx.hit` (`hit`, `damage`), `sfx.boss.b1` to `sfx.boss.b5` (same hints as the bosses above, `b5` first), `sfx.minion.<name>` (a monster file whose name matches a minion name). Optional if present: `sfx.match`, `sfx.swap`, `sfx.invalid`, `sfx.win`, `sfx.lose`, `sfx.click`, `sfx.powerup`, `sfx.freeze`. Missing optional sfx get short generated sounds. Missing bgm means silence for that scene.

**Easter egg media** (`easteregg/`, owner folder, read-only like `visual/` and `audio/`): copied as-is to `public/assets/easteregg/` and listed under `easterEggs` in the manifest. `67`/`earrape` -> `egg.c67`; `ambatukam`/`termuwani` -> `egg.ambatukam`; `skibid`/`jumpscare` -> `egg.skibidi` (video); image `5000` -> `egg.less5000`. The low-score egg sound lives in `audio/`: `less5000` -> `sfx.egg.less5000`. A missing file just disables that egg.

## 4. Size normalization (assets have different sizes; in game they must look consistent)
- Never stretch: scaleX always equals scaleY.
- All sizing goes through `ui/SpriteFit` and `core/assets/fit.js` (pure, tested). Scenes never call `setScale` with a number.
- **Candy tiles:** all 6 candies are fitted by their trimmed size so the longer visible side is 80 percent of the cell, centered. So a big and a small source file give the same visible size.
- **Portraits** (player, boss, minion, polaroid): fit "contain" into the slot given by `LayoutManager`, centered horizontally, anchored to the bottom of the slot.
- **Logo and emblems:** fit "contain" into their slots.
- Max stored sizes (long side): candies 256 px, minion and boss and player portraits 768 px, logo 1024 px, QR 512 px, emblems 256 px. Never upscale.
- Use the display pixel ratio (cap in `screen.config.js`) so images stay sharp on phones.
- Placeholders (generated shapes with text labels) use the same fitting code.

## 5. Audio behavior
- Settings: Music slider and SFX slider, 0 to 100, defaults 70 and 80, saved. Both apply **live** (no restart). Gain = (value / 100) squared. Dragging the SFX slider and releasing plays the hit sound as a preview. The top-bar sound button toggles `muted` for everything (music and sfx) and shows its state.
- Music: one track at a time, looped. Menu scenes play `bgm.menu`; StageSelect and Battle play `bgm.story`; TimeKill and Results play `bgm.timekill`. Crossfade 500 ms when the track changes; do not restart a track that is already playing.
- SFX: pooled. Boss attack plays that boss's `sfx.boss.bN`; stage 5 (`b5`) plays `sfx.boss.b5`, or if missing a random other boss sfx. Player or enemy damage plays `sfx.hit` (at most one per 80 ms). A minion attack plays its own sfx if it has one, else `sfx.hit`. Hit and attack sounds must be audible even when the music is loud: music is ducked by 30 percent for 300 ms on a boss attack (config).
- Unlock on the first tap ("Tap to start" in Boot). Pause audio when the tab is hidden and resume when visible.
- Per-key gain trims live in `src/config/audio.config.js` (default 1) so loud and quiet clips can be balanced without code changes.
- Defaults in `audio.config.js`: `{ musicVolume: 70, sfxVolume: 80, curve: 2, crossfadeMs: 500, hitMinGapMs: 80, duckAmount: 0.3, duckMs: 300 }`.

## 6. Placeholders
Generated by `PlaceholderArt`: candies = colored rounded shapes with a text code; minions and bosses = labeled blobs sized by role; QR = a box with the text "QR here"; sounds = short generated beeps. Every placeholder in use is listed in `PROGRESS.md`.
