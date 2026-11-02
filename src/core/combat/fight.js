// src/core/combat/fight.js
// Pure state machine for combat encounters within a stage.
import { statsForStage } from './stats.js';
import { enemyFor } from './enemy.js';
import { chooseBossEffect, applyBossEffect } from './bossEffects.js';

export class FightEngine {
  constructor(stage = 1, options = {}) {
    this.stage = stage;
    this.rng = options.rng || null;
    this.isDebug = options.isDebug || false;

    const stats = statsForStage(this.stage, this.isDebug);
    this.playerMaxHp = stats.maxHp;
    this.playerHp = this.playerMaxHp;
    this.playerAttack = stats.attack;

    this.enemyIndex = 0;
    this.initEnemy(this.enemyIndex);

    this.isFrozen = false;
    this.freezeTime = 0;
    this.isGameOver = false;
    this.isStageComplete = false;
  }

  initEnemy(index) {
    this.enemyIndex = index;
    this.enemy = enemyFor(this.stage, index);
    this.enemyHp = this.enemy.hp;
    this.countdown = this.enemy.intervalSec;
  }

  // Player attacks by matching candies
  dealPlayerDamage(candyCount) {
    if (this.isGameOver || this.isStageComplete) return { defeated: false, damage: 0 };

    const damage = candyCount * this.playerAttack;
    this.enemyHp = Math.max(0, this.enemyHp - damage);

    if (this.enemyHp === 0) {
      if (this.enemyIndex < 5) {
        // Defeated minion -> heal to full HP and spawn next enemy
        this.playerHp = this.playerMaxHp;
        this.initEnemy(this.enemyIndex + 1);
        return {
          defeated: true,
          damage,
          nextEnemy: this.enemy,
          stageComplete: false
        };
      } else {
        // Defeated boss -> stage cleared
        this.isStageComplete = true;
        return {
          defeated: true,
          damage,
          nextEnemy: null,
          stageComplete: true
        };
      }
    }

    return { defeated: false, damage };
  }

  // Tick the game clock
  tick(deltaSec, boardGrid = null) {
    if (this.isGameOver || this.isStageComplete) return null;

    // Handle freeze
    if (this.isFrozen) {
      this.freezeTime = Math.max(0, this.freezeTime - deltaSec);
      if (this.freezeTime === 0) {
        this.isFrozen = false;
      }
    }

    // Tick enemy countdown (countdown keeps ticking even while frozen or in anim per Decision 4)
    this.countdown = Math.max(0, this.countdown - deltaSec);

    if (this.countdown === 0) {
      // Enemy attacks!
      return this.triggerEnemyAttack(boardGrid);
    }

    return null;
  }

  triggerEnemyAttack(boardGrid = null) {
    this.countdown = this.enemy.intervalSec;

    let damage = 0;
    let effect = null;
    let effectResult = null;

    if (this.enemy.isBoss) {
      damage = this.enemy.dmg; // 5
      effect = chooseBossEffect(this.rng);
      if (effect === 'freeze') {
        this.isFrozen = true;
        this.freezeTime = 5;
      }
      if (boardGrid && (effect === 'shuffle' || effect === 'remove10')) {
        effectResult = applyBossEffect(effect, boardGrid, this.rng);
      }
    } else {
      // Minion: random integer 2, 3, or 4
      damage = this.rng
        ? this.rng.gameInt(this.enemy.dmgMin, this.enemy.dmgMax)
        : Math.floor(Math.random() * (this.enemy.dmgMax - this.enemy.dmgMin + 1)) + this.enemy.dmgMin;
    }

    this.playerHp = Math.max(0, this.playerHp - damage);
    if (this.playerHp === 0) {
      this.isGameOver = true;
    }

    return {
      attacker: this.enemy.isBoss ? 'boss' : 'minion',
      enemy: this.enemy,
      damage,
      effect,
      effectResult,
      playerHp: this.playerHp,
      isGameOver: this.isGameOver
    };
  }
}

