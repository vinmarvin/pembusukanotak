// src/ui/Gauge.js
// HP and countdown gauge bar with outline, smooth fill, and low-time flash.
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';
import { InkText } from './InkText.js';

export class Gauge extends Phaser.GameObjects.Container {
  constructor(scene, x, y, width, height, options = {}) {
    super(scene, x, y);
    this.gaugeWidth = width;
    this.gaugeHeight = height;
    this.options = {
      maxVal: options.maxVal || 100,
      currentVal: options.currentVal ?? options.maxVal ?? 100,
      fillColor: options.fillColor ?? THEME.colors.slimeGreen,
      bgColor: options.bgColor ?? THEME.colors.playfieldTray,
      outlineColor: options.outlineColor ?? THEME.colors.ink,
      outlineWidth: options.outlineWidth ?? 3,
      radius: options.radius ?? 8,
      showText: options.showText ?? true,
      textFormat: options.textFormat || ((cur, max) => `${Math.ceil(cur)} / ${max}`),
      isCountdown: options.isCountdown ?? false,
      ...options
    };

    this.currentVal = this.options.currentVal;
    this.maxVal = this.options.maxVal;

    this.bgGraphics = scene.add.graphics();
    this.fillGraphics = scene.add.graphics();
    this.borderGraphics = scene.add.graphics();

    this.add(this.bgGraphics);
    this.add(this.fillGraphics);
    this.add(this.borderGraphics);

    if (this.options.showText) {
      this.label = new InkText(scene, 0, 0, '', {
        fontSize: `${Math.max(12, Math.floor(height * 0.7))}px`,
        color: '#FFFFFF',
        isHud: true
      });
      this.add(this.label);
    }

    this.draw();
    scene.add.existing(this);
  }

  setValue(val, max = null) {
    if (max !== null) this.maxVal = max;
    this.currentVal = Math.max(0, Math.min(this.maxVal, val));
    this.draw();
  }

  draw() {
    this.bgGraphics.clear();
    this.fillGraphics.clear();
    this.borderGraphics.clear();

    const w = this.gaugeWidth;
    const h = this.gaugeHeight;
    const { radius, bgColor, outlineColor, outlineWidth } = this.options;

    // Background
    this.bgGraphics.fillStyle(bgColor, 1);
    this.bgGraphics.fillRoundedRect(-w / 2, -h / 2, w, h, radius);

    // Fill
    const pct = this.maxVal > 0 ? Math.max(0, Math.min(1, this.currentVal / this.maxVal)) : 0;
    if (pct > 0) {
      let fillColor = this.options.fillColor;

      // Countdown flash when <= 3s
      if (this.options.isCountdown && this.currentVal <= 3.0) {
        // Flash magenta and yellow
        const flashPhase = Math.floor(Date.now() / 200) % 2;
        fillColor = flashPhase === 0 ? THEME.colors.punchMagenta : THEME.colors.arcadeYellow;
      }

      this.fillGraphics.fillStyle(fillColor, 1);
      const fillW = Math.max(radius * 2, w * pct);
      this.fillGraphics.fillRoundedRect(-w / 2, -h / 2, fillW, h, radius);
    }

    // Border
    if (outlineWidth > 0) {
      this.borderGraphics.lineStyle(outlineWidth, outlineColor, 1);
      this.borderGraphics.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
    }

    // Text
    if (this.label) {
      this.label.setText(this.options.textFormat(this.currentVal, this.maxVal));
    }
  }

  resize(width, height) {
    this.gaugeWidth = width;
    this.gaugeHeight = height;
    if (this.label) {
      this.label.setFontSize(`${Math.max(12, Math.floor(height * 0.7))}px`);
    }
    this.draw();
  }
}

