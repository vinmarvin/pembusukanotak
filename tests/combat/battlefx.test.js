// tests/combat/battlefx.test.js
// Enemy taunt bubble (GAME_SPEC decision 37), Boss Rush callouts (decision 38),
// Detox Complete (decision 39) and the taunt bubble zone.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTauntState, registerWrongSwap, resetWrongSwaps, tauntPool, pickLineIndex, nextTauntKey,
  calloutsEnabled, calloutTier, createCalloutState, startMove, onBreak
} from '../../src/core/combat/battlefx.js';
import { TAUNT_CONFIG, CALLOUT_CONFIG } from '../../src/config/battlefx.config.js';
import {
  checkDetoxComplete, visibleAchievements, countUnlockedAchievements, ACHIEVEMENTS_LIST
} from '../../src/core/unlocks/achievements.js';
import { ACHIEVEMENTS_CONFIG } from '../../src/config/achievements.config.js';
import { SaveManager, getDefaultSave } from '../../src/systems/SaveManager.js';
import { LayoutManager } from '../../src/systems/LayoutManager.js';
import { SCREEN_CONFIG } from '../../src/config/screen.config.js';
import { RNG } from '../../src/core/rng.js';
import en from '../../src/i18n/en.js';
import id from '../../src/i18n/id.js';

describe('Enemy taunts (decision 37)', () => {
  it('taunts on the 5th wrong swap in a row, then the count restarts', () => {
    const s = createTauntState();
    const results = [];
    for (let i = 0; i < 10; i++) results.push(registerWrongSwap(s));
    expect(TAUNT_CONFIG.wrongSwapsToTaunt).toBe(5);
    expect(results).toEqual([false, false, false, false, true, false, false, false, false, true]);
  });

  it('a valid move or a new enemy resets the count', () => {
    const s = createTauntState();
    for (let i = 0; i < 4; i++) registerWrongSwap(s);
    resetWrongSwaps(s);
    for (let i = 0; i < 4; i++) expect(registerWrongSwap(s)).toBe(false);
    expect(registerWrongSwap(s)).toBe(true);
  });

  it('minions share one pool, each boss uses its own', () => {
    expect(tauntPool({ isBoss: false, id: 'minion_small_1_0' })).toBe('minion');
    for (const b of ['b1', 'b2', 'b3', 'b4', 'b5']) expect(tauntPool({ isBoss: true, id: b })).toBe(b);
  });

  it('never picks the same line twice in a row', () => {
    const rng = new RNG(42);
    const s = createTauntState();
    let prev = null;
    for (let i = 0; i < 200; i++) {
      const key = nextTauntKey(s, { isBoss: true, id: 'b4' }, () => rng.cosmetic());
      expect(key).not.toBe(prev);
      prev = key;
    }
    expect(pickLineIndex(1, 0, () => 0.9)).toBe(0);
  });

  it('every pool line exists in English and Indonesian', () => {
    for (const [pool, count] of Object.entries(TAUNT_CONFIG.pools)) {
      for (let i = 1; i <= count; i++) {
        expect(typeof en.taunts[pool][`l${i}`]).toBe('string');
        expect(typeof id.taunts[pool][`l${i}`]).toBe('string');
      }
      expect(Object.keys(en.taunts[pool])).toHaveLength(count);
    }
  });
});

describe('Boss Rush callouts (decision 38)', () => {
  it('only Boss Rush shows callouts', () => {
    expect(calloutsEnabled('bossRush')).toBe(true);
    expect(calloutsEnabled('normal')).toBe(false);
    expect(calloutsEnabled('hard')).toBe(false);
  });

  it('tiers: none for 1 break, then 2 / 3 / 4 / 5+', () => {
    expect(calloutTier(1)).toBeNull();
    expect(calloutTier(2).key).toBe('callouts.tier2');
    expect(calloutTier(3).key).toBe('callouts.tier3');
    expect(calloutTier(4).key).toBe('callouts.tier4');
    expect(calloutTier(5).key).toBe('callouts.tier5');
    expect(calloutTier(9).key).toBe('callouts.tier5');
  });

  it('counts breaks per move, live as each step lands', () => {
    const s = createCalloutState();
    startMove(s);
    expect([1, 2, 3, 4, 5].map(() => onBreak(s, false)?.key ?? null)).toEqual([
      null, 'callouts.tier2', 'callouts.tier3', 'callouts.tier4', 'callouts.tier5'
    ]);
    startMove(s);
    expect(onBreak(s, false)).toBeNull();
  });

  it('a kill stops callouts for the rest of the move and resets the count', () => {
    const s = createCalloutState();
    startMove(s);
    onBreak(s, false);
    expect(onBreak(s, false).key).toBe('callouts.tier2');
    expect(onBreak(s, true)).toBeNull();
    expect(s.breaks).toBe(0);
    expect(onBreak(s, false)).toBeNull();
    expect(onBreak(s, false)).toBeNull();
    startMove(s);
    onBreak(s, false);
    expect(onBreak(s, false).key).toBe('callouts.tier2');
  });

  it('callout text is the same slang in both languages', () => {
    for (const tier of CALLOUT_CONFIG.tiers) {
      const k = tier.key.split('.')[1];
      expect(id.callouts[k]).toBe(en.callouts[k]);
    }
  });
});

