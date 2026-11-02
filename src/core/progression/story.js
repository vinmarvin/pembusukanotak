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
}

