// src/core/combat/enemy.js
// Enemy generator per stage and encounter index (0 to 5) according to GAME_SPEC section 5.3 & 5.5.
import { GAMEPLAY } from '../../config/gameplay.config.js';
import { BOSSES_CONFIG } from '../../config/bosses.config.js';

export function enemyFor(stage, index, order = GAMEPLAY.stageOrder) {
  const s = Math.max(1, Math.min(GAMEPLAY.stages, stage));
  const typeKey = order[Math.max(0, Math.min(order.length - 1, index))];

  if (typeKey === 'boss') {
    const bossData = BOSSES_CONFIG.stages[s];
    const isStage5 = s === 5;
    const hp = isStage5 ? GAMEPLAY.enemies.boss.hpStage5 : GAMEPLAY.enemies.boss.hp;

    return {
      id: bossData.id,
      name: bossData.name,
      areaName: bossData.areaName,
      stage: s,
      index,
      isBoss: true,
      tag: 'BOSS',
      assetKey: bossData.assetKey,
      sfxKey: bossData.sfxKey,
      hp,
      maxHp: hp,
      dmg: GAMEPLAY.enemies.boss.dmg,
      intervalSec: GAMEPLAY.enemies.boss.intervalSec
    };
  }

  // Minion
  const minionConfig = GAMEPLAY.enemies[typeKey];
  const nameMap = {
    small: 'Small Minion',
    medium: 'Medium Minion',
    large: 'Big Minion'
  };

  return {
    id: `minion_${typeKey}_${s}_${index}`,
    name: nameMap[typeKey] || 'Minion',
    stage: s,
    index,
    isBoss: false,
    tag: 'MINION',
    size: typeKey,
    assetKey: typeKey,
    sfxKey: 'sfx.hit',
    hp: minionConfig.hp,
    maxHp: minionConfig.hp,
    dmgMin: minionConfig.dmgMin,
    dmgMax: minionConfig.dmgMax,
    intervalSec: minionConfig.intervalSec
  };
}


// Boss Rush (owner): the n-th boss of the run (index 0-based). Every finalBossEvery-th boss is the
// combined final boss; the others are picked at random from poolStages. After every tierEvery
// bosses defeated, bosses get +hpPerTier HP and +dmgPerTier damage on top of their base stats.
export function bossRushEnemy(index, rng = null) {
  const cfg = GAMEPLAY.modes.bossRush;
  const isFinal = (index + 1) % cfg.finalBossEvery === 0;
  let stage = cfg.finalBossStage;
  if (!isFinal) {
    const pool = cfg.poolStages;
    stage = rng ? rng.gameChoice(pool) : pool[Math.floor(Math.random() * pool.length)];
  }
  const base = enemyFor(stage, GAMEPLAY.stageOrder.length - 1);
  const tier = Math.floor(index / cfg.tierEvery);
  const hp = base.hp + tier * cfg.hpPerTier;
  return {
    ...base,
    index,
    tier,
    hp,
    maxHp: hp,
    dmg: base.dmg + tier * cfg.dmgPerTier
  };
}
