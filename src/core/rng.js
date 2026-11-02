// src/core/rng.js
// Seedable RNG using Mulberry32 for deterministic game simulation and cosmetic effects.

function createMulberry32(seed) {
  let s = (seed >>> 0) || 1;
  return function next() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  constructor(seed = 123456789) {
    this._initialSeed = seed;
    this.reseed(seed);
  }

  reseed(seed) {
    this._seed = seed;
    this._gameRng = createMulberry32(seed);
    this._cosmeticRng = createMulberry32((seed ^ 0xCAFEBABE) >>> 0);
  }

  // Returns float in [0, 1) for gameplay-impacting outcomes
  game() {
    return this._gameRng();
  }

  // Returns integer in [min, max] inclusive for gameplay
  gameInt(min, max) {
    return Math.floor(this.game() * (max - min + 1)) + min;
  }

  // Choose one item from array deterministically
  gameChoice(array) {
    if (!array || array.length === 0) return null;
    return array[this.gameInt(0, array.length - 1)];
  }

  // Returns float in [0, 1) for cosmetic effects
  cosmetic() {
    return this._cosmeticRng();
  }

  cosmeticFloat(min, max) {
    return this.cosmetic() * (max - min) + min;
  }
}

export const rng = new RNG(Date.now());

