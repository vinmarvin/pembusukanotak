// src/core/unlocks/achievements.js
// Pure logic for checking and unlocking the 5 achievements.
import { ACHIEVEMENTS_CONFIG } from '../../config/achievements.config.js';
import { GAMEPLAY } from '../../config/gameplay.config.js';
import { countUnlockedEntries } from './memebook.js';

export const ACHIEVEMENTS_LIST = ACHIEVEMENTS_CONFIG.list;

export function checkAchievements(saveData) {
  if (!saveData) return [];
  if (!saveData.achievements) {
    saveData.achievements = {
      freshNewBrain: false,
      fullyBrainRot: false,
      scoreHunter: false,
      memeCurator: false,
      supportCreator: false
    };
  }

  const newlyUnlocked = [];

  // 1. Fresh New Brain: Finish Story Mode
  if (!saveData.achievements.freshNewBrain) {
    if (saveData.storyCompleted || saveData.stageCleared >= 5) {
      saveData.achievements.freshNewBrain = true;
      newlyUnlocked.push('freshNewBrain');
    }
  }

  // 2. You are fully brain rot (Easter egg): Listen to menu theme for 15 minutes (900 seconds)
  if (!saveData.achievements.fullyBrainRot) {
    if ((saveData.menuListenTime || 0) >= 900) {
      saveData.achievements.fullyBrainRot = true;
      newlyUnlocked.push('fullyBrainRot');
    }
  }

  // 3. Score Hunter: Reach target score in Time Kill
  if (!saveData.achievements.scoreHunter) {
    const target = GAMEPLAY.achievements.scoreHunterScore || 45000;
    if ((saveData.bestScore || 0) >= target) {
      saveData.achievements.scoreHunter = true;
      newlyUnlocked.push('scoreHunter');
    }
  }

  // 4. Meme Curator: Unlock all 11 Meme Book entries
  if (!saveData.achievements.memeCurator) {
    if (countUnlockedEntries(saveData) === 11) {
      saveData.achievements.memeCurator = true;
      newlyUnlocked.push('memeCurator');
    }
  }

  // 5. Support Creator: Click the donation button (set directly when button is pressed)
  // If already set in save, keep it.

  return newlyUnlocked;
}

export function getAchievementProgress(saveData, achievementId) {
  const ach = ACHIEVEMENTS_LIST.find((a) => a.id === achievementId);
  if (!ach) return { unlocked: false, current: 0, target: 1 };

  const isUnlocked = Boolean(saveData?.achievements && saveData.achievements[achievementId]);

  if (achievementId === 'scoreHunter') {
    const target = GAMEPLAY.achievements.scoreHunterScore || 45000;
    const current = Math.min(saveData?.bestScore || 0, target);
    return { unlocked: isUnlocked, current, target };
  } else if (achievementId === 'memeCurator') {
    const current = countUnlockedEntries(saveData);
    return { unlocked: isUnlocked, current, target: 11 };
  } else {
    return { unlocked: isUnlocked, current: isUnlocked ? 1 : 0, target: 1 };
  }
}

