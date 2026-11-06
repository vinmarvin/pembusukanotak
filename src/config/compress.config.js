// src/config/compress.config.js
// Compression settings used by scripts/sync-assets.mjs when it writes public/assets/.
// Originals in visual/, audio/ and easteregg/ are never touched; only the copies are compressed.
// Bump `version` after changing any setting so cached audio/video gets re-encoded.
export const COMPRESS = {
  version: 1,
  // Sprites and images: WebP keeps transparency and is far smaller than PNG.
  image: { quality: 80, alphaQuality: 90, effort: 6 },
  // Background music: MP3 64 kbps stereo, 44.1 kHz.
  bgm: { bitrate: '64k', sampleRate: 44100, channels: 2 },
  // Short sound effects: MP3 64 kbps mono, 44.1 kHz.
  sfx: { bitrate: '64k', sampleRate: 44100, channels: 1 },
  // Easter egg video: H.264, max 854 px wide, AAC audio.
  video: { maxWidth: 854, crf: 30, audioBitrate: '64k' },
  // Browser tab / home screen icon generated from the logo.
  favicon: { size: 180 },
  // Max longer side for the easter egg image.
  eggImageMax: 768
};
