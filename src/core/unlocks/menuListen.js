// src/core/unlocks/menuListen.js
// Pure step logic for the "You are fully brain rot" easter egg.
// Time counts only while the menu music is audible at both ends of a tick,
// a tick gap is capped (sleep / frozen tab), and the sitting starts at 0 each menu visit.
import { ACHIEVEMENTS_CONFIG } from '../../config/achievements.config.js';

const entry = ACHIEVEMENTS_CONFIG.list.find((a) => a.id === 'fullyBrainRot');

export const MENU_LISTEN = {
  targetSec: entry.targetMinutes * 60,
  maxGapSec: entry.listenMaxGapSec,
  tickMs: entry.listenTickMs
};

export function createMenuListenState() {
  return { sittingSec: 0, wasAudible: false };
}

export function stepMenuListen(state, { dtSec, audible }, cfg = MENU_LISTEN) {
  const dt = Math.max(0, Math.min(dtSec, cfg.maxGapSec));
  const counted = state.wasAudible && audible;
  const sittingSec = state.sittingSec + (counted ? dt : 0);
  return { sittingSec, wasAudible: audible, reached: sittingSec >= cfg.targetSec };
}
