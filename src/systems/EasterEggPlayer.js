// src/systems/EasterEggPlayer.js
// Plays a main-menu easter egg. While it plays: every other sound is silenced, and every button
// in the scene ignores input. Audio eggs show nothing; video eggs open a centred popup with no
// close button that disappears by itself when the video ends.
import { THEME } from '../config/theme.config.js';
import { EASTER_EGGS_CONFIG } from '../config/eastereggs.config.js';
import { ASSETS_MANIFEST } from '../config/assets.generated.js';
import { AudioManager } from './AudioManager.js';
import { EventBus } from './EventBus.js';

const POPUP_DEPTH = 1000;

export function hasEggMedia(scene, egg) {
  if (!egg) return false;
  if (egg.type === 'video') return Boolean(scene.cache.video.exists(egg.media));
  return Boolean(scene.cache.audio.exists(egg.media));
}

// Preload helper used by PreloadScene.
export function loadEasterEggMedia(loader) {
  const eggs = ASSETS_MANIFEST?.easterEggs || {};
  for (const [key, data] of Object.entries(eggs)) {
    if (data.kind === 'video') loader.video(key, data.path, false);
    else loader.audio(key, data.path);
  }
}

export class EasterEggPlayer {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.sound = null;
    this.video = null;
    this.popup = null;
    this.safetyTimer = null;
    this.unsubLayout = null;
    scene.events.once('shutdown', () => this.finish());
  }

  isPlaying() {
    return this.active;
  }

  play(egg) {
    if (this.active || !hasEggMedia(this.scene, egg)) return false;
    this.active = true;
    this.scene.input.enabled = false;
    AudioManager.beginExclusive();
    if (egg.type === 'video') this.playVideo(egg.media);
    else this.playAudio(egg.media);
    return true;
  }

  armSafety(durationSec) {
    const ms = durationSec > 0 ? durationSec * 1000 + EASTER_EGGS_CONFIG.safetyPadMs : EASTER_EGGS_CONFIG.fallbackMaxMs;
    if (this.safetyTimer) clearTimeout(this.safetyTimer);
    // setTimeout (not scene time) so it still fires if the game loop is paused in a background tab.
    this.safetyTimer = setTimeout(() => this.finish(), ms);
  }

  playAudio(key) {
    try {
      this.sound = this.scene.sound.add(key, { volume: AudioManager.getEggGain() });
      this.sound.once('complete', () => this.finish());
      this.sound.play();
      this.armSafety(this.sound.duration);
    } catch (e) {
      console.warn('[EasterEgg] audio failed', key, e);
      this.finish();
    }
  }

  playVideo(key) {
    const { scene } = this;
    const { width, height } = scene.scale;

    const popup = scene.add.container(0, 0).setDepth(POPUP_DEPTH);
    const backdrop = scene.add.rectangle(width / 2, height / 2, width, height, THEME.colors.hardShadow, 0.85);
    const frame = scene.add.graphics();
    const video = scene.add.video(width / 2, height / 2, key).setAlpha(0);
    popup.add([backdrop, frame, video]);
    this.popup = { container: popup, backdrop, frame, video };
    this.video = video;

    const layout = () => {
      if (!this.popup) return;
      const sw = scene.scale.width;
      const sh = scene.scale.height;
      backdrop.setPosition(sw / 2, sh / 2).setSize(sw, sh);
      const vw = video.video?.videoWidth || video.width || 16;
      const vh = video.video?.videoHeight || video.height || 9;
      const cfg = EASTER_EGGS_CONFIG.video;
      const s = Math.min((sw * cfg.maxWidthFrac) / vw, (sh * cfg.maxHeightFrac) / vh);
      const dw = vw * s;
      const dh = vh * s;
      video.setPosition(sw / 2, sh / 2).setDisplaySize(dw, dh);
      const pad = cfg.framePad;
      const fw = dw + pad * 2;
      const fh = dh + pad * 2;
      frame.clear();
      frame.fillStyle(THEME.colors.hardShadow, 1);
      frame.fillRoundedRect(sw / 2 - fw / 2, sh / 2 - fh / 2 + THEME.depth.shadowOffset, fw, fh, 18);
      frame.fillStyle(THEME.colors.cardBg, 1);
      frame.fillRoundedRect(sw / 2 - fw / 2, sh / 2 - fh / 2, fw, fh, 18);
      frame.lineStyle(THEME.depth.outlineWidth, THEME.colors.punchMagenta, 1);
      frame.strokeRoundedRect(sw / 2 - fw / 2, sh / 2 - fh / 2, fw, fh, 18);
    };

    video.once('created', () => {
      layout();
      video.setAlpha(1);
      this.armSafety(video.getDuration());
    });
    video.once('complete', () => this.finish());
    video.once('error', () => this.finish());
    video.once('unsupported', () => this.finish());
    this.unsubLayout = EventBus.on('layout:changed', layout);

    const vol = AudioManager.getEggGain();
    video.setVolume(Math.min(1, vol));
    video.setMute(vol <= 0);
    video.play(false);
    layout();
    // Until metadata arrives, guard against a video that never starts.
    this.armSafety(0);
  }

  finish() {
    if (!this.active) return;
    this.active = false;
    if (this.safetyTimer) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }
    if (this.unsubLayout) {
      this.unsubLayout();
      this.unsubLayout = null;
    }
    if (this.sound) {
      try {
        this.sound.stop();
        this.sound.destroy();
      } catch (e) {}
      this.sound = null;
    }
    if (this.popup) {
      try {
        this.popup.video.stop();
      } catch (e) {}
      this.popup.container.destroy(true);
      this.popup = null;
      this.video = null;
    }
    AudioManager.endExclusive();
    // The input plugin survives scene restarts, so always switch it back on.
    if (this.scene.input) this.scene.input.enabled = true;
  }
}
