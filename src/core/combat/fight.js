// src/core/combat/fight.js
// Pure state machine for combat encounters within a stage (Story normal / hard) or a Boss Rush run.
import { statsForStage } from './stats.js';
import { enemyFor, bossRushEnemy } from './enemy.js';
import { chooseBossEffect, applyBossEffect } from './bossEffects.js';
import { GAMEPLAY } from '../../config/gameplay.config.js';

export const FIGHT_MODES = ['normal', 'hard', 'bossRush'];

export class FightEngine {
  constructor(stage = 1, options = {}) {
    this.mode = FIGHT_MODES.includes(options.mode) ? options.mode : 'normal';
    this.stage = this.mode === 'bossRush' ? GAMEPLAY.modes.bossRush.playerStage : stage;
    this.rng = options.rng || null;
    this.isDebug = options.isDebug || false;

    const stats = statsForStage(this.stage, this.isDebug);
    this.playerMaxHp = stats.maxHp;
    this.playerHp = this.playerMaxHp;
    this.playerAttack = stats.attack;

    // Enemy list for this mode. Boss Rush has no end.
    this.order = this.mode === 'hard' ? GAMEPLAY.modes.hard.stageOrder : GAMEPLAY.stageOrder;
    this.totalEnemies = this.mode === 'bossRush' ? Infinity : this.order.length;
    this.defeatedCount = 0;

    // Hard mode power-ups (green heal, orange damage boost)
    this.hasPowerUps = this.mode === 'hard';
    this.healCharge = 0;
    this.boostTime = 0;
    this.boostCooldown = 0;

    this.enemyIndex = 0;
    this.initEnemy(this.enemyIndex);

    this.isFrozen = false;
    this.freezeTime = 0;
    this.isGameOver = false;
    this.isStageComplete = false;
  }

  initEnemy(index) {
    this.enemyIndex = index;
    this.enemy = this.mode === 'bossRush'
      ? bossRushEnemy(index, this.rng)
      : enemyFor(this.stage, index, this.order);
    this.enemyHp = this.enemy.hp;
    this.countdown = this.enemy.intervalSec;
  }

  get isLastEnemy() {
    return this.enemyIndex >= this.totalEnemies - 1;
  }

  get boostActive() {
    return this.boostTime > 0;
  }

  get currentAttack() {
    const mult = this.boostActive ? GAMEPLAY.modes.hard.damageBoost.multiplier : 1;
    return this.playerAttack * mult;
  }

  // HP restored after an enemy is defeated: Story normal heals to full, hard keeps HP,
  // Boss Rush heals a share of max HP after every healEvery bosses.
  healAfterDefeat() {
    if (this.mode === 'normal') return this.playerMaxHp - this.playerHp;
    if (this.mode === 'bossRush') {
      const cfg = GAMEPLAY.modes.bossRush;
      if (this.defeatedCount % cfg.healEvery === 0) return Math.round(this.playerMaxHp * cfg.healPct);
    }
    return 0;
  }

  heal(amount) {
    const before = this.playerHp;
    this.playerHp = Math.min(this.playerMaxHp, this.playerHp + Math.max(0, amount));
    return this.playerHp - before;
  }

  // ── Hard mode power-ups ───────────────────────────────────────────────────

  canHeal() {
    return this.hasPowerUps && !this.isGameOver && !this.isStageComplete
      && this.healCharge >= GAMEPLAY.modes.hard.heal.candiesToCharge;
  }

  useHeal() {
    if (!this.canHeal()) return 0;
    this.healCharge = 0;
    return this.heal(Math.round(this.playerMaxHp * GAMEPLAY.modes.hard.heal.healPct));
  }

  canBoost() {
    return this.hasPowerUps && !this.isGameOver && !this.isStageComplete
      && this.boostCooldown <= 0;
  }

  useBoost() {
    if (!this.canBoost()) return false;
    const cfg = GAMEPLAY.modes.hard.damageBoost;
    this.boostTime = cfg.durationSec;
    this.boostCooldown = cfg.cooldownSec;
    return true;
  }

  // Player attacks by matching candies
  dealPlayerDamage(candyCount) {
    if (this.isGameOver || this.isStageComplete) return { defeated: false, damage: 0 };

    if (this.hasPowerUps) {
      this.healCharge = Math.min(GAMEPLAY.modes.hard.heal.candiesToCharge, this.healCharge + candyCount);
    }

    const damage = candyCount * this.currentAttack;
    this.enemyHp = Math.max(0, this.enemyHp - damage);

    if (this.enemyHp === 0) {
      const defeatedEnemy = this.enemy;
      this.defeatedCount += 1;
      if (!this.isLastEnemy) {
        // Defeated enemy -> heal per mode rules and spawn the next enemy
        const healed = this.heal(this.healAfterDefeat());
        this.initEnemy(this.enemyIndex + 1);
        return {
          defeated: true,
          defeatedEnemy,
          damage,
          healed,
          nextEnemy: this.enemy,
          stageComplete: false
        };
      } else {
        // Defeated boss -> stage cleared
        this.isStageComplete = true;
        return {
          defeated: true,
          defeatedEnemy,
          damage,
          healed: 0,
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

    // Damage boost runs in game time like the enemy timers (decision 4).
    if (this.boostTime > 0) this.boostTime = Math.max(0, this.boostTime - deltaSec);
    if (this.boostCooldown > 0) this.boostCooldown = Math.max(0, this.boostCooldown - deltaSec);

    // Tick enemy countdown (countdown keeps ticking even while frozen or in anim per Decision 4)
    this.countdown = Math.max(0, this.countdown - deltaSec);

    if (this.countdown === 0) {
      // Enemy attacks!
      return this.triggerEnemyAttack(boardGrid);
    }

    return null;
  }

  // Apply a boss effect: freeze starts the input freeze; shuffle / remove10 change the grid in place.
  castBossEffect(effect, boardGrid) {
    if (this.isGameOver || this.isStageComplete) return null;
    if (effect === 'freeze') {
      this.isFrozen = true;
      this.freezeTime = GAMEPLAY.bossEffects.freezeSec;
      return { type: 'freeze', durationSec: this.freezeTime };
    }
    if (!boardGrid) return null;
    return applyBossEffect(effect, boardGrid, this.rng);
  }

  triggerEnemyAttack(boardGrid = null) {
    this.countdown = this.enemy.intervalSec;

    let damage = 0;
    let effect = null;
    let effectResult = null;

    if (this.enemy.isBoss) {
      damage = this.enemy.dmg; // 5 (+ Boss Rush tier bonus)
      effect = chooseBossEffect(this.rng);
      // With a grid, the effect lands at once (pure/test path). Without one, the caller casts it
      // later with castBossEffect(), after the player's in-flight move has resolved.
      if (boardGrid) {
        effectResult = this.castBossEffect(effect, boardGrid);
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

