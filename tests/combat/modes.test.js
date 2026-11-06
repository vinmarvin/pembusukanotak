import { describe, it, expect, beforeEach } from 'vitest';
import { FightEngine, bossRushEnemy } from '../../src/core/combat/index.js';
import { GAMEPLAY } from '../../src/config/gameplay.config.js';
import { RNG } from '../../src/core/rng.js';
import { StoryProgression } from '../../src/core/progression/story.js';
import { SaveManager } from '../../src/systems/SaveManager.js';

const HARD = GAMEPLAY.modes.hard;
const RUSH = GAMEPLAY.modes.bossRush;

// Deals exactly enough candies to defeat the current enemy.
function killCurrent(fight) {
  const candies = Math.ceil(fight.enemyHp / fight.currentAttack);
  return fight.dealPlayerDamage(candies);
}

describe('Hard mode (owner)', () => {
  it('spawns 5 small, 3 medium, 2 big minions, then the boss', () => {
    const fight = new FightEngine(2, { mode: 'hard', rng: new RNG(1) });
    const seen = [];
    while (!fight.isStageComplete) {
      seen.push(fight.enemy.isBoss ? 'boss' : fight.enemy.size);
      killCurrent(fight);
    }
    expect(seen).toEqual(['small', 'small', 'small', 'small', 'small', 'medium', 'medium', 'medium', 'large', 'large', 'boss']);
    expect(fight.totalEnemies).toBe(11);
  });

  it('keeps player HP between enemies (no heal after a defeat)', () => {
    const fight = new FightEngine(1, { mode: 'hard', rng: new RNG(2) });
    fight.playerHp = 88;
    const res = killCurrent(fight);
    expect(res.defeated).toBe(true);
    expect(res.healed).toBe(0);
    expect(fight.playerHp).toBe(88);
  });

  it('normal mode still heals to full after a defeat', () => {
    const fight = new FightEngine(1, { mode: 'normal', rng: new RNG(3) });
    fight.playerHp = 40;
    killCurrent(fight);
    expect(fight.playerHp).toBe(fight.playerMaxHp);
    expect(fight.totalEnemies).toBe(6);
  });

  it('heal charges after 100 destroyed candies and restores 30% of max HP', () => {
    const fight = new FightEngine(1, { mode: 'hard', rng: new RNG(4) });
    fight.playerHp = 20;
    expect(fight.canHeal()).toBe(false);
    for (let i = 0; i < HARD.heal.candiesToCharge - 1; i++) fight.dealPlayerDamage(1);
    expect(fight.canHeal()).toBe(false);
    fight.dealPlayerDamage(1);
    expect(fight.canHeal()).toBe(true);
    const healed = fight.useHeal();
    expect(healed).toBe(Math.round(fight.playerMaxHp * HARD.heal.healPct));
    expect(fight.playerHp).toBe(20 + healed);
    expect(fight.healCharge).toBe(0);
    expect(fight.canHeal()).toBe(false);
  });

  it('damage boost doubles attack for 5 s and is ready again after 60 s', () => {
    const fight = new FightEngine(1, { mode: 'hard', rng: new RNG(5) });
    const base = fight.playerAttack;
    expect(fight.canBoost()).toBe(true);
    expect(fight.useBoost()).toBe(true);
    expect(fight.currentAttack).toBe(base * HARD.damageBoost.multiplier);
    expect(fight.dealPlayerDamage(3).damage).toBe(3 * base * HARD.damageBoost.multiplier);
    expect(fight.useBoost()).toBe(false);
    fight.tick(HARD.damageBoost.durationSec);
    expect(fight.boostActive).toBe(false);
    expect(fight.currentAttack).toBe(base);
    fight.tick(HARD.damageBoost.cooldownSec - HARD.damageBoost.durationSec - 0.1);
    expect(fight.canBoost()).toBe(false);
    fight.tick(0.2);
    expect(fight.canBoost()).toBe(true);
  });

  it('normal mode has no power-ups', () => {
    const fight = new FightEngine(1, { rng: new RNG(6) });
    for (let i = 0; i < 120; i++) fight.dealPlayerDamage(0);
    expect(fight.canHeal()).toBe(false);
    expect(fight.canBoost()).toBe(false);
  });
});

