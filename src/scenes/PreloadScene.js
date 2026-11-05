// src/scenes/PreloadScene.js
// Loads assets from manifest, displays themed loading bar, transitions to next scene.
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';
import { InkText } from '../ui/InkText.js';
import { Gauge } from '../ui/Gauge.js';
import { ASSETS_MANIFEST } from '../config/assets.generated.js';
import { loadEasterEggMedia } from '../systems/EasterEggPlayer.js';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.label = new InkText(this, w / 2, h / 2 - 30, 'LOADING BRAINROT...', {
      fontSize: '22px',
      color: THEME.colors.arcadeYellowHex,
      isHud: true
    });

    this.progressGauge = new Gauge(this, w / 2, h / 2 + 20, Math.min(w * 0.7, 320), 24, {
      maxVal: 100,
      currentVal: 0,
      fillColor: THEME.colors.slimeGreen,
      textFormat: (cur) => `${Math.round(cur)}%`
    });

    this.load.on('progress', (value) => {
      this.progressGauge.setValue(value * 100);
    });

    this.load.on('loaderror', (file) => {
      console.warn('[Preload] Failed to load asset:', file.key, file.src);
    });

    // Load any assets in manifest
    if (ASSETS_MANIFEST && ASSETS_MANIFEST.images) {
      for (const [key, data] of Object.entries(ASSETS_MANIFEST.images)) {
        this.load.image(key, data.path);
      }
    }

    // Load QR image (not in manifest; lives at assets/images/qr.jpg)
    this.load.image('qr', 'assets/images/qr.jpg');

    if (ASSETS_MANIFEST && ASSETS_MANIFEST.audio) {
      for (const [key, data] of Object.entries(ASSETS_MANIFEST.audio)) {
        this.load.audio(key, data.path);
      }
    }

    // Main-menu easter egg media (easteregg/ folder)
    loadEasterEggMedia(this.load);
  }

  create() {
    this.scene.start('MainMenu');
  }
}
