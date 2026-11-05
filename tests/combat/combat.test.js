import { describe, it, expect } from 'vitest';
import {
  statsForStage,
  enemyFor,
  chooseBossEffect,
  applyBossEffect,
  FightEngine
} from '../../src/core/combat/index.js';
import { createBoard } from '../../src/core/board/createBoard.js';
import { RNG } from '../../src/core/rng.js';

describe('Combat System & Boss Effects (GAME_SPEC Section 5)', () => {
  const rng = new RNG(100);

  it('computes correct player stats per stage without scaling corruption', () => {
    expect(statsForStage(1)).toEqual({ stage: 1, maxHp: 100, attack: 2 });
    expect(statsForStage(2)).toEqual({ stage: 2, maxHp: 120, attack: 3 });
    expect(statsForStage(3)).toEqual({ stage: 3, maxHp: 140, attack: 4 });
    expect(statsForStage(4)).toEqual({ stage: 4, maxHp: 160, attack: 5 });
    expect(statsForStage(5)).toEqual({ stage: 5, maxHp: 180, attack: 6 });

    // isDebug multiplies attack by 10 per GAMEPLAY.debug.attackMultiplier
    expect(statsForStage(1, true)).toEqual({ stage: 1, maxHp: 100, attack: 20 });
    expect(statsForStage(5, true)).toEqual({ stage: 5, maxHp: 180, attack: 60 });
  });

  it('verifies enemy stats are static and unscaled per stage', () => {
    for (let s = 1; s <= 5; s++) {
      // 2 small minions
      expect(enemyFor(s, 0).hp).toBe(50);
      expect(enemyFor(s, 1).hp).toBe(50);
      // 2 medium minions
      expect(enemyFor(s, 2).hp).toBe(150);
      expect(enemyFor(s, 3).hp).toBe(150);
      // 1 large minion
      expect(enemyFor(s, 4).hp).toBe(200);

      // Boss
      const boss = enemyFor(s, 5);
      expect(boss.isBoss).toBe(true);
      expect(boss.dmg).toBe(5);
      expect(boss.intervalSec).toBe(10);
      if (s === 5) {
        expect(boss.hp).toBe(350); // Decision 29
      } else {
        expect(boss.hp).toBe(250);
      }
    }
  });

  it('implements all 3 boss effects with pure behavior', () => {
    const board = createBoard(8, 7, rng);

    // Shuffle
    const shuffleRes = applyBossEffect('shuffle', board, rng);
    expect(shuffleRes.type).toBe('shuffle');

    // Remove 10
    const removeRes = applyBossEffect('remove10', board, rng);
    expect(removeRes.type).toBe('remove10');
    expect(removeRes.removedCells.length).toBe(10);

    // Freeze
    const freezeRes = applyBossEffect('freeze', board, rng);
    expect(freezeRes.type).toBe('freeze');
    expect(freezeRes.durationSec).toBe(5);
  });

  it('runs complete fight loop with injected clock and defeat heals to full', () => {
    const fight = new FightEngine(1, { rng });
    expect(fight.playerHp).toBe(100);
    expect(fight.enemy.hp).toBe(50);

    // Deal 50 damage -> defeats small minion
    const defRes = fight.dealPlayerDamage(25); // 25 candies * 2 attack = 50 damage
    expect(defRes.defeated).toBe(true);
    expect(fight.enemyIndex).toBe(1); // Next enemy
    expect(fight.playerHp).toBe(100); // Healed to full
  });

  it('triggers enemy attacks on countdown expiry and handles game over', () => {
    const fight = new FightEngine(1, { rng });
    // Advance time by 15s
    const attack = fight.tick(15.0);
    expect(attack).not.toBeNull();
    expect(attack.damage).toBeGreaterThanOrEqual(2);
    expect(attack.damage).toBeLessThanOrEqual(4);
    expect(fight.playerHp).toBe(100 - attack.damage);

    // Force player HP to 1 and trigger lethal hit
    fight.playerHp = 1;
    const lethal = fight.tick(15.0);
    expect(lethal.isGameOver).toBe(true);
    expect(fight.isGameOver).toBe(true);
  });
});

