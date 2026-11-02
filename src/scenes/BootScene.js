// src/scenes/BootScene.js
// First scene: unlocks WebAudio on first user interaction, inits layout and placeholders.
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';
import { InkText } from '../ui/InkText.js';
import { AudioManager } from '../systems/AudioManager.js';
import { LayoutManager } from '../systems/LayoutManager.js';
import { PlaceholderArt } from '../systems/PlaceholderArt.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    LayoutManager.init(this.game);
    AudioManager.init(this);
    PlaceholderArt.createAllPlaceholders(this);

    const w = this.scale.width;
    const h = this.scale.height;

    this.title = new InkText(this, w / 2, h / 2 - 40, 'PEMBUSUKAN OTAK', {
      fontSize: '32px',
      color: THEME.colors.arcadeYellowHex,
      isTitle: true
    });

    this.tapText = new InkText(this, w / 2, h / 2 + 30, 'TAP TO START', {
      fontSize: '20px',
      color: THEME.colors.slimeGreenHex,
      isHud: true
    });

    this.tweens.add({
      targets: this.tapText,
      alpha: 0.3,
      yoyo: true,
      repeat: -1,
      duration: 600
    });

    this.input.once('pointerdown', () => {
      AudioManager.unlock();
      this.scene.start('Preload');
    });
  }
}

