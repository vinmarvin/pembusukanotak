// src/systems/MenuListenTracker.js
// Wall-clock tracker for the "You are fully brain rot" easter egg.
// Uses setInterval + Date.now instead of the Phaser game loop, so it keeps counting
// while the tab is in the background (the Phaser loop is paused when the tab is hidden).
import { AudioManager } from './AudioManager.js';
import { SaveManager } from './SaveManager.js';
import { unlockFullyBrainRot } from '../core/unlocks/achievements.js';
import { MENU_LISTEN, createMenuListenState, stepMenuListen } from '../core/unlocks/menuListen.js';

const MENU_TRACK = 'bgm.menu';

export class MenuListenTracker {
  constructor({ onUnlock } = {}) {
    this.onUnlock = onUnlock;
    this.state = createMenuListenState();
    this.timer = null;
    this.last = 0;
  }

  start() {
    if (SaveManager.data?.achievements?.fullyBrainRot) return;
    this.stop();
    this.state = createMenuListenState();
    this.state.wasAudible = AudioManager.isBgmAudible(MENU_TRACK);
    this.last = Date.now();
    this.timer = setInterval(() => this.tick(), MENU_LISTEN.tickMs);
  }

  tick() {
    const now = Date.now();
    const dtSec = (now - this.last) / 1000;
    this.last = now;

    this.state = stepMenuListen(this.state, { dtSec, audible: AudioManager.isBgmAudible(MENU_TRACK) });
    if (!this.state.reached) return;

    this.stop();
    let newly = false;
    SaveManager.update((s) => {
      newly = unlockFullyBrainRot(s);
    });
    if (newly && this.onUnlock) this.onUnlock();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
