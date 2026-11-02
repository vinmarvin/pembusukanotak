// src/ui/Panel.js
// Visual panel container with rounded corners, ink outline, and offset shadow.
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';

export class Panel extends Phaser.GameObjects.Container {
  constructor(scene, x, y, width, height, options = {}) {
    super(scene, x, y);
    this.panelWidth = width;
    this.panelHeight = height;
    this.options = {
      bgColor: options.bgColor ?? THEME.colors.playfieldTray,
      outlineColor: options.outlineColor ?? THEME.colors.ink,
      outlineWidth: options.outlineWidth ?? THEME.depth.outlineWidth,
      shadowOffset: options.shadowOffset ?? THEME.depth.shadowOffset,
      radius: options.radius ?? THEME.depth.panelRadius,
      ...options
    };

    this.shadowGraphics = scene.add.graphics();
    this.baseGraphics = scene.add.graphics();

    this.add(this.shadowGraphics);
    this.add(this.baseGraphics);

    this.draw();
    scene.add.existing(this);
  }

  resize(width, height) {
    this.panelWidth = width;
    this.panelHeight = height;
    this.draw();
  }

  draw() {
    this.shadowGraphics.clear();
    this.baseGraphics.clear();

    const w = this.panelWidth;
    const h = this.panelHeight;
    const { radius, bgColor, outlineColor, outlineWidth, shadowOffset } = this.options;

    // Hard offset shadow
    if (shadowOffset > 0) {
      this.shadowGraphics.fillStyle(THEME.colors.hardShadow, 1);
      this.shadowGraphics.fillRoundedRect(
        -w / 2,
        -h / 2 + shadowOffset,
        w,
        h,
        radius
      );
    }

    // Main panel background and ink outline
    this.baseGraphics.fillStyle(bgColor, 1);
    this.baseGraphics.fillRoundedRect(-w / 2, -h / 2, w, h, radius);

    if (outlineWidth > 0) {
      this.baseGraphics.lineStyle(outlineWidth, outlineColor, 1);
      this.baseGraphics.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
    }
  }
}

