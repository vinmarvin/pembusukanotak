import { describe, it, expect } from 'vitest';
import { RNG } from '../../src/core/rng.js';

describe('RNG (Mulberry32)', () => {
  it('produces deterministic sequences for the same seed', () => {
    const rng1 = new RNG(42);
    const rng2 = new RNG(42);

    const seq1 = [rng1.game(), rng1.game(), rng1.gameInt(1, 10)];
    const seq2 = [rng2.game(), rng2.game(), rng2.gameInt(1, 10)];

    expect(seq1).toEqual(seq2);
  });

  it('generates values within bounds for gameInt', () => {
    const r = new RNG(999);
    for (let i = 0; i < 100; i++) {
      const val = r.gameInt(2, 4);
      expect(val).toBeGreaterThanOrEqual(2);
      expect(val).toBeLessThanOrEqual(4);
    }
  });

  it('keeps game and cosmetic streams distinct', () => {
    const r = new RNG(12345);
    const g = r.game();
    const c = r.cosmetic();
    expect(g).not.toBe(c);
  });
});