describe('Boss Rush (owner)', () => {
  it('uses the configured Story stage stats', () => {
    const fight = new FightEngine(1, { mode: 'bossRush', rng: new RNG(7) });
    expect(fight.playerMaxHp).toBe(GAMEPLAY.player.baseHp + (RUSH.playerStage - 1) * GAMEPLAY.player.hpPerStage);
    expect(fight.enemy.isBoss).toBe(true);
    expect(fight.totalEnemies).toBe(Infinity);
  });

  it('every 10th boss is the combined final boss, the others come from stages 1-4', () => {
    const rng = new RNG(8);
    for (let i = 0; i < 40; i++) {
      const boss = bossRushEnemy(i, rng);
      if ((i + 1) % 10 === 0) {
        expect(boss.id).toBe('b5');
        expect(boss.name).toBe('Trippa Troppa Tralala Lirila Tung Tung Sahur Boneca Crocodina');
      } else {
        expect(['b1', 'b2', 'b3', 'b4']).toContain(boss.id);
      }
    }
  });

  it('adds +20 HP and +2 damage for every 10 bosses defeated', () => {
    const rng = new RNG(9);
    const b10 = bossRushEnemy(9, rng);
    expect(b10.maxHp).toBe(GAMEPLAY.enemies.boss.hpStage5);
    expect(b10.dmg).toBe(GAMEPLAY.enemies.boss.dmg);
    const b11 = bossRushEnemy(10, rng);
    expect(b11.maxHp).toBe(GAMEPLAY.enemies.boss.hp + 20);
    expect(b11.dmg).toBe(GAMEPLAY.enemies.boss.dmg + 2);
    const b30 = bossRushEnemy(29, rng);
    expect(b30.maxHp).toBe(GAMEPLAY.enemies.boss.hpStage5 + 40);
    expect(b30.dmg).toBe(GAMEPLAY.enemies.boss.dmg + 4);
  });

  it('keeps HP between bosses and heals 50% after every 5 bosses', () => {
    const fight = new FightEngine(1, { mode: 'bossRush', rng: new RNG(10) });
    fight.playerHp = 50;
    for (let i = 1; i <= 4; i++) {
      const res = killCurrent(fight);
      expect(res.healed).toBe(0);
      expect(fight.playerHp).toBe(50);
    }
    const res = killCurrent(fight);
    expect(res.healed).toBe(Math.round(fight.playerMaxHp * RUSH.healPct));
    expect(fight.playerHp).toBe(50 + res.healed);
    expect(fight.isStageComplete).toBe(false);
    expect(fight.defeatedCount).toBe(5);
  });

  it('boss rush attack damage includes the tier bonus', () => {
    const fight = new FightEngine(1, { mode: 'bossRush', rng: new RNG(11) });
    for (let i = 0; i < 10; i++) killCurrent(fight);
    fight.playerHp = fight.playerMaxHp;
    const ev = fight.tick(fight.countdown);
    expect(ev.damage).toBe(GAMEPLAY.enemies.boss.dmg + RUSH.dmgPerTier);
  });
});

describe('Extra mode progression', () => {
  beforeEach(() => SaveManager.reset());

  it('hard mode and boss rush stay locked until Story Mode is finished', () => {
    expect(StoryProgression.areExtraModesUnlocked()).toBe(false);
    expect(StoryProgression.isHardStageUnlocked(1)).toBe(false);
    StoryProgression.onStageCleared(5);
    expect(StoryProgression.areExtraModesUnlocked()).toBe(true);
    expect(StoryProgression.isHardStageUnlocked(1)).toBe(true);
    expect(StoryProgression.isHardStageUnlocked(2)).toBe(false);
  });

  it('hard stages unlock one by one, separately from normal progress', () => {
    StoryProgression.onStageCleared(5);
    StoryProgression.onHardStageCleared(1);
    expect(SaveManager.data.hardStageCleared).toBe(1);
    expect(StoryProgression.isHardStageUnlocked(2)).toBe(true);
    expect(StoryProgression.isHardStageUnlocked(3)).toBe(false);
    expect(SaveManager.data.stageCleared).toBe(5);
  });

  it('saves the best boss rush run', () => {
    expect(StoryProgression.onBossRushEnd(7)).toEqual({ best: 7, isNewBest: true });
    expect(StoryProgression.onBossRushEnd(3)).toEqual({ best: 7, isNewBest: false });
    expect(SaveManager.data.bossRushBest).toBe(7);
  });
});
