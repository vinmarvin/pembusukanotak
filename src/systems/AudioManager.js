// src/systems/AudioManager.js
// Audio manager handling BGM crossfade, SFX pooling, ducking, live volume curves, and synth fallbacks.
import { AUDIO_CONFIG } from '../config/audio.config.js';
import { SaveManager } from './SaveManager.js';
import { EventBus } from './EventBus.js';

// Looping BGM played with a native Web Audio loop (source.loop = true).
// Phaser's own looping schedules the next loop from its game loop, which stops when the tab is hidden,
// so a Phaser-looped track goes silent in the background. A native loop keeps playing on its own.
class NativeLoopTrack {
  constructor(ctx, buffer, destination, volume) {
    this.ctx = ctx;
    this.buffer = buffer;
    this.gain = ctx.createGain();
    this.gain.gain.value = volume;
    this.gain.connect(destination);
    this.source = null;
    this.offset = 0;
    this.startedAt = 0;
    this.isPlaying = false;
    this.isPaused = false;
  }

  _start(offset) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer;
    src.loop = true;
    src.connect(this.gain);
    src.start(0, offset);
    this.source = src;
    this.startedAt = this.ctx.currentTime - offset;
    this.isPlaying = true;
    this.isPaused = false;
  }

  _kill() {
    if (!this.source) return;
    try {
      this.source.stop();
    } catch (e) {}
    this.source.disconnect();
    this.source = null;
  }

  play() {
    this._start(0);
  }

  pause() {
    if (!this.isPlaying) return;
    this.offset = (this.ctx.currentTime - this.startedAt) % this.buffer.duration;
    this._kill();
    this.isPlaying = false;
    this.isPaused = true;
  }

  resume() {
    if (!this.isPaused) return;
    this._start(this.offset);
  }

  stop() {
    this._kill();
    this.isPlaying = false;
    this.isPaused = false;
    this.gain.disconnect();
  }

  setVolume(v) {
    this.gain.gain.setValueAtTime(v, this.ctx.currentTime);
  }
}

class AudioManagerImpl {
  constructor() {
    this._scene = null;
    this._game = null;
    this._currentBgm = null;
    this._currentBgmKey = null;
    this._unlocked = false;
    this._lastHitTime = 0;
    this._synthCtx = null;
    this._exclusive = false;
    this._memeClip = null;
  }

  init(scene) {
    this._scene = scene;
    this._game = scene?.game || scene;
    const settings = SaveManager.data.settings || {};
    this._musicVol = settings.musicVolume ?? AUDIO_CONFIG.musicVolume;
    this._sfxVol = settings.sfxVolume ?? AUDIO_CONFIG.sfxVolume;
    this._muted = settings.muted ?? false;

    // Owner: audio keeps playing when the tab is hidden or the window loses focus, on every screen.
    // Phaser's default (pauseOnBlur) suspends the whole audio context on blur, so turn it off.
    // Gameplay itself still pauses while hidden because Phaser stops its game loop.
    const sm = this._getSoundManager();
    if (sm && 'pauseOnBlur' in sm) sm.pauseOnBlur = false;

    if (typeof window !== 'undefined') {
      window.addEventListener('pointerdown', () => this.unlock(), { once: true });
    }
  }

  _getSoundManager() {
    return this._scene?.sound || this._game?.sound || null;
  }

  hasAudio(key) {
    if (this._game?.cache?.audio?.exists && this._game.cache.audio.exists(key)) return true;
    if (this._scene?.cache?.audio?.exists && this._scene.cache.audio.exists(key)) return true;
    const sm = this._getSoundManager();
    if (sm?.get && sm.get(key)) return true;
    return false;
  }

