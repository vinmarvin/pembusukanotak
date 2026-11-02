// src/ui/Toggle.js
// Segmented toggle button for options like Language (English | Indonesia).
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';
import { InkText } from './InkText.js';
import { AudioManager } from '../systems/AudioManager.js';

export class Toggle extends Phaser.GameObjects.Container {
  constructor(scene, x, y, width, height, options = {}) {
    super(scene, x, y);
    this.toggleWidth = width;
    this.toggleHeight = Math.max(height, 44);
    this.items = options.items || [{ key: 'en', label: 'English' }, { key: 'id', label: 'Indonesia' }];
    this.selectedKey = options.selectedKey || this.items[0].key;
    this.onSelect = options.onSelect || null;

    this.bgGraphics = scene.add.graphics();
    this.buttons = [];

    this.add(this.bgGraphics);
    this.createSegments(scene);
    this.draw();
    scene.add.existing(this);
  }

  createSegments(scene) {
    const segW = this.toggleWidth / this.items.length;
    const h = this.toggleHeight;

    this.items.forEach((item, idx) => {
      const segX = -this.toggleWidth / 2 + segW * idx + segW / 2;
      const container = scene.add.container(segX, 0);

      const segBg = scene.add.graphics();
      const label = new InkText(scene, 0, 0, item.label, {
        fontSize: '15px',
        color: '#FFFFFF',
        isHud: true
      });

      container.add(segBg);
      container.add(label);
      container.setSize(segW, h);
      container.setInteractive({ useHandCursor: true });

      container.on('pointerup', () => {
        if (this.selectedKey !== item.key) {
          this.selectedKey = item.key;
          AudioManager.playSfx('sfx.click');
          this.draw();
          if (this.onSelect) {
            this.onSelect(item.key);
          }
        }
      });

      this.add(container);
      this.buttons.push({ item, container, segBg, label });
    });
  }

  setSelected(key) {
    this.selectedKey = key;
    this.draw();
  }

  draw() {
    this.bgGraphics.clear();
    const w = this.toggleWidth;
    const h = this.toggleHeight;
    const segW = w / this.items.length;

    // Base background
    this.bgGraphics.fillStyle(THEME.colors.playfieldTray, 1);
    this.bgGraphics.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    this.bgGraphics.lineStyle(3, THEME.colors.ink, 1);
    this.bgGraphics.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);

    this.buttons.forEach(({ item, segBg, label }) => {
      segBg.clear();
      const isActive = item.key === this.selectedKey;
      if (isActive) {
        segBg.fillStyle(THEME.colors.slimeGreen, 1);
        segBg.fillRoundedRect(-segW / 2 + 3, -h / 2 + 3, segW - 6, h - 6, 10);
        segBg.lineStyle(2, THEME.colors.ink, 1);
        segBg.strokeRoundedRect(-segW / 2 + 3, -h / 2 + 3, segW - 6, h - 6, 10);
        // Active: white text with crisp dark outline for high contrast on green
        label.setColor('#FFFFFF');
        label.setStroke(THEME.colors.inkHex, 3);
        label.setAlpha(1);
      } else {
        // Inactive: light text on dark tray
        label.setColor('#DDDDDD');
        label.setStroke(THEME.colors.inkHex, 2);
        label.setAlpha(0.7);
      }
    });
  }
}

