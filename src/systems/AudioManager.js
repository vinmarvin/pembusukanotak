// src/systems/AudioManager.js
// Audio manager handling BGM crossfade, SFX pooling, ducking, live volume curves, and synth fallbacks.
import { AUDIO_CONFIG } from '../config/audio.config.js';
import { SaveManager } from './SaveManager.js';
import { EventBus } from './EventBus.js';

class AudioManagerImpl {
  constructor() {
    this._scene = null;
    this._game = null;
    this._currentBgm = null;
    this._currentBgmKey = null;
    this._unlocked = false;
    this._lastHitTime = 0;
    this._synthCtx = null;
  }

  init(scene) {
    this._scene = scene;
    this._game = scene?.game || scene;
    const settings = SaveManager.data.settings || {};
    this._musicVol = settings.musicVolume ?? AUDIO_CONFIG.musicVolume;
    this._sfxVol = settings.sfxVolume ?? AUDIO_CONFIG.sfxVolume;
    this._muted = settings.muted ?? false;

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pauseAll();
        } else {
          this.resumeAll();
        }
      });
    }

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
        this._currentBgm = soundManager.add(trackKey, { loop: true, volume: targetGain });
        this._currentBgm.play();
      } catch (e) {
        console.warn('[AudioManager] Failed to play BGM:', trackKey, e);
        this._currentBgm = null;
      }
    } else {
      this._currentBgm = null;
    }
  }

  playBossSfx(stageNum = 1) {
    const key = `sfx.boss.b${stageNum}`;
    const soundManager = this._getSoundManager();
    let targetKey = key;

    if (stageNum === 5 && soundManager && !this.hasAudio(key)) {
      const fallbacks = ['sfx.boss.b1', 'sfx.boss.b2', 'sfx.boss.b3', 'sfx.boss.b4'];
      const available = fallbacks.filter((k) => this.hasAudio(k));
      if (available.length > 0) {
        targetKey = available[Math.floor(Math.random() * available.length)];
      }
    }

    this.duckMusic();
    this.playSfx(targetKey);
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
    if (this._muted) return;

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
    if (this._muted) return;
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

  pauseAll() {
    if (this._currentBgm && this._currentBgm.isPlaying) {
      this._currentBgm.pause();
    }
  }

  resumeAll() {
    if (this._currentBgm && this._currentBgm.isPaused) {
      this._currentBgm.resume();
    }
  }
}

export const AudioManager = new AudioManagerImpl();
