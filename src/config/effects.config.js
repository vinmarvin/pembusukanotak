// src/config/effects.config.js
// Look of the boss effect banner icons. This is the place to customise them.
//
// Each effect shows ONE icon inside a fixed square badge on the banner:
//   1. If an image with `textureKey` was loaded, that image is used (fitted inside the badge, never stretched).
//      To add one, drop a PNG into visual/ whose name says effect + the effect, then run `npm run sync-assets`:
//        effect_shuffle.png  -> fx.shuffle
//        effect_devour.png   -> fx.remove10
//        effect_freeze.png   -> fx.freeze
//      (Indonesian works too: efek_acak, efek_lahap, efek_beku.)
//   2. Otherwise the `emoji` is drawn, scaled down until it fits inside the badge.
// `color` tints the badge, the banner outline and the screen wash for that effect.
import { THEME } from './theme.config.js';

export const BOSS_EFFECT_UI = {
  // Badge size in px (square). It shrinks on short banners so it never overflows.
  iconSlot: 56,
  // Share of the badge the icon may fill (the rest is padding).
  iconFill: 0.72,
  effects: {
    shuffle: { emoji: '🌀', textureKey: 'fx.shuffle', color: THEME.colors.arcadeYellow },
    remove10: { emoji: '😋', textureKey: 'fx.remove10', color: THEME.colors.punchMagenta },
    freeze: { emoji: '❄️', textureKey: 'fx.freeze', color: THEME.colors.electricCyan }
  },
  fallback: { emoji: '💥', textureKey: null, color: THEME.colors.punchMagenta }
};

// Time Kill power candies: how a candy that holds a power-up looks on the board (owner request).
// Sizes are fractions of the board cell so they scale on every screen.
//   freeze: the candy is tinted blue and glows icy.
//   bomb:   the candy is tinted red and pulses like a fuse.
//   x5:     a "x5" badge sits in front of the candy (bottom-right corner).
//   line:   two neon stripes run across the candy, horizontal or vertical like the line it clears.
// `tint` multiplies the candy image colours (0xFFFFFF = unchanged). `glow` is drawn only in WebGL.
export const POWER_CANDY_LOOK = {
  freeze: {
    tint: 0x6cc8ff,
    glow: { color: 0x7fe6ff, strength: 3, pulseTo: 6, pulseMs: 900 }
  },
  bomb: {
    tint: 0xff5a4a,
    glow: { color: 0xff2a1a, strength: 3, pulseTo: 7, pulseMs: 380 }
  },
  x5: {
    tint: 0xffffff,
    glow: { color: 0xffd400, strength: 2, pulseTo: 5, pulseMs: 700 },
    badge: {
      text: 'x5',
      fill: THEME.colors.arcadeYellow,
      outline: THEME.colors.ink,
      shadow: THEME.colors.hardShadow,
      textColor: THEME.colors.inkHex,
      width: 0.5, // of cell
      height: 0.3,
      offsetX: 0.24, // badge centre, from cell centre
      offsetY: 0.26,
      angle: -10,
      fontSize: 0.2, // of cell
      bobScale: 1.12,
      bobMs: 520
    }
  },
  line: {
    tint: 0xffffff,
    glow: { color: 0x00e5ff, strength: 2, pulseTo: 5, pulseMs: 600 },
    stripes: {
      length: 0.94, // of cell
      thickness: 0.075,
      gap: 0.24, // distance between the two stripe centres
      outline: THEME.colors.ink,
      color: THEME.colors.electricCyan,
      core: 0xffffff,
      shimmerMinAlpha: 0.65,
      shimmerMs: 450
    }
  },
  // Extra pixels around a glowing candy so the glow is not clipped.
  glowPadding: 10
};
