// src/core/eastereggs.js
// Pure click counting for the main-menu easter eggs.
import { EASTER_EGGS_CONFIG } from '../config/eastereggs.config.js';

export function createEggCounts() {
  const counts = {};
  for (const id of Object.keys(EASTER_EGGS_CONFIG.eggs)) counts[id] = 0;
  return counts;
}

// Count one click on egg `id`. Returns the egg config when this click reaches the target
// (and resets that counter), otherwise null. Unknown ids are ignored.
export function registerEggClick(counts, id, eggs = EASTER_EGGS_CONFIG.eggs) {
  const egg = eggs[id];
  if (!egg) return null;
  counts[id] = (counts[id] || 0) + 1;
  if (counts[id] >= egg.clicks) {
    counts[id] = 0;
    return egg;
  }
  return null;
}
