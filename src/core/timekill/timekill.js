// src/core/timekill/timekill.js
// Pure state machine for Time Kill (2-minute score attack) with power-ups, bonuses, and penalties.
import { GAMEPLAY } from '../../config/gameplay.config.js';
import { SaveManager } from '../../systems/SaveManager.js';
import { applyPowerUp } from '../board/applyPowerUp.js';
import { applyGravityAndRefill } from '../board/gravity.js';
import { settle } from '../board/settle.js';

export class TimeKillEngine {
  constructor(options = {}) {
    this.durationSec = GAMEPLAY.timeKill.durationSec || 120;
    this.timeLeft = this.durationSec;
    this.score = 0;
    this.bestScore = SaveManager.data.bestScore || 0;
    this.isNewBest = false;
    this.isGameOver = false;

    this.freezeRemaining = 0;
    this.scoreMultRemaining = 0;
    this.scoreMultiplier = GAMEPLAY.timeKill.scoreMultiplier || 5;

    this.rng = options.rng || null;
  }

  tick(deltaSec) {
    if (this.isGameOver) return { isGameOver: true, timeLeft: 0, score: this.score };

    // Active score multiplier countdown
    if (this.scoreMultRemaining > 0) {
      this.scoreMultRemaining = Math.max(0, this.scoreMultRemaining - deltaSec);
    }

    // Freeze pauses timer countdown
    if (this.freezeRemaining > 0) {
      this.freezeRemaining = Math.max(0, this.freezeRemaining - deltaSec);
    } else {
      this.timeLeft = Math.max(0, this.timeLeft - deltaSec);
      if (this.timeLeft === 0) {
        this.finishRun();
        return { isGameOver: true, timeLeft: 0, score: this.score, isNewBest: this.isNewBest };
      }
    }

    return {
      isGameOver: false,
      timeLeft: this.timeLeft,
      score: this.score,
      freezeRemaining: this.freezeRemaining,
      scoreMultRemaining: this.scoreMultRemaining
    };
  }

  onWrongSwap() {
    if (this.isGameOver) return { penalty: 0, timeLeft: 0 };
    const penalty = GAMEPLAY.timeKill.wrongSwapPenaltySec || 10;
    this.timeLeft = Math.max(0, this.timeLeft - penalty);

    if (this.timeLeft === 0) {
      this.finishRun();
    }

    return {
      penalty,
      timeLeft: this.timeLeft,
      isGameOver: this.isGameOver
    };
  }

  onMoveResolved(result) {
    if (!result || !result.valid) return null;

    let totalCandies = 0;
    let timeBonus = 0;
    const powerUpsTriggered = [];

    // Check step 0 for 4+ match bonus (+5s)
    const step0 = result.steps?.[0];
    if (step0 && step0.longestRun >= 4) {
      timeBonus += GAMEPLAY.timeKill.match4BonusSec || 5;
    }

    // Check for cascade combo (+5s once per player move with cascades)
    if (result.steps && result.steps.length > 1) {
      timeBonus += GAMEPLAY.timeKill.comboBonusSec || 5;
    }

    // Iterate all steps
    if (result.steps) {
      for (const step of result.steps) {
        totalCandies += step.cleared.length;
        if (step.powerEvents) {
          for (const pe of step.powerEvents) {
            powerUpsTriggered.push(pe);
            if (pe.type === 'freeze') {
              this.freezeRemaining += pe.durationSec;
            } else if (pe.type === 'x5') {
              this.scoreMultRemaining = pe.durationSec; // refresh to 10s per Decision 15
            }
          }
        }
      }
    }

    this.timeLeft += timeBonus;
    if (this.isGameOver && this.timeLeft > 0) {
      this.isGameOver = false;
    } else if (this.timeLeft === 0 && !this.isGameOver) {
      this.finishRun();
    }

    // Calculate score
    const currentMult = this.scoreMultRemaining > 0 ? this.scoreMultiplier : 1;
    const pointsGained = totalCandies * GAMEPLAY.board.scorePerCandy * currentMult;
    this.score += pointsGained;

    // Check best score
    if (this.score > this.bestScore) {
      this.isNewBest = true;
      this.bestScore = this.score;
    }

    // Check Score Hunter achievement (10000 points)
    if (this.score >= GAMEPLAY.achievements.scoreHunterScore) {
      SaveManager.update((s) => {
        if (!s.achievements) s.achievements = {};
        s.achievements.scoreHunter = true;
      });
    }

    return {
      pointsGained,
      totalScore: this.score,
      timeBonus,
      candiesCleared: totalCandies,
      powerUpsTriggered,
      isNewBest: this.isNewBest
    };
  }

  // Trigger power-up by tapping it a second time
  triggerPowerUpAt(grid, r, c) {
    const candy = grid[r][c];
    if (!candy || !candy.power || this.isGameOver) return null;

    const powerType = candy.power;
    candy.power = null; // Consume power

    const { cleared, effects } = applyPowerUp(grid, r, c, powerType, this.rng);

    const clearedWithCandies = cleared.map((cell) => ({
      ...cell,
      candy: grid[cell.r][cell.c] ? { ...grid[cell.r][cell.c] } : null
    }));

    for (const eff of effects) {
      if (eff.type === 'freeze') {
        this.freezeRemaining += eff.durationSec;
      } else if (eff.type === 'x5') {
        this.scoreMultRemaining = eff.durationSec;
      }
    }

    for (const cell of cleared) {
      grid[cell.r][cell.c] = null;
    }

    const { falls, spawns } = applyGravityAndRefill(grid, this.rng);
    settle(grid, this.rng);

    const mult = this.scoreMultRemaining > 0 ? this.scoreMultiplier : 1;
    const points = cleared.length * GAMEPLAY.board.scorePerCandy * mult;
    this.score += points;

    if (this.score > this.bestScore) {
      this.isNewBest = true;
      this.bestScore = this.score;
    }

    if (this.score >= GAMEPLAY.achievements.scoreHunterScore) {
      SaveManager.update((s) => {
        if (!s.achievements) s.achievements = {};
        s.achievements.scoreHunter = true;
      });
    }

    return {
      powerType,
      cleared: clearedWithCandies,
      effects,
      falls,
      spawns,
      pointsGained: points,
      totalScore: this.score,
      grid
    };
  }

  finishRun() {
    this.isGameOver = true;
    this.timeLeft = 0;
    if (this.score > (SaveManager.data.bestScore || 0)) {
      this.isNewBest = true;
      this.bestScore = this.score;
      SaveManager.update((s) => {
        s.bestScore = this.score;
      });
    }
    if (this.score >= GAMEPLAY.achievements.scoreHunterScore) {
      SaveManager.update((s) => {
        if (!s.achievements) s.achievements = {};
        s.achievements.scoreHunter = true;
      });
    }
  }
}

