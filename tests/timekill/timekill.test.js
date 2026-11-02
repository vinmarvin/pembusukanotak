import { describe, it, expect, beforeEach } from 'vitest';
import { TimeKillEngine } from '../../src/core/timekill/timekill.js';
import { SaveManager } from '../../src/systems/SaveManager.js';
import { RNG } from '../../src/core/rng.js';

describe('Time Kill Engine (GAME_SPEC Section 5.6 & Decisions 11-16)', () => {
  const rng = new RNG(123);

  beforeEach(() => {
    SaveManager.reset();
  });

  it('initializes with 120s and 0 score', () => {
    const tk = new TimeKillEngine({ rng });
    expect(tk.timeLeft).toBe(120);
    expect(tk.score).toBe(0);
    expect(tk.isGameOver).toBe(false);
  });

  it('subtracts 10s on wrong swap penalty', () => {
    const tk = new TimeKillEngine({ rng });
    const res = tk.onWrongSwap();
    expect(res.penalty).toBe(10);
    expect(tk.timeLeft).toBe(110);
  });

  it('ends run immediately when timer reaches 0 from penalties or time drain', () => {
    const tk = new TimeKillEngine({ rng });
    // 12 penalties = -120s
    for (let i = 0; i < 11; i++) {
      tk.onWrongSwap();
    }
    expect(tk.timeLeft).toBe(10);
    expect(tk.isGameOver).toBe(false);

    tk.onWrongSwap();
    expect(tk.timeLeft).toBe(0);
    expect(tk.isGameOver).toBe(true);
  });

  it('awards +5s on 4+ match and +5s on combo cascades', () => {
    const tk = new TimeKillEngine({ rng });

    // Mock move result with 4-match and 1 cascade
    const mockResult = {
      valid: true,
      steps: [
        {
          index: 0,
          longestRun: 4,
          cleared: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }],
          powerEvents: []
        },
        {
          index: 1,
          longestRun: 3,
          cleared: [{ r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }],
          powerEvents: []
        }
      ]
    };

    const summary = tk.onMoveResolved(mockResult);
    expect(summary.timeBonus).toBe(10); // 5s for match4 + 5s for cascade combo
    expect(tk.timeLeft).toBe(130);
    expect(summary.candiesCleared).toBe(7);
    expect(summary.pointsGained).toBe(700);
    expect(tk.score).toBe(700);
  });

  it('pauses timer drain during freeze power-up', () => {
    const tk = new TimeKillEngine({ rng });
    tk.freezeRemaining = 15;

    // Tick 5 seconds
    tk.tick(5.0);
    expect(tk.freezeRemaining).toBe(10);
    expect(tk.timeLeft).toBe(120); // Not drained!

    // Tick remaining 10 seconds of freeze
    tk.tick(10.0);
    expect(tk.freezeRemaining).toBe(0);
    expect(tk.timeLeft).toBe(120);

    // Tick 5 more seconds -> now drains
    tk.tick(5.0);
    expect(tk.timeLeft).toBe(115);
  });

  it('multiplies score by 5 during score multiplier and unlocks Score Hunter at 45000', () => {
    const tk = new TimeKillEngine({ rng });
    tk.scoreMultRemaining = 10;

    const mockResult = {
      valid: true,
      steps: [
        {
          index: 0,
          longestRun: 3,
          cleared: Array.from({ length: 20 }, (_, i) => ({ r: 0, c: i })), // 20 candies
          powerEvents: []
        }
      ]
    };

    // 20 candies * 100 * 5 = 10,000 points!
    const summary = tk.onMoveResolved(mockResult);
    expect(summary.pointsGained).toBe(10000);
    expect(tk.score).toBe(10000);
    expect(SaveManager.data.achievements.scoreHunter).toBe(false);

    // Reaching 45,000 unlocks Score Hunter
    tk.score = 45000;
    tk.finishRun();
    expect(SaveManager.data.achievements.scoreHunter).toBe(true);
    expect(SaveManager.data.bestScore).toBe(45000);
  });

  it('awards combo bonus exactly once (+5s) regardless of number of cascades', () => {
    const tk = new TimeKillEngine({ rng });
    // Move with 4 cascade steps
    const mockResult = {
      valid: true,
      steps: [
        { index: 0, longestRun: 3, cleared: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }] },
        { index: 1, longestRun: 3, cleared: [{ r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }] },
        { index: 2, longestRun: 3, cleared: [{ r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }] },
        { index: 3, longestRun: 3, cleared: [{ r: 3, c: 0 }, { r: 3, c: 1 }, { r: 3, c: 2 }] }
      ]
    };
    const summary = tk.onMoveResolved(mockResult);
    // only +5s for combo, no match4
    expect(summary.timeBonus).toBe(5);
    expect(tk.timeLeft).toBe(125);
  });

  it('does NOT award +5s bonus for 4-match occurring during cascade (step > 0)', () => {
    const tk = new TimeKillEngine({ rng });
    const mockResult = {
      valid: true,
      steps: [
        { index: 0, longestRun: 3, cleared: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }] },
        { index: 1, longestRun: 4, cleared: [{ r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 }] }
      ]
    };
    const summary = tk.onMoveResolved(mockResult);
    // Only +5s for combo, NOT +5s for cascade match-4
    expect(summary.timeBonus).toBe(5);
    expect(tk.timeLeft).toBe(125);
  });

  it('persists best score in SaveManager and reloads it on next engine creation', () => {
    SaveManager.reset();
    const tk1 = new TimeKillEngine({ rng });
    tk1.score = 8500;
    tk1.finishRun();
    expect(SaveManager.data.bestScore).toBe(8500);

    // SaveManager reload simulation
    SaveManager.load();
    const tk2 = new TimeKillEngine({ rng });
    expect(tk2.bestScore).toBe(8500);
  });
});

