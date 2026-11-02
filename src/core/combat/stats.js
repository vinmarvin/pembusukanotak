// src/core/combat/stats.js
// Player stats calculation per stage according to GAME_SPEC section 5.2.
import { GAMEPLAY } from '../../config/gameplay.config.js';

export function statsForStage(stage, isDebug = false) {
  const s = Math.max(1, Math.min(GAMEPLAY.stages, stage));
  const baseHp = GAMEPLAY.player.baseHp;
  const hpPerStage = GAMEPLAY.player.hpPerStage;
  const baseAttack = GAMEPLAY.player.baseAttack;
  const attackPerStage = GAMEPLAY.player.attackPerStage;

  const maxHp = baseHp + (s - 1) * hpPerStage;
  let attack = baseAttack + (s - 1) * attackPerStage;

  if (isDebug && GAMEPLAY.debug.allowQueryFlag) {
    attack *= GAMEPLAY.debug.attackMultiplier;
  }

  return {
    stage: s,
    maxHp,
    attack
  };
}

