// src/config/eastereggs.config.js
// Hidden main-menu easter eggs (owner request). The floating decor icons on the main menu are
// silent buttons: no hover, no cursor change, no bounce. Clicking one `clicks` times plays its media.
// Media come from the owner's easteregg/ folder via `npm run sync-assets` (keys in the manifest).
export const EASTER_EGGS_CONFIG = {
  eggs: {
    // The "67" candy
    c67: { clicks: 67, media: 'egg.c67', type: 'audio' },
    // The bear-like small minion
    small: { clicks: 42, media: 'egg.ambatukam', type: 'audio' },
    // The Skibidi toilet candy: jumpscare video in a popup that cannot be closed
    skibidi: { clicks: 82, media: 'egg.skibidi', type: 'video' }
  },
  // The video popup fits inside this share of the screen.
  video: { maxWidthFrac: 0.86, maxHeightFrac: 0.7, framePad: 10 },
  // If "complete" never arrives (decode error, blocked autoplay), unlock after duration + this.
  safetyPadMs: 1500,
  // Used only when the media duration cannot be read.
  fallbackMaxMs: 30000
};
