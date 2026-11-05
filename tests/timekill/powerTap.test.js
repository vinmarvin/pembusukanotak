// tests/timekill/powerTap.test.js
// Bug (owner playtest): tapping a power candy made nearby candies change type with no animation.
// The engine used settle() after the refill, rewriting new matches silently, while the view only
// animated the tap clear. Now every board change after a tap must be described by the returned
// steps, so replaying them on the old board gives exactly the engine's board.
import { describe, it, expect, beforeEach } from 'vitest';
import { TimeKillEngine } from '../../src/core/timekill/timekill.js';
import { SaveManager } from '../../src/systems/SaveManager.js';
import { RNG } from '../../src/core/rng.js';
import { createBoard, findMatches } from '../../src/core/board/index.js';

// What the BoardView does with the steps: remove cleared, move falls, add spawns.
function replay(view, steps) {
  for (const step of steps) {
    for (const cell of step.cleared) view[cell.r][cell.c] = null;
    const moved = step.falls.map((f) => ({ f, candy: view[f.fromR][f.fromC] }));
    for (const { f } of moved) view[f.fromR][f.fromC] = null;
    for (const { f, candy } of moved) view[f.toR][f.toC] = candy;
    for (const sp of step.spawns) view[sp.r][sp.c] = sp.candy;
  }
  return view;
}

const types = (grid) => grid.map((row) => row.map((c) => (c ? c.type : null)));

describe('Time Kill power tap', () => {
  beforeEach(() => {
    SaveManager.reset();
  });

  it('every change after a tap is in the animated steps (no silent rewrite)', () => {
    let sawCascade = false;
    for (let seed = 1; seed <= 300; seed++) {
      const rng = new RNG(seed);
      const grid = createBoard(8, 8, rng);
      const r = rng.gameInt(0, 7);
      const c = rng.gameInt(0, 7);
      grid[r][c].power = rng.gameChoice(['bomb', 'line', 'freeze', 'x5']);
      grid[r][c].orientation = rng.game() < 0.5 ? 'h' : 'v';

      const view = grid.map((row) => row.slice()); // what the screen shows before the tap
      const engine = new TimeKillEngine({ rng });
      const res = engine.triggerPowerUpAt(grid, r, c);

      expect(res.steps.length).toBeGreaterThanOrEqual(1);
      if (res.steps.length > 1) sawCascade = true;
      if (res.reshuffled) continue; // a reshuffle redraws the whole board on purpose

      expect(types(replay(view, res.steps))).toEqual(types(res.grid));
      expect(findMatches(res.grid).matchedCells.length).toBe(0);
    }
    expect(sawCascade).toBe(true);
  });

  it('scores the tap clear and its cascades at 100 per candy', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const rng = new RNG(seed);
      const grid = createBoard(8, 8, rng);
      grid[3][3].power = 'bomb';
      const engine = new TimeKillEngine({ rng });
      const res = engine.triggerPowerUpAt(grid, 3, 3);
      if (res.steps.length < 2) continue;
      const candies = res.steps.reduce((n, st) => n + st.cleared.length, 0);
      expect(res.pointsGained).toBe(candies * 100);
      expect(candies).toBeGreaterThan(16);
      return;
    }
    throw new Error('no seed produced a cascade after a bomb');
  });
});
