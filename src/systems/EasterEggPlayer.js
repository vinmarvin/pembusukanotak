// src/systems/EasterEggPlayer.js
// Plays an easter egg. While it plays: every other sound is silenced, and every button
// in the scene ignores input. Audio eggs show nothing; video eggs open a centred popup with no
// close button that disappears by itself when the video ends. The Time Kill low-score egg shows an
// image popup whose close button appears only after its sound ends.
import { THEME } from '../config/theme.config.js';
import { EASTER_EGGS_CONFIG } from '../config/eastereggs.config.js';
import { ASSETS_MANIFEST } from '../config/assets.generated.js';
import { AudioManager } from './AudioManager.js';
import { EventBus } from './EventBus.js';
import { Button } from '../ui/Button.js';

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
    else if (data.kind === 'image') loader.image(key, data.path);
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

  // Image egg (Time Kill low score): shows `image` in a centred popup and plays `sound`.
  // The popup has no way out until the sound ends; then a close button appears. Closing calls
  // onClosed. Returns false (and does nothing) when the image or the sound is missing.
  playImageWithSound({ image, sound }, onClosed) {
    const { scene } = this;
    if (this.active || !scene.textures.exists(image) || !scene.cache.audio.exists(sound)) return false;
    this.active = true;
    scene.input.enabled = false;
    AudioManager.beginExclusive();

    const cfg = EASTER_EGGS_CONFIG.image;
    const popup = scene.add.container(0, 0).setDepth(POPUP_DEPTH);
    const backdrop = scene.add.rectangle(0, 0, 10, 10, THEME.colors.hardShadow, 0.85).setInteractive();
    const frame = scene.add.graphics();
    const img = scene.add.image(0, 0, image);
    const closeBtn = new Button(scene, 0, 0, cfg.closeBtnSize, cfg.closeBtnSize, {
      text: '✕',
      bgColor: THEME.colors.punchMagenta,
      fontSize: '20px',
      radius: cfg.closeBtnSize / 2,
      onClick: () => {
        this.finish();
        if (onClosed) onClosed();
      }
    });
    closeBtn.setVisible(false);
    popup.add([backdrop, frame, img, closeBtn]);
    this.popup = { container: popup };

    const layout = () => {
      if (!this.popup) return;
      const sw = scene.scale.width;
      const sh = scene.scale.height;
      backdrop.setPosition(sw / 2, sh / 2).setSize(sw, sh);
      if (backdrop.input) backdrop.input.hitArea.setTo(0, 0, sw, sh);
      const s = Math.min((sw * cfg.maxWidthFrac) / img.width, (sh * cfg.maxHeightFrac) / img.height);
      const dw = img.width * s;
      const dh = img.height * s;
      img.setPosition(sw / 2, sh / 2).setDisplaySize(dw, dh);
      const fw = dw + cfg.framePad * 2;
      const fh = dh + cfg.framePad * 2;
      const fx = sw / 2 - fw / 2;
      const fy = sh / 2 - fh / 2;
      frame.clear();
      frame.fillStyle(THEME.colors.hardShadow, 1);
      frame.fillRoundedRect(fx, fy + THEME.depth.shadowOffset, fw, fh, 18);
      frame.fillStyle(THEME.colors.cardBg, 1);
      frame.fillRoundedRect(fx, fy, fw, fh, 18);
      frame.lineStyle(THEME.depth.outlineWidth, THEME.colors.punchMagenta, 1);
      frame.strokeRoundedRect(fx, fy, fw, fh, 18);
      // Close button on the frame's top-right corner, kept on screen.
      const half = cfg.closeBtnSize / 2;
      closeBtn.setPosition(Math.min(fx + fw - half * 0.4, sw - half - 4), Math.max(fy + half * 0.4, half + 4));
    };
    layout();
    this.unsubLayout = EventBus.on('layout:changed', layout);

    // Sound ended (or never managed to play): unlock the close button, keep the popup up.
    let unlocked = false;
    const unlockClose = () => {
      if (unlocked || !this.active) return;
      unlocked = true;
      if (this.safetyTimer) {
        clearTimeout(this.safetyTimer);
        this.safetyTimer = null;
      }
      closeBtn.setVisible(true);
      scene.input.enabled = true;
    };

    try {
      this.sound = scene.sound.add(sound, { volume: AudioManager.getEggGain() });
      this.sound.once('complete', unlockClose);
      this.sound.play();
      const ms = this.sound.duration > 0 ? this.sound.duration * 1000 + EASTER_EGGS_CONFIG.safetyPadMs : EASTER_EGGS_CONFIG.fallbackMaxMs;
      this.safetyTimer = setTimeout(unlockClose, ms);
    } catch (e) {
      console.warn('[EasterEgg] audio failed', sound, e);
      unlockClose();
    }
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
        if (this.popup.video) this.popup.video.stop();
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
