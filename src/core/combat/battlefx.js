// src/core/combat/battlefx.js
// Pure rules for the enemy taunt bubble (GAME_SPEC decision 37) and Boss Rush callouts (decision 38).
// No Phaser imports.
import { TAUNT_CONFIG, CALLOUT_CONFIG } from '../../config/battlefx.config.js';

// ── Taunts ──────────────────────────────────────────────────────────────────

export function createTauntState() {
  return { wrongInRow: 0, lastLine: {} };
}

// A swap that reverted. Returns true when the enemy should taunt now (the count then restarts).
export function registerWrongSwap(state, need = TAUNT_CONFIG.wrongSwapsToTaunt) {
  state.wrongInRow += 1;
  if (state.wrongInRow >= need) {
    state.wrongInRow = 0;
    return true;
  }
  return false;
}

// A valid move or a new enemy resets the count.
export function resetWrongSwaps(state) {
  state.wrongInRow = 0;
}

// Minions share one pool; each boss has its own (its id, b1..b5).
export function tauntPool(enemy, pools = TAUNT_CONFIG.pools) {
  if (enemy?.isBoss && pools[enemy.id]) return enemy.id;
  return 'minion';
}

// Random line index in [0, count), never the same as `last` when there is more than one line.
export function pickLineIndex(count, last, rand) {
  if (count <= 1) return 0;
  if (last == null || last < 0 || last >= count) return Math.floor(rand() * count);
  const i = Math.floor(rand() * (count - 1));
  return i >= last ? i + 1 : i;
}

// Picks the next line for an enemy and remembers it. Returns the i18n key.
export function nextTauntKey(state, enemy, rand, pools = TAUNT_CONFIG.pools) {
  const pool = tauntPool(enemy, pools);
  const idx = pickLineIndex(pools[pool] || 1, state.lastLine[pool], rand);
  state.lastLine[pool] = idx;
  return `taunts.${pool}.l${idx + 1}`;
}

// ── Callouts ────────────────────────────────────────────────────────────────

export function calloutsEnabled(mode, cfg = CALLOUT_CONFIG) {
  return cfg.modes.includes(mode);
}

// Highest tier reached with this many breaks, or null below the first tier.
export function calloutTier(breaks, tiers = CALLOUT_CONFIG.tiers) {
  let best = null;
  for (const tier of tiers) {
    if (breaks >= tier.minBreaks && (!best || tier.minBreaks > best.minBreaks)) best = tier;
  }
  return best;
}

// Per-move break counter. Call startMove() before a move, then onBreak(defeated) once per step:
// it returns the tier to show for that break, or null. A kill stops callouts for the rest of the
// move and resets the count (decision 38).
export function createCalloutState() {
  return { breaks: 0, stopped: false };
}

export function startMove(state) {
  state.breaks = 0;
  state.stopped = false;
}

export function onBreak(state, defeated, tiers = CALLOUT_CONFIG.tiers) {
  if (state.stopped) return null;
  if (defeated) {
    state.stopped = true;
    state.breaks = 0;
    return null;
  }
  state.breaks += 1;
  return calloutTier(state.breaks, tiers);
}
