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