  unlock() {
    if (this._unlocked) return;
    this._unlocked = true;
    const soundManager = this._getSoundManager();
    if (soundManager && soundManager.locked) {
      try {
        soundManager.unlock();
      } catch (e) {}
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this._synthCtx = new AudioContext();
        if (this._synthCtx.state === 'suspended') {
          this._synthCtx.resume();
        }
      }
    } catch (e) {
      // AudioContext unavailable
    }
  }

  getGain(val) {
    if (this._muted) return 0;
    return Math.pow(Math.max(0, Math.min(100, val)) / 100, AUDIO_CONFIG.curve);
  }

  setMusicVolume(val) {
    this._musicVol = val;
    SaveManager.update((s) => {
      if (!s.settings) s.settings = {};
      s.settings.musicVolume = val;
    });
    if (this._currentBgm && this._currentBgm.isPlaying) {
      const trim = AUDIO_CONFIG.trims[this._currentBgmKey] || 1;
      this._currentBgm.setVolume(this.getGain(this._musicVol) * trim);
    }
    EventBus.emit('audio:volumeChanged', { music: this._musicVol, sfx: this._sfxVol });
  }

  setSfxVolume(val) {
    this._sfxVol = val;
    SaveManager.update((s) => {
      if (!s.settings) s.settings = {};
      s.settings.sfxVolume = val;
    });
    EventBus.emit('audio:volumeChanged', { music: this._musicVol, sfx: this._sfxVol });
  }

  toggleMute() {
    this._muted = !this._muted;
    if (this._muted) this.stopMemeClip();
    SaveManager.update((s) => {
      if (!s.settings) s.settings = {};
      s.settings.muted = this._muted;
    });
    if (this._currentBgm && this._currentBgm.isPlaying) {
      const trim = AUDIO_CONFIG.trims[this._currentBgmKey] || 1;
      this._currentBgm.setVolume(this.getGain(this._musicVol) * trim);
    }
    EventBus.emit('audio:muteToggled', this._muted);
    return this._muted;
  }

  isMuted() {
    return this._muted;
  }

  getMusicVolume() {
    return this._musicVol;
  }

  getSfxVolume() {
    return this._sfxVol;
  }

  playBgm(trackKey) {
    const soundManager = this._getSoundManager();
    if (!soundManager) return;
    if (this._currentBgmKey === trackKey && this._currentBgm && this._currentBgm.isPlaying) {
      return;
    }

    const targetGain = this.getGain(this._musicVol) * (AUDIO_CONFIG.trims[trackKey] || 1);

    if (this._currentBgm) {
      try {
        this._currentBgm.stop();
      } catch (e) {}
      this._currentBgm = null;
    }

    this._currentBgmKey = trackKey;
    if (this.hasAudio(trackKey)) {
      try {
        const buffer = this._game?.cache?.audio?.get(trackKey);
        const ctx = soundManager.context;
        if (ctx && soundManager.destination && typeof AudioBuffer !== 'undefined' && buffer instanceof AudioBuffer) {
          this._currentBgm = new NativeLoopTrack(ctx, buffer, soundManager.destination, targetGain);
        } else {
          // HTML5 audio fallback (no Web Audio): Phaser looping
          this._currentBgm = soundManager.add(trackKey, { loop: true, volume: targetGain });
        }
        this._currentBgm.play();
      } catch (e) {
        console.warn('[AudioManager] Failed to play BGM:', trackKey, e);
        this._currentBgm = null;
      }
    } else {
      this._currentBgm = null;
    }
  }

  // Boss sfx key for a stage; stage 5 falls back to a random b1-b4 clip when its own file is missing.
  resolveBossSfxKey(stageNum = 1) {
    const key = `sfx.boss.b${stageNum}`;
    if (stageNum === 5 && this._getSoundManager() && !this.hasAudio(key)) {
      const fallbacks = ['sfx.boss.b1', 'sfx.boss.b2', 'sfx.boss.b3', 'sfx.boss.b4'];
      const available = fallbacks.filter((k) => this.hasAudio(k));
      if (available.length > 0) {
        return available[Math.floor(Math.random() * available.length)];
      }
    }
    return key;
  }

  playBossSfx(stageNum = 1) {
    this.duckMusic();
    this.playSfx(this.resolveBossSfxKey(stageNum));
  }

  duckMusic() {
    if (!this._currentBgm || !this._currentBgm.isPlaying) return;
    const baseGain = this.getGain(this._musicVol) * (AUDIO_CONFIG.trims[this._currentBgmKey] || 1);
    const duckedGain = baseGain * (1 - AUDIO_CONFIG.duckAmount);

    try {
      this._currentBgm.setVolume(duckedGain);
    } catch (e) {}

    if (this._duckTimer) clearTimeout(this._duckTimer);
    this._duckTimer = setTimeout(() => {
      if (this._currentBgm && this._currentBgm.isPlaying) {
        try {
          this._currentBgm.setVolume(baseGain);
        } catch (e) {}
      }
    }, AUDIO_CONFIG.duckMs);
  }

  playSfx(sfxKey) {
    if (this._muted || this._exclusive) return;

    if (sfxKey === 'sfx.hit') {
      const now = Date.now();
      if (now - this._lastHitTime < AUDIO_CONFIG.hitMinGapMs) return;
      this._lastHitTime = now;
    }

    const soundManager = this._getSoundManager();
    const gain = this.getGain(this._sfxVol) * (AUDIO_CONFIG.trims[sfxKey] || 1);

    if (soundManager && this.hasAudio(sfxKey)) {
      try {
        soundManager.play(sfxKey, { volume: gain });
      } catch (e) {
        this.playSynthBeep(sfxKey);
      }
    } else {
      // Procedural synthetic beep fallback
      this.playSynthBeep(sfxKey);
    }
  }

  playSynthBeep(type = 'default') {
    if (this._muted || this._exclusive) return;
    try {
      if (!this._synthCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) this._synthCtx = new AudioContext();
      }
      if (!this._synthCtx) return;
      if (this._synthCtx.state === 'suspended') {
        this._synthCtx.resume();
      }

      const osc = this._synthCtx.createOscillator();
      const gain = this._synthCtx.createGain();
      osc.connect(gain);
      gain.connect(this._synthCtx.destination);

      let freq = 440;
      let duration = 0.08;
      if (type.includes('hit')) {
        freq = 180;
        duration = 0.06;
      } else if (type.includes('boss')) {
        freq = 120;
        duration = 0.15;
      } else if (type.includes('win')) {
        freq = 660;
        duration = 0.2;
      }

      const effectiveGain = (this._sfxVol / 100) * 0.15;
      gain.gain.setValueAtTime(effectiveGain, this._synthCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this._synthCtx.currentTime + duration);

      osc.frequency.setValueAtTime(freq, this._synthCtx.currentTime);
      osc.start();
      osc.stop(this._synthCtx.currentTime + duration);
    } catch (e) {
      // Audio playback ignored
    }
  }

  // Meme Book clip: only one plays at a time. Taps while a clip is still playing are ignored,
  // so spamming the button never stacks copies of the same sound.
  playMemeClip(sfxKey, { duck = false } = {}) {
    if (this._muted || this._exclusive) return false;
    if (this.isMemeClipPlaying()) return false;
    const soundManager = this._getSoundManager();
    if (!soundManager || !this.hasAudio(sfxKey)) {
      this.playSynthBeep(sfxKey);
      return true;
    }
    try {
      const gain = this.getGain(this._sfxVol) * (AUDIO_CONFIG.trims[sfxKey] || 1);
      const clip = soundManager.add(sfxKey, { volume: gain });
      clip.once('complete', () => {
        if (this._memeClip === clip) this._memeClip = null;
        clip.destroy();
      });
      this._memeClip = clip;
      if (duck) this.duckMusic();
      clip.play();
      return true;
    } catch (e) {
      this._memeClip = null;
      return false;
    }
  }

  isMemeClipPlaying() {
    return Boolean(this._memeClip && this._memeClip.isPlaying);
  }

  stopMemeClip() {
    const clip = this._memeClip;
    this._memeClip = null;
    if (!clip) return;
    try {
      clip.stop();
      clip.destroy();
    } catch (e) {}
  }

  // True when the given track is playing and can actually be heard.
  isBgmAudible(trackKey) {
    if (this._muted || this.getGain(this._musicVol) <= 0) return false;
    if (this._currentBgmKey !== trackKey || !this._currentBgm || !this._currentBgm.isPlaying) return false;
    const sm = this._getSoundManager();
    if (sm?.mute) return false;
    if (sm?.context && sm.context.state !== 'running') return false;
    return true;
  }

  // Easter egg playback: pause the music and mute every other sound until endExclusive().
  beginExclusive() {
    this._exclusive = true;
    if (this._currentBgm && this._currentBgm.isPlaying) this._currentBgm.pause();
  }

  endExclusive() {
    if (!this._exclusive) return;
    this._exclusive = false;
    this.resumeAll();
  }

  isExclusive() {
    return this._exclusive;
  }

  // Volume for easter egg media: follows the SFX slider and the mute button.
  getEggGain() {
    return this.getGain(this._sfxVol);
  }

  pauseAll() {
    if (this._currentBgm && this._currentBgm.isPlaying) {
      this._currentBgm.pause();
    }
  }

  resumeAll() {
    if (this._exclusive) return;
    if (this._currentBgm && this._currentBgm.isPaused) {
      this._currentBgm.resume();
    }
  }
}

export const AudioManager = new AudioManagerImpl();
