import { describe, it, expect } from 'vitest';
import { LayoutManager, TK_CHIP } from '../../src/systems/LayoutManager.js';
import { SCREEN_CONFIG } from '../../src/config/screen.config.js';

// Rectangles overlap when they share area (touching edges is fine).
const overlaps = (a, b) =>
  a.x < b.x + b.width - 0.5 && b.x < a.x + a.width - 0.5 && a.y < b.y + b.height - 0.5 && b.y < a.y + a.height - 0.5;

const inside = (r, w, h) => r.x >= -0.5 && r.y >= -0.5 && r.x + r.width <= w + 0.5 && r.y + r.height <= h + 0.5;

// The board as drawn: cells plus the tray padding around them.
const trayRect = (m) => {
  const pad = SCREEN_CONFIG.boardTrayPad;
  return { x: m.startX - pad, y: m.startY - pad, width: m.boardWidth + pad * 2, height: m.boardHeight + pad * 2 };
};

const chipRect = (p) => ({ x: p.x - TK_CHIP.w / 2, y: p.y - TK_CHIP.h / 2, width: TK_CHIP.w, height: TK_CHIP.h });

describe('LayoutManager (UI_SPEC Section 8 Responsive QA Checklist)', () => {
  const resolutions = [
    { w: 360, h: 800, name: 'Phone Portrait (360x800)' },
    { w: 390, h: 844, name: 'Phone Portrait (390x844)' },
    { w: 412, h: 915, name: 'Phone Portrait (412x915)' },
    { w: 844, h: 390, name: 'Phone Landscape (844x390)' },
    { w: 851, h: 393, name: 'Pixel 5 Landscape (851x393)' },
    { w: 870, h: 393, name: 'Redmi Landscape (870x393)' },
    { w: 874, h: 402, name: 'iPhone Landscape (874x402)' },
    { w: 768, h: 1024, name: 'Tablet Portrait (768x1024)' },
    { w: 820, h: 1180, name: 'Tablet Portrait (820x1180)' },
    { w: 1024, h: 768, name: 'Tablet Landscape (1024x768)' },
    { w: 1180, h: 820, name: 'iPad Landscape (1180x820)' },
    { w: 1280, h: 800, name: 'Galaxy Tab Landscape (1280x800)' },
    { w: 1366, h: 768, name: 'Laptop Landscape (1366x768)' },
    { w: 1920, h: 1080, name: 'Full HD Landscape (1920x1080)' }
  ];

  resolutions.forEach(({ w, h, name }) => {
    it(`places every Story and Time Kill element on screen without overlap: ${name}`, () => {
      LayoutManager.updateDimensions(w, h);
      const layout = LayoutManager.getLayout();

      expect(layout.width).toBe(w);
      expect(layout.height).toBe(h);
      expect(layout.uiScale).toBeGreaterThanOrEqual(0.6);
      expect(layout.uiScale).toBeLessThanOrEqual(1.6);
      // Layout must reserve at least what the TopBar really draws
      expect(layout.topBar.height).toBeGreaterThanOrEqual(SCREEN_CONFIG.topBarMinHeight);

      // Story (8x7)
      const b = layout.battle;
      const story = LayoutManager.computeBoardMetrics(8, 7, b.board);
      expect(story.boardWidth).toBe(story.cellSize * 8);
      expect(story.boardHeight).toBe(story.cellSize * 7);
      const storyTray = trayRect(story);
      const storyParts = [b.playerCard, b.enemyCard, b.vs, b.countdown, storyTray];
      for (const r of storyParts) {
        expect(inside(r, w, h)).toBe(true);
        expect(r.y).toBeGreaterThanOrEqual(layout.topBar.height);
      }
      for (let i = 0; i < storyParts.length; i++) {
        for (let j = i + 1; j < storyParts.length; j++) {
          expect(overlaps(storyParts[i], storyParts[j])).toBe(false);
        }
      }

      // Time Kill (8x8)
      const tk = layout.timeKill;
      const tkBoard = LayoutManager.computeBoardMetrics(8, 8, tk.board);
      const tkTray = trayRect(tkBoard);
      const tkParts = [tk.scoreCard, tk.bestCard, tk.timerBar, tkTray, chipRect(tk.freezeChip), chipRect(tk.x5Chip)];
      for (const r of tkParts) expect(inside(r, w, h)).toBe(true);
      for (let i = 0; i < tkParts.length; i++) {
        for (let j = i + 1; j < tkParts.length; j++) {
          expect(overlaps(tkParts[i], tkParts[j])).toBe(false);
        }
      }
    });
  });

  // Hard mode: heal + boost tiles (with their two caption lines) fit next to the board.
  resolutions.forEach(({ w, h, name }) => {
    it(`places the hard mode power-up tiles without overlap: ${name}`, () => {
      LayoutManager.updateDimensions(w, h);
      const layout = LayoutManager.getLayout();
      const b = layout.battle;
      const plan = LayoutManager.planPowerUps(layout, 8, 7);
      const cfg = SCREEN_CONFIG.powerUps;
      expect(plan.size).toBeGreaterThanOrEqual(cfg.minSize);
      const board = LayoutManager.computeBoardMetrics(8, 7, plan.boardZone);
      // Board stays playable (at least 30 px cells)
      expect(board.cellSize).toBeGreaterThanOrEqual(30);
      const capW = Math.max(plan.size, cfg.captionW);
      const tiles = plan.positions.map((p) => ({
        x: p.x - capW / 2,
        y: p.y - plan.size / 2,
        width: capW,
        height: plan.size + cfg.captionH
      }));
      const parts = [b.playerCard, b.enemyCard, b.vs, b.countdown, trayRect(board), ...tiles];
      for (const r of tiles) {
        expect(inside(r, w, h)).toBe(true);
        expect(r.y).toBeGreaterThanOrEqual(layout.topBar.height);
      }
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          expect(overlaps(parts[i], parts[j])).toBe(false);
        }
      }
    });
  });

  it('uses the compact side layout only on short landscape screens', () => {
    for (const [w, h, compact] of [[844, 390, true], [870, 393, true], [1024, 768, false], [1280, 800, false], [390, 844, false]]) {
      LayoutManager.updateDimensions(w, h);
      expect(LayoutManager.getLayout().isCompact).toBe(compact);
    }
  });

  it('gives phones in landscape a usable board (was ~30 px cells)', () => {
    for (const [w, h] of [[844, 390], [851, 393], [870, 393], [874, 402]]) {
      LayoutManager.updateDimensions(w, h);
      const layout = LayoutManager.getLayout();
      expect(LayoutManager.computeBoardMetrics(8, 7, layout.battle.board).cellSize).toBeGreaterThanOrEqual(42);
      expect(LayoutManager.computeBoardMetrics(8, 8, layout.timeKill.board).cellSize).toBeGreaterThanOrEqual(36);
    }
  });
});
