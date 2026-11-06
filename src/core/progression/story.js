// src/core/progression/story.js
// Story Mode progression, stage unlocking, replay logic, and Fast Hand tracking.
import { SaveManager } from '../../systems/SaveManager.js';
import { GAMEPLAY } from '../../config/gameplay.config.js';
import { checkAchievements } from '../unlocks/achievements.js';

export class StoryProgression {
  static isStageUnlocked(stage, save = SaveManager.data) {
    if (stage === 1) return true;
    return (save.stageCleared || 0) >= stage - 1;
  }

  static onStartStage(stage) {
    SaveManager.update((s) => {
      if (stage === 1) {
        // Decision 18: Reset gameOversSinceStage1Start on starting Stage 1
        s.gameOversSinceStage1Start = 0;
      }
    });
  }

  static onGameOver() {
    SaveManager.update((s) => {
      s.gameOversSinceStage1Start = (s.gameOversSinceStage1Start || 0) + 1;
    });
  }

  static onStageCleared(stage) {
    SaveManager.update((s) => {
      s.stageCleared = Math.max(s.stageCleared || 0, stage);

      // Unlock boss in Meme Book
      const bossKey = `b${stage}`;
      if (!s.bossDefeated) s.bossDefeated = {};
      s.bossDefeated[bossKey] = true;

      if (stage === GAMEPLAY.stages) {
        s.storyCompleted = true;
        if (!s.achievements) s.achievements = {};
        s.achievements.freshNewBrain = true;
      }

      checkAchievements(s);
    });

    return SaveManager.data;
  }

  // ── Extra modes (owner): Hard mode and Boss Rush unlock once Story Mode (normal) is finished ──

  static areExtraModesUnlocked(save = SaveManager.data) {
    return !!save.storyCompleted;
  }

  // Hard mode has its own unlock path: hard stage N+1 opens after hard stage N is cleared.
  static isHardStageUnlocked(stage, save = SaveManager.data) {
    if (!StoryProgression.areExtraModesUnlocked(save)) return false;
    if (stage === 1) return true;
    return (save.hardStageCleared || 0) >= stage - 1;
  }

  static onHardStageCleared(stage) {
    SaveManager.update((s) => {
      s.hardStageCleared = Math.max(s.hardStageCleared || 0, stage);
      if (!s.bossDefeated) s.bossDefeated = {};
      s.bossDefeated[`b${stage}`] = true;
      checkAchievements(s);
    });
    return SaveManager.data;
  }

  // Boss Rush run ended with `defeated` bosses. Saves the best run; returns { best, isNewBest }.
  static onBossRushEnd(defeated) {
    const prev = SaveManager.data.bossRushBest || 0;
    const isNewBest = defeated > prev;
    if (isNewBest) {
      SaveManager.update((s) => {
        s.bossRushBest = defeated;
      });
    }
    return { best: Math.max(prev, defeated), isNewBest };
  }
}
