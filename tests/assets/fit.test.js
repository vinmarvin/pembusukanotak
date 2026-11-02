import { describe, it, expect } from 'vitest';
import { fitCandy, fitContain, fitPortrait } from '../../src/core/assets/fit.js';

describe('Sprite Fitting (ASSETS_SPEC Section 4 & Phase 1 Gate)', () => {
  const sampleCandySizes = [
    { name: 'small candy', w: 64, h: 64 },
    { name: 'tall candy', w: 100, h: 250 },
    { name: 'wide candy', w: 300, h: 120 },
    { name: 'high-res candy', w: 1024, h: 1024 },
    { name: 'asymmetric 67', w: 180, h: 220 },
    { name: 'asymmetric bluberini', w: 240, h: 190 }
  ];

  sampleCandySizes.forEach(({ name, w, h }) => {
    it(`fits ${name} such that longer side = 80% of cell (within 1px) and scaleX === scaleY`, () => {
      const cellSizes = [40, 64, 80, 100];
      for (const cellSize of cellSizes) {
        const fit = fitCandy(w, h, cellSize);
        expect(fit.scaleX).toBe(fit.scaleY);
        const expectedLonger = 0.8 * cellSize;
        expect(Math.abs(fit.longerSide - expectedLonger)).toBeLessThanOrEqual(1.0);
      }
    });
  });

  it('fits portraits inside slot with scaleX === scaleY and bottom anchor', () => {
    const slot = { x: 100, y: 100, width: 200, height: 250 };
    const portraitSizes = [
      { w: 500, h: 600 },
      { w: 800, h: 400 },
      { w: 150, h: 150 }
    ];

    portraitSizes.forEach(({ w, h }) => {
      const fit = fitPortrait(w, h, slot);
      expect(fit.scaleX).toBe(fit.scaleY);
      expect(fit.visibleWidth).toBeLessThanOrEqual(slot.width + 0.001);
      expect(fit.visibleHeight).toBeLessThanOrEqual(slot.height + 0.001);
      expect(fit.originX).toBe(0.5);
      expect(fit.originY).toBe(1.0);
      expect(fit.x).toBe(slot.x + slot.width / 2);
      expect(fit.y).toBe(slot.y + slot.height);
    });
  });
});

