// src/core/tutorials.js
// Pure helpers: has the player seen the tutorial for a mode yet?
import { TUTORIALS_CONFIG } from '../config/tutorials.config.js';

export function shouldShowTutorial(save, mode) {
  const cfg = TUTORIALS_CONFIG[mode];
  if (!cfg) return false;
  return !save?.[cfg.saveFlag];
}

export function markTutorialSeen(save, mode) {
  const cfg = TUTORIALS_CONFIG[mode];
  if (!cfg || !save) return;
  save[cfg.saveFlag] = true;
}