describe('Detox Complete (decision 39)', () => {
  const unlockAllVisible = (s) => {
    for (const a of ACHIEVEMENTS_LIST) if (!a.hidden) s.achievements[a.id] = true;
  };

  beforeEach(() => SaveManager.reset());

  it('is hidden and not counted until unlocked', () => {
    const s = SaveManager.data;
    expect(visibleAchievements(s).map((a) => a.id)).not.toContain('detoxComplete');
    unlockAllVisible(s);
    expect(countUnlockedAchievements(s)).toBe(ACHIEVEMENTS_CONFIG.total);
  });

  it('needs 20 bosses in the run', () => {
    const s = SaveManager.data;
    unlockAllVisible(s);
    expect(checkDetoxComplete(s, 19)).toBe(false);
    expect(checkDetoxComplete(s, 20)).toBe(true);
    expect(checkDetoxComplete(s, 21)).toBe(false); // already unlocked
  });

  it('strict: nothing happens if any other achievement is missing, even past 20', () => {
    const s = SaveManager.data;
    unlockAllVisible(s);
    s.achievements.fullyBrainRot = false;
    expect(checkDetoxComplete(s, 20)).toBe(false);
    expect(checkDetoxComplete(s, 35)).toBe(false);
    expect(s.achievements.detoxComplete).toBe(false);
    // The missing one is unlocked mid-run: the next boss kill (still 20+) unlocks it
    s.achievements.fullyBrainRot = true;
    expect(checkDetoxComplete(s, 36)).toBe(true);
  });

  it('once unlocked it shows as a 6th card and the count reads 6/5', () => {
    const s = SaveManager.data;
    unlockAllVisible(s);
    checkDetoxComplete(s, 20);
    expect(visibleAchievements(s).map((a) => a.id)).toContain('detoxComplete');
    expect(countUnlockedAchievements(s)).toBe(6);
    expect(ACHIEVEMENTS_CONFIG.total).toBe(5);
  });

  it('is part of the save and reset clears it', () => {
    expect(getDefaultSave().achievements.detoxComplete).toBe(false);
    SaveManager.update((s) => {
      unlockAllVisible(s);
      checkDetoxComplete(s, 20);
    });
    expect(SaveManager.data.achievements.detoxComplete).toBe(true);
    SaveManager.reset();
    expect(SaveManager.data.achievements.detoxComplete).toBe(false);
  });
});

describe('Taunt bubble zone (decision 37)', () => {
  const cfg = TAUNT_CONFIG.bubble;
  const sizes = [
    [1024, 768], [1180, 820], [1280, 800], [1366, 768], [1920, 1080],
    [844, 390], [874, 402], [390, 844], [768, 1024]
  ];
  const overlaps = (a, b) =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

  sizes.forEach(([w, h]) => {
    it(`never covers the board or the enemy card at ${w}x${h}`, () => {
      LayoutManager.updateDimensions(w, h);
      const layout = LayoutManager.getLayout();
      const m = LayoutManager.computeBoardMetrics(8, 7, layout.battle.board);
      const zone = LayoutManager.planTauntBubble(layout, m, { minWidth: cfg.minWidth, gap: cfg.gap });
      if (!layout.isLandscape || layout.isCompact) {
        expect(zone).toBeNull();
        return;
      }
      if (!zone) return; // no room: the bubble is simply not shown
      const pad = SCREEN_CONFIG.boardTrayPad;
      const tray = { x: m.startX - pad, y: m.startY - pad, width: m.boardWidth + pad * 2, height: m.boardHeight + pad * 2 };
      expect(zone.width).toBeGreaterThanOrEqual(cfg.minWidth);
      expect(overlaps(zone, tray)).toBe(false);
      expect(overlaps(zone, layout.battle.enemyCard)).toBe(false);
      expect(zone.x + zone.width).toBeLessThanOrEqual(w);
      expect(zone.y + zone.height).toBeLessThanOrEqual(h);
    });
  });

  it('there is room on a laptop (1366x768)', () => {
    LayoutManager.updateDimensions(1366, 768);
    const layout = LayoutManager.getLayout();
    const m = LayoutManager.computeBoardMetrics(8, 7, layout.battle.board);
    expect(LayoutManager.planTauntBubble(layout, m, { minWidth: cfg.minWidth, gap: cfg.gap })).not.toBeNull();
  });
});
