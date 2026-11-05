// src/systems/SaveManager.js
// Versioned persistence with error handling and fallback defaults.
import { EventBus } from './EventBus.js';

const SAVE_KEY = 'po_save_v1';

export function getDefaultSave() {
  return {
    version: 1,
    stageCleared: 0,
    gameOversSinceStage1Start: 0,
    storyCompleted: false,
    candyDestroyed: { c67: 0, nugget: 0, skibidi: 0, lirili: 0, udin: 0, bluberini: 0 },
    bossDefeated: { b1: false, b2: false, b3: false, b4: false, b5: false },
    achievements: {
      freshNewBrain: false,
      fullyBrainRot: false,
      scoreHunter: false,
      memeCurator: false,
      supportCreator: false
    },
    bestScore: 0,
    tutorialSeen: false,
    timeKillTutorialSeen: false,
    settings: {
      musicVolume: 70,
      sfxVolume: 80,
      muted: false,
      language: 'en'
    }
  };
}

class SaveManagerImpl {
  constructor() {
    this._data = this.load();
  }

  get data() {
    return this._data;
  }

  load() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return getDefaultSave();
      }
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return getDefaultSave();
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1) {
        return getDefaultSave();
      }
      // Merge with defaults in case of missing keys
      const def = getDefaultSave();
      if (parsed.achievements && parsed.achievements.fastHand !== undefined) {
        delete parsed.achievements.fastHand;
      }
      return {
        ...def,
        ...parsed,
        candyDestroyed: { ...def.candyDestroyed, ...(parsed.candyDestroyed || {}) },
        bossDefeated: { ...def.bossDefeated, ...(parsed.bossDefeated || {}) },
        achievements: { ...def.achievements, ...(parsed.achievements || {}) },
        settings: { ...def.settings, ...(parsed.settings || {}) }
      };
    } catch (e) {
      console.warn('[SaveManager] Failed to read from localStorage:', e);
      return getDefaultSave();
    }
  }

  save() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(SAVE_KEY, JSON.stringify(this._data));
      }
    } catch (e) {
      console.warn('[SaveManager] Failed to write to localStorage:', e);
    }
    return this._data;
  }

  update(updater) {
    if (typeof updater === 'function') {
      updater(this._data);
    } else if (typeof updater === 'object' && updater !== null) {
      Object.assign(this._data, updater);
    }
    this.save();
    // Lets open screens (e.g. main menu counters) refresh as soon as progress changes.
    EventBus.emit('save:changed', this._data);
    return this._data;
  }

  reset() {
    this._data = getDefaultSave();
    this.save();
    EventBus.emit('save:changed', this._data);
    return this._data;
  }
}

export const SaveManager = new SaveManagerImpl();

