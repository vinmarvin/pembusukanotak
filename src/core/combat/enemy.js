// src/core/combat/enemy.js
// Enemy generator per stage and encounter index (0 to 5) according to GAME_SPEC section 5.3 & 5.5.
import { GAMEPLAY } from '../../config/gameplay.config.js';
import { BOSSES_CONFIG } from '../../config/bosses.config.js';

export function enemyFor(stage, index) {
  const s = Math.max(1, Math.min(GAMEPLAY.stages, stage));
  const order = GAMEPLAY.stageOrder || ['small', 'small', 'medium', 'medium', 'large', 'boss'];
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

