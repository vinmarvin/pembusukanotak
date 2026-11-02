// src/core/unlocks/memebook.js
// Pure logic for Meme Book unlock states, progress tracking, and candy counters.
import { MEMEBOOK_CONFIG } from '../../config/memebook.config.js';
import { CANDIES_CONFIG } from '../../config/candies.config.js';
import { GAMEPLAY } from '../../config/gameplay.config.js';

export const MEMEBOOK_ENTRIES = MEMEBOOK_CONFIG.entries;

export function isEntryUnlocked(saveData, entryId) {
  if (!saveData) return false;
  const entry = MEMEBOOK_ENTRIES.find((e) => e.id === entryId);
  if (!entry) return false;

  if (entry.kind === 'boss') {
    return Boolean(saveData.bossDefeated && saveData.bossDefeated[entryId]);
  } else if (entry.kind === 'candy') {
    const count = (saveData.candyDestroyed && saveData.candyDestroyed[entryId]) || 0;
    const threshold = GAMEPLAY.memeBook.candyUnlockCount || 100;
    return count >= threshold;
  }
  return false;
}

export function getEntryProgress(saveData, entryId) {
  const entry = MEMEBOOK_ENTRIES.find((e) => e.id === entryId);
  if (!entry) return { unlocked: false, current: 0, target: 1 };

  const threshold = GAMEPLAY.memeBook.candyUnlockCount || 100;

  if (entry.kind === 'boss') {
    const defeated = Boolean(saveData?.bossDefeated && saveData.bossDefeated[entryId]);
    return {
      unlocked: defeated,
      current: defeated ? 1 : 0,
      target: 1,
      hintKey: 'memebook.hint.boss'
    };
  } else {
    const count = (saveData?.candyDestroyed && saveData.candyDestroyed[entryId]) || 0;
    const unlocked = count >= threshold;
    return {
      unlocked,
      current: Math.min(count, threshold),
      target: threshold,
      hintKey: 'memebook.hint.candy'
    };
  }
}

export function countUnlockedEntries(saveData) {
  if (!saveData) return 0;
  let count = 0;
  for (const entry of MEMEBOOK_ENTRIES) {
    if (isEntryUnlocked(saveData, entry.id)) {
      count++;
    }
  }
  return count;
}

export function recordCandyDestruction(saveData, candyKey, count = 1) {
  if (!saveData) return { newlyUnlocked: false, count: 0 };
  if (!saveData.candyDestroyed) {
    saveData.candyDestroyed = { c67: 0, nugget: 0, skibidi: 0, lirili: 0, udin: 0, bluberini: 0 };
  }

  const prev = saveData.candyDestroyed[candyKey] || 0;
  const threshold = GAMEPLAY.memeBook.candyUnlockCount || 100;
  const next = prev + count;
  saveData.candyDestroyed[candyKey] = next;

  const newlyUnlocked = prev < threshold && next >= threshold;
  return { newlyUnlocked, count: next };
}

export function recordBossDefeat(saveData, bossId) {
  if (!saveData) return { newlyUnlocked: false };
  if (!saveData.bossDefeated) {
    saveData.bossDefeated = { b1: false, b2: false, b3: false, b4: false, b5: false };
  }

  const prev = Boolean(saveData.bossDefeated[bossId]);
  saveData.bossDefeated[bossId] = true;
  const newlyUnlocked = !prev;

  return { newlyUnlocked };
}

export function recordClearedCandies(saveData, steps) {
  if (!saveData || !steps) return [];
  const newlyUnlocked = [];

  for (const step of steps) {
    if (!step.cleared) continue;
    for (const item of step.cleared) {
      if (item.candy && item.candy.type !== undefined) {
        const typeIndex = item.candy.type;
        const config = CANDIES_CONFIG.types[typeIndex];
        if (config) {
          const res = recordCandyDestruction(saveData, config.key, 1);
          if (res.newlyUnlocked && !newlyUnlocked.includes(config.key)) {
            newlyUnlocked.push(config.key);
          }
        }
      }
    }
  }

  return newlyUnlocked;
}

