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
      supportCreator: false,
      detoxComplete: false
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

  // 2. You are fully brain rot (Easter egg): unlocked by unlockFullyBrainRot() from the menu listen tracker.

  // 3. Score Hunter: Reach target score in Time Kill
  if (!saveData.achievements.scoreHunter) {
    const target = GAMEPLAY.achievements.scoreHunterScore || 100000;
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

  // 6. Detox Complete (hidden): only from a Boss Rush run, see checkDetoxComplete().

  return newlyUnlocked;
}

export function getAchievementProgress(saveData, achievementId) {
  const ach = ACHIEVEMENTS_LIST.find((a) => a.id === achievementId);
  if (!ach) return { unlocked: false, current: 0, target: 1 };

  const isUnlocked = Boolean(saveData?.achievements && saveData.achievements[achievementId]);

  if (achievementId === 'scoreHunter') {
    const target = GAMEPLAY.achievements.scoreHunterScore || 100000;
    const current = Math.min(saveData?.bestScore || 0, target);
    return { unlocked: isUnlocked, current, target };
  } else if (achievementId === 'memeCurator') {
    const current = countUnlockedEntries(saveData);
    return { unlocked: isUnlocked, current, target: 11 };
  } else {
    return { unlocked: isUnlocked, current: isUnlocked ? 1 : 0, target: 1 };
  }
}


// "You are fully brain rot" easter egg. Returns true only when it was newly unlocked.
export function unlockFullyBrainRot(saveData) {
  if (!saveData) return false;
  if (!saveData.achievements) checkAchievements(saveData);
  if (saveData.achievements.fullyBrainRot) return false;
  saveData.achievements.fullyBrainRot = true;
  checkAchievements(saveData);
  return true;
}

// Achievements shown on the Achievements page: hidden ones only once unlocked.
export function visibleAchievements(saveData) {
  return ACHIEVEMENTS_LIST.filter((a) => !a.hidden || Boolean(saveData?.achievements?.[a.id]));
}

// Unlocked achievements, hidden ones included (6/5 once Detox Complete is unlocked).
export function countUnlockedAchievements(saveData) {
  return ACHIEVEMENTS_LIST.filter((a) => Boolean(saveData?.achievements?.[a.id])).length;
}

// Detox Complete (GAME_SPEC decision 39). Called on every boss kill in Boss Rush with the number of
// bosses defeated in this run. Unlocks only if the run reached the threshold and every non-hidden
// achievement is already unlocked at this moment. Returns true only when newly unlocked.
export function checkDetoxComplete(saveData, bossesDefeatedInRun) {
  if (!saveData) return false;
  if (!saveData.achievements) checkAchievements(saveData);
  if (saveData.achievements.detoxComplete) return false;
  const ach = ACHIEVEMENTS_LIST.find((a) => a.id === 'detoxComplete');
  if (!ach || bossesDefeatedInRun < ach.bossRushBosses) return false;
  const othersDone = ACHIEVEMENTS_LIST
    .filter((a) => !a.hidden)
    .every((a) => Boolean(saveData.achievements[a.id]));
  if (!othersDone) return false;
  saveData.achievements.detoxComplete = true;
  return true;
}