describe('Boss attack turn order (owner rule: boss damage, then player move, then boss effect)', () => {
  const bossFight = (seed) => {
    const fight = new FightEngine(1, { rng: new RNG(seed) });
    fight.initEnemy(5);
    return fight;
  };

  it('a boss attack without a grid deals damage now and defers the effect', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const fight = bossFight(seed);
      const attack = fight.tick(fight.enemy.intervalSec);
      expect(attack.attacker).toBe('boss');
      expect(attack.damage).toBe(5);
      expect(fight.playerHp).toBe(95);
      expect(attack.effectResult).toBeNull();
      expect(fight.isFrozen).toBe(false);
    }
  });

  it('player damage between the attack and the cast still counts', () => {
    const fight = bossFight(3);
    fight.tick(fight.enemy.intervalSec);
    const hpBefore = fight.enemyHp;
    fight.dealPlayerDamage(3);
    expect(fight.enemyHp).toBe(hpBefore - 3 * fight.playerAttack);
  });

  it('castBossEffect applies freeze and board effects later', () => {
    const fight = bossFight(5);
    const frozen = fight.castBossEffect('freeze', null);
    expect(frozen.type).toBe('freeze');
    expect(fight.isFrozen).toBe(true);
    expect(fight.freezeTime).toBe(5);

    const grid = createBoard(8, 7, new RNG(9));
    const res = fight.castBossEffect('remove10', grid);
    expect(res.removedCells.length).toBe(10);
    expect(grid.flat().every((c) => c !== null)).toBe(true);
  });

  it('no effect is cast after the boss is defeated', () => {
    const fight = bossFight(7);
    fight.tick(fight.enemy.intervalSec);
    fight.dealPlayerDamage(1000);
    expect(fight.isStageComplete).toBe(true);
    expect(fight.castBossEffect('freeze', null)).toBeNull();
    expect(fight.isFrozen).toBe(false);
  });
});

describe('Balance Reference Simulation (GAME_SPEC Section 5.10)', () => {
  it('verifies all 5 stages clear within the player HP budget according to formula', () => {
    const expectedTable = [
      { stage: 1, hp: 100, worstMinionDmg: 24, bossDmg: 80 },
      { stage: 2, hp: 120, worstMinionDmg: 15, bossDmg: 55 },
      { stage: 3, hp: 140, worstMinionDmg: 12, bossDmg: 40 },
      { stage: 4, hp: 160, worstMinionDmg: 9, bossDmg: 30 },
      { stage: 5, hp: 180, worstMinionDmg: 6, bossDmg: 35 }
    ];

    for (const row of expectedTable) {
      const stats = statsForStage(row.stage);
      expect(stats.maxHp).toBe(row.hp);

      // Large minion simulation
      const largeMinion = enemyFor(row.stage, 4);
      const minionCandies = largeMinion.hp / stats.attack;
      const minionMatches = minionCandies / 3;
      const minionFightTime = minionMatches * 4;
      const minionAttacks = Math.floor(minionFightTime / largeMinion.intervalSec);
      const minionDamageTaken = minionAttacks * 3; // average 3
      expect(minionDamageTaken).toBe(row.worstMinionDmg);
      expect(minionDamageTaken).toBeLessThan(stats.maxHp);

      // Boss simulation
      const boss = enemyFor(row.stage, 5);
      const bossCandies = boss.hp / stats.attack;
      const bossMatches = bossCandies / 3;
      const bossFightTime = bossMatches * 4;
      const bossAttacks = Math.floor(bossFightTime / boss.intervalSec);
      const bossDamageTaken = bossAttacks * 5;
      expect(bossDamageTaken).toBe(row.bossDmg);
      expect(bossDamageTaken).toBeLessThan(stats.maxHp);
    }
  });
});

