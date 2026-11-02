# Agent instructions (read this first)

Project: **Pembusukan Otak**, a Brainrot-themed match-3 combat game (Story Mode, Time Kill, Meme Book, Achievements, Settings, Credits) built with Phaser for web. It follows the owner's UI mockups in `design/`, uses the owner's assets in `visual/` and `audio/`, supports English and Indonesian, has live audio sliders, and is responsive on phone, tablet, and laptop. All specification and phase documents are organized in the `Agents/` folder.

Protocol, in this order, every time you start or resume work:

1. Open `Agents/PROGRESS.md`. It says which phase you are on and what is already done.
2. Read `Agents/GAME_SPEC.md` (rules, numbers, architecture, decisions). It is the single source of truth for gameplay.
3. Read only the section of `Agents/PHASES.md` for the phase you are working on.
4. Read `Agents/UI_SPEC.md` and `Agents/DESIGN_REFERENCE.md` in Phase 0, 4, 5, 6, 7, or whenever you touch layout, HUD, scenes, text, or input. The mockups in `design/` are the layout truth, except where `DESIGN_REFERENCE.md` lists a correction.
5. Read `Agents/ASSETS_SPEC.md` in Phase 0, 1, 7, 8, or whenever you touch assets, images, audio, or the asset scripts.
6. Read `Agents/CONTENT_LORE.md` in Phase 6 (Meme Book text).
7. Never invent numbers. Every constant lives in `src/config/`. Never hard-code visible text; every text goes through i18n.
8. Never modify, move, rename, or delete anything in `design/`, `visual/`, or `audio/`. They are read-only sources.
9. When a phase gate passes, tick it in `Agents/PROGRESS.md` and write one line in its Log before starting the next phase.
10. If your context is reset or compacted, go back to step 1. Do not rely on memory of earlier work.
11. If a spec file and your idea disagree, the spec wins. If the spec is silent, choose the simplest option and record it in the Decision log in `Agents/PROGRESS.md`.
12. Never change a number, rule, name, or feature on your own. No per-stage scaling of enemy HP or damage.
