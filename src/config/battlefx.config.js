// src/config/battlefx.config.js
// Enemy taunt bubble (GAME_SPEC decision 37) and Boss Rush callouts (decision 38).
// Every value for these two features lives here; the text lives in i18n (`taunts.*`, `callouts.*`).
import { THEME } from './theme.config.js';

export const TAUNT_CONFIG = {
  // Wrong swaps in a row (swaps that revert) before the enemy taunts.
  wrongSwapsToTaunt: 5,
  // PC only: the main input must be a mouse or trackpad.
  desktopQuery: '(hover: hover) and (pointer: fine)',
  // Number of lines per pool in i18n: `taunts.<pool>.l1` .. `taunts.<pool>.lN`.
  // Minions share the `minion` pool; each boss uses its own id (b1..b5).
  pools: { minion: 5, b1: 3, b2: 3, b3: 3, b4: 3, b5: 3 },
  // Timing (ms)
  showMs: 2500,
  popInMs: 180,
  fadeOutMs: 300,
  // Look (px). The bubble is hidden when the free space beside the board is narrower than minWidth.
  bubble: {
    minWidth: 150,
    maxWidth: 240,
    gap: 10,
    padX: 12,
    padY: 9,
    radius: 12,
    tail: 10,
    fontSize: 14,
    bgColor: 0xFFFFFF,
    textColor: THEME.colors.inkHex,
    outlineColor: THEME.colors.ink,
    outlineWidth: 3
  },
  depth: 95
};

export const CALLOUT_CONFIG = {
  // Battle modes that show callouts (owner: Boss Rush only).
  modes: ['bossRush'],
  // Highest tier whose minBreaks <= breaks wins. A break = one step of a move (match + each cascade).
  tiers: [
    { minBreaks: 2, key: 'callouts.tier2', color: THEME.colors.electricCyanHex },
    { minBreaks: 3, key: 'callouts.tier3', color: THEME.colors.slimeGreenHex },
    { minBreaks: 4, key: 'callouts.tier4', color: THEME.colors.arcadeYellowHex },
    { minBreaks: 5, key: 'callouts.tier5', color: THEME.colors.punchMagentaHex }
  ],
  // Font size as a share of the board width, capped; the text shrinks to fit maxWidthShare.
  fontShare: 0.11,
  maxFontPx: 64,
  maxWidthShare: 0.9,
  strokeThickness: 8,
  // Timing (ms)
  popInMs: 160,
  holdMs: 700,
  fadeOutMs: 320,
  popScale: 1.35,
  depth: 90
};
