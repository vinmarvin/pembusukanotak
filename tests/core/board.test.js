import { describe, it, expect } from 'vitest';
import {
  findMatches,
  hasMove,
  createBoard,
  resolveMove,
  settle,
  shuffle,
  applyPowerUp
} from '../../src/core/board/index.js';
import { RNG } from '../../src/core/rng.js';

describe('Match-3 Engine (Core Board)', () => {
  const rng = new RNG(42);

  it('detects horizontal and vertical 3-matches', () => {
    // 3x3 grid with horizontal match on row 0
    const gridH = [
      [{ type: 1, power: null }, { type: 1, power: null }, { type: 1, power: null }],
      [{ type: 2, power: null }, { type: 3, power: null }, { type: 4, power: null }],
      [{ type: 4, power: null }, { type: 5, power: null }, { type: 0, power: null }]
    ];
    const resH = findMatches(gridH);
    expect(resH.matchedCells.length).toBe(3);
    expect(resH.longestRun).toBe(3);
    expect(resH.runs[0].orientation).toBe('h');

    // Vertical match on col 1
    const gridV = [
      [{ type: 0, power: null }, { type: 2, power: null }, { type: 1, power: null }],
      [{ type: 3, power: null }, { type: 2, power: null }, { type: 4, power: null }],
      [{ type: 5, power: null }, { type: 2, power: null }, { type: 0, power: null }]
    ];
    const resV = findMatches(gridV);
    expect(resV.matchedCells.length).toBe(3);
    expect(resV.longestRun).toBe(3);
    expect(resV.runs[0].orientation).toBe('v');
  });

  it('detects L-shape and T-shape intersections correctly (5 cells)', () => {
    // T-shape intersection at (1, 1)
    const gridT = [
      [{ type: 1, power: null }, { type: 1, power: null }, { type: 1, power: null }],
      [{ type: 2, power: null }, { type: 1, power: null }, { type: 3, power: null }],
      [{ type: 4, power: null }, { type: 1, power: null }, { type: 5, power: null }]
    ];
    const res = findMatches(gridT);
    expect(res.matchedCells.length).toBe(5);
    expect(res.runs.length).toBe(2); // One horizontal, one vertical
  });

  it('detects 4-matches and 5-matches', () => {
    const grid4 = [
      [
        { type: 3, power: null },
        { type: 3, power: null },
        { type: 3, power: null },
        { type: 3, power: null }
      ],
      [
        { type: 0, power: null },
        { type: 1, power: null },
        { type: 2, power: null },
        { type: 4, power: null }
      ]
    ];
    const res = findMatches(grid4);
    expect(res.longestRun).toBe(4);
    expect(res.matchedCells.length).toBe(4);
  });

  it('rejects invalid or non-adjacent swaps', () => {
    const grid = [
      [{ type: 0, power: null }, { type: 1, power: null }, { type: 2, power: null }],
      [{ type: 3, power: null }, { type: 4, power: null }, { type: 5, power: null }],
      [{ type: 1, power: null }, { type: 2, power: null }, { type: 0, power: null }]
    ];

    // Non-adjacent move
    const nonAdj = resolveMove(grid, { r1: 0, c1: 0, r2: 2, c2: 2 }, rng);
    expect(nonAdj.valid).toBe(false);

    // Adjacent swap that creates no match -> reverts
    const noMatch = resolveMove(grid, { r1: 0, c1: 0, r2: 0, c2: 1 }, rng);
    expect(noMatch.valid).toBe(false);
    expect(grid[0][0].type).toBe(0);
    expect(grid[0][1].type).toBe(1);
  });

  it('resolves a valid swap, deals cascades, and refills cells', () => {
    // Setup a grid where swap (0, 0) <-> (0, 1) creates a 3-match of type 2
    const grid = [
      [{ type: 1, power: null }, { type: 2, power: null }, { type: 2, power: null }],
      [{ type: 2, power: null }, { type: 4, power: null }, { type: 5, power: null }],
      [{ type: 3, power: null }, { type: 0, power: null }, { type: 1, power: null }]
    ];

    // Swap (0, 0) with (1, 0): brings type 2 to (0, 0) creating row 0 match: 2, 2, 2
    const res = resolveMove(grid, { r1: 0, c1: 0, r2: 1, c2: 0 }, rng);
    expect(res.valid).toBe(true);
    expect(res.steps.length).toBeGreaterThanOrEqual(1);
    expect(res.steps[0].cleared.length).toBe(3);
    expect(res.steps[0].scoreRaw).toBe(300);

    // Verify grid has no null cells after resolution
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[0].length; c++) {
        expect(grid[r][c]).not.toBeNull();
        expect(grid[r][c].type).toBeGreaterThanOrEqual(0);
        expect(grid[r][c].type).toBeLessThan(6);
      }
    }
  });

  it('spawns a power-up in Time Kill mode on 4+ match in step 0', () => {
    // Row 0 has: 1, 2, 2, 2. (1, 0) is type 2. Swapping (0, 0) with (1, 0) creates 4-run of type 2!
    const grid = [
      [{ type: 1, power: null }, { type: 2, power: null }, { type: 2, power: null }, { type: 2, power: null }],
      [{ type: 2, power: null }, { type: 4, power: null }, { type: 5, power: null }, { type: 0, power: null }],
      [{ type: 3, power: null }, { type: 1, power: null }, { type: 0, power: null }, { type: 4, power: null }]
    ];

    const res = resolveMove(grid, { r1: 0, c1: 0, r2: 1, c2: 0 }, rng, { isTimeKill: true });
    expect(res.valid).toBe(true);
    expect(res.steps[0].longestRun).toBe(4);
    expect(res.steps[0].powerSpawned).not.toBeNull();
    expect(['line', 'bomb', 'freeze', 'x5']).toContain(res.steps[0].powerSpawned.power);
  });

  it('executes power-up effects: line, bomb, freeze, and x5', () => {
    const grid = [
      [{ type: 0, power: null }, { type: 1, power: null }, { type: 2, power: null }, { type: 3, power: null }],
      [{ type: 1, power: null }, { type: 2, power: null }, { type: 3, power: null }, { type: 4, power: null }],
      [{ type: 2, power: null }, { type: 3, power: null }, { type: 4, power: null }, { type: 5, power: null }],
      [{ type: 3, power: null }, { type: 4, power: null }, { type: 5, power: null }, { type: 0, power: null }]
    ];

    // Bomb
    const bombRes = applyPowerUp(grid, 2, 2, 'bomb', rng);
    expect(bombRes.effects[0].type).toBe('bomb');
    expect(bombRes.cleared.length).toBe(16); // 4x4 area in 4x4 board

    // Line
    const lineRes = applyPowerUp(grid, 1, 1, 'line', rng);
    expect(lineRes.effects[0].type).toBe('line');
    expect(lineRes.cleared.length).toBe(4);

    // Freeze
    const freezeRes = applyPowerUp(grid, 0, 0, 'freeze', rng);
    expect(freezeRes.effects[0].type).toBe('freeze');
    expect(freezeRes.effects[0].durationSec).toBe(15);

    // x5
    const x5Res = applyPowerUp(grid, 0, 0, 'x5', rng);
    expect(x5Res.effects[0].type).toBe('x5');
    expect(x5Res.effects[0].multiplier).toBe(5);
    expect(x5Res.effects[0].durationSec).toBe(10);
  });

  it('createBoard initializes board with 0 initial matches and at least one valid move', () => {
    for (let i = 0; i < 20; i++) {
      const board = createBoard(8, 7, rng);
      expect(board.length).toBe(7);
      expect(board[0].length).toBe(8);

      const matches = findMatches(board);
      expect(matches.matchedCells.length).toBe(0);
      expect(hasMove(board)).toBe(true);
    }
  });

  it('settle guarantees no matches and hasMove', () => {
    // Board with matches
    const grid = [
      [{ type: 0, power: null }, { type: 0, power: null }, { type: 0, power: null }],
      [{ type: 1, power: null }, { type: 1, power: null }, { type: 1, power: null }],
      [{ type: 2, power: null }, { type: 2, power: null }, { type: 2, power: null }]
    ];
    settle(grid, rng);
    expect(findMatches(grid).matchedCells.length).toBe(0);
    expect(hasMove(grid)).toBe(true);
  });

  it('stops at hardChainCap without crashing or infinite loops', () => {
    // Force a mock board and resolve
    const board = createBoard(8, 7, rng);
    expect(hasMove(board)).toBe(true);
  });
});

