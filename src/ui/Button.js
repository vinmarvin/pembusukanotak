// src/ui/Button.js
// Interactive button with ink outline, offset shadow, and pressed animation.
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';
import { InkText } from './InkText.js';
import { AudioManager } from '../systems/AudioManager.js';

export class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, width, height, options = {}) {
    super(scene, x, y);
    this.btnWidth = Math.max(width, 44);
    this.btnHeight = Math.max(height, 44);
    this.options = {
      bgColor: options.bgColor ?? THEME.colors.slimeGreen,
      pressedColor: options.pressedColor ?? options.bgColor ?? THEME.colors.slimeGreen,
      outlineColor: options.outlineColor ?? THEME.colors.ink,
      outlineWidth: options.outlineWidth ?? THEME.depth.outlineWidth,
      shadowOffset: options.shadowOffset ?? THEME.depth.shadowOffset,
      radius: options.radius ?? THEME.depth.buttonRadius,
      text: options.text || '',
      textColor: options.textColor || '#FFFFFF',
      fontSize: options.fontSize || '18px',
      onClick: options.onClick || null,
      ...options
    };

    this._isDown = false;
    this._enabled = true;

    this.shadowGraphics = scene.add.graphics();
    this.btnGraphics = scene.add.graphics();
    this.contentContainer = scene.add.container(0, 0);

    this.add(this.shadowGraphics);
    this.add(this.btnGraphics);
    this.add(this.contentContainer);

    if (this.options.text) {
      this.label = new InkText(scene, 0, -1, this.options.text, {
        fontSize: this.options.fontSize,
        color: this.options.textColor,
        isHud: true
      });
      this.contentContainer.add(this.label);
    }

    this.draw();
    this.setupInteraction();
    scene.add.existing(this);
  }

  setText(newText) {
    if (this.label) {
      this.label.setText(newText);
    }
  }

  setFontSize(size) {
    if (this.label) {
      this.label.setFontSize(size);
    }
  }

  resize(width, height) {
    this.btnWidth = Math.max(width, 44);
    this.btnHeight = Math.max(height, 44);
    this.setSize(this.btnWidth, this.btnHeight + this.options.shadowOffset);
    if (this.input) {
      this.input.hitArea.setSize(this.btnWidth, this.btnHeight + this.options.shadowOffset);
    }
    this.draw();
  }

  draw() {
    this.shadowGraphics.clear();
    this.btnGraphics.clear();

    const w = this.btnWidth;
    const h = this.btnHeight;
    const { radius, bgColor, outlineColor, outlineWidth, shadowOffset } = this.options;

    const yOffset = this._isDown ? shadowOffset : 0;
    const currentShadow = this._isDown ? 0 : shadowOffset;

    if (currentShadow > 0) {
      this.shadowGraphics.fillStyle(THEME.colors.hardShadow, 1);
      this.shadowGraphics.fillRoundedRect(-w / 2, -h / 2 + currentShadow, w, h, radius);
    }

    this.btnGraphics.fillStyle(bgColor, 1);
    this.btnGraphics.fillRoundedRect(-w / 2, -h / 2 + yOffset, w, h, radius);

    if (outlineWidth > 0) {
      this.btnGraphics.lineStyle(outlineWidth, outlineColor, 1);
      this.btnGraphics.strokeRoundedRect(-w / 2, -h / 2 + yOffset, w, h, radius);
    }

    this.contentContainer.setPosition(0, yOffset);
  }

  setupInteraction() {
    this.setSize(this.btnWidth, this.btnHeight + this.options.shadowOffset);
    this.setInteractive({ useHandCursor: true });

    this.on('pointerdown', () => {
      if (!this._enabled) return;
      this._isDown = true;
      this.draw();
    });

    this.on('pointerup', () => {
      if (!this._enabled) return;
      if (this._isDown) {
        this._isDown = false;
        this.draw();
        AudioManager.playSfx('sfx.click');
        if (this.options.onClick) {
          this.options.onClick();
        }
      }
    });

    this.on('pointerout', () => {
      if (this._isDown) {
        this._isDown = false;
        this.draw();
      }
    });
  }

  setEnabled(val) {
    this._enabled = val;
    this.alpha = val ? 1 : 0.5;
  }
}

