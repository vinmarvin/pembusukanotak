import { describe, it, expect } from 'vitest';
import { LayoutManager } from '../../src/systems/LayoutManager.js';

describe('LayoutManager (UI_SPEC Section 8 Responsive QA Checklist)', () => {
  const resolutions = [
    { w: 360, h: 800, name: 'Phone Portrait (360x800)' },
    { w: 390, h: 844, name: 'Phone Portrait (390x844)' },
    { w: 412, h: 915, name: 'Phone Portrait (412x915)' },
    { w: 844, h: 390, name: 'Phone Landscape (844x390)' },
    { w: 768, h: 1024, name: 'Tablet Portrait (768x1024)' },
    { w: 820, h: 1180, name: 'Tablet Portrait (820x1180)' },
    { w: 1024, h: 768, name: 'Tablet Landscape (1024x768)' },
    { w: 1366, h: 768, name: 'Laptop Landscape (1366x768)' },
    { w: 1920, h: 1080, name: 'Full HD Landscape (1920x1080)' }
  ];

  resolutions.forEach(({ w, h, name }) => {
    it(`computes non-overlapping valid layout for ${name} (Story 8x7 and TimeKill 8x8)`, () => {
      LayoutManager.updateDimensions(w, h);
      const layout = LayoutManager.getLayout();

      expect(layout.width).toBe(w);
      expect(layout.height).toBe(h);
      expect(layout.uiScale).toBeGreaterThanOrEqual(0.6);
      expect(layout.uiScale).toBeLessThanOrEqual(1.6);

      // Verify battle zones
      const b = layout.battle;
      expect(b.fighters.y).toBeGreaterThanOrEqual(layout.topBar.height);
      expect(b.countdown.y).toBeGreaterThanOrEqual(b.fighters.y + b.fighters.height);
      expect(b.board.y).toBeGreaterThanOrEqual(b.countdown.y + b.countdown.height);
      expect(b.board.y + b.board.height).toBeLessThanOrEqual(h);

      // Verify Story board metrics for 8x7
      const storyMetrics = LayoutManager.computeBoardMetrics(8, 7, b.board);
      expect(storyMetrics.cellSize).toBeGreaterThan(0);
      expect(storyMetrics.boardWidth).toBe(storyMetrics.cellSize * 8);
      expect(storyMetrics.boardHeight).toBe(storyMetrics.cellSize * 7);
      expect(storyMetrics.startX).toBeGreaterThanOrEqual(b.board.x);
      expect(storyMetrics.startY).toBeGreaterThanOrEqual(b.board.y);
      expect(storyMetrics.startX + storyMetrics.boardWidth).toBeLessThanOrEqual(b.board.x + b.board.width + 0.01);
      expect(storyMetrics.startY + storyMetrics.boardHeight).toBeLessThanOrEqual(b.board.y + b.board.height + 0.01);

      // Verify Time Kill board metrics for 8x8
      const tkMetrics = LayoutManager.computeBoardMetrics(8, 8, b.board);
      expect(tkMetrics.cellSize).toBeGreaterThan(0);
      expect(tkMetrics.boardWidth).toBe(tkMetrics.cellSize * 8);
      expect(tkMetrics.boardHeight).toBe(tkMetrics.cellSize * 8);
      expect(tkMetrics.startX).toBeGreaterThanOrEqual(b.board.x);
      expect(tkMetrics.startY).toBeGreaterThanOrEqual(b.board.y);
      expect(tkMetrics.startX + tkMetrics.boardWidth).toBeLessThanOrEqual(b.board.x + b.board.width + 0.01);
      expect(tkMetrics.startY + tkMetrics.boardHeight).toBeLessThanOrEqual(b.board.y + b.board.height + 0.01);
    });
  });
});

