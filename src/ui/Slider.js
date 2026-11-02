// src/ui/Slider.js
// Interactive slider for audio volumes with touch and drag.
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';
import { InkText } from './InkText.js';

export class Slider extends Phaser.GameObjects.Container {
  constructor(scene, x, y, width, height, options = {}) {
    super(scene, x, y);
    this.sliderWidth = width;
    this.sliderHeight = height;
    this.value = options.value ?? 50; // 0 to 100
    this.onChange = options.onChange || null;
    this.onDragEnd = options.onDragEnd || null;

    this.trackGraphics = scene.add.graphics();
    this.knob = scene.add.container(0, 0);

    this.knobShadow = scene.add.graphics();
    this.knobBody = scene.add.graphics();
    this.valLabel = new InkText(scene, 0, 0, `${Math.round(this.value)}`, {
      fontSize: '14px',
      color: '#FFFFFF',
      isHud: true
    });

    this.knob.add(this.knobShadow);
    this.knob.add(this.knobBody);
    this.knob.add(this.valLabel);

    this.add(this.trackGraphics);
    this.add(this.knob);

    this.setupInteraction();
    this.draw();
    scene.add.existing(this);
  }

  setValue(val) {
    this.value = Math.max(0, Math.min(100, val));
    this.draw();
  }

  draw() {
    this.trackGraphics.clear();
    this.knobShadow.clear();
    this.knobBody.clear();

    const w = this.sliderWidth;
    const h = 12;
    const halfW = w / 2;

    // Background track
    this.trackGraphics.fillStyle(THEME.colors.playfieldTray, 1);
    this.trackGraphics.fillRoundedRect(-halfW, -h / 2, w, h, 6);
    this.trackGraphics.lineStyle(2, THEME.colors.ink, 1);
    this.trackGraphics.strokeRoundedRect(-halfW, -h / 2, w, h, 6);

    // Active fill
    const fillW = (this.value / 100) * w;
    if (fillW > 0) {
      this.trackGraphics.fillStyle(THEME.colors.slimeGreen, 1);
      this.trackGraphics.fillRoundedRect(-halfW, -h / 2, fillW, h, 6);
    }

    // Knob position
    const knobX = -halfW + (this.value / 100) * w;
    this.knob.setPosition(knobX, 0);

    const kw = 36;
    const kh = 32;
    // Knob shadow
    this.knobShadow.fillStyle(THEME.colors.hardShadow, 1);
    this.knobShadow.fillRoundedRect(-kw / 2, -kh / 2 + 3, kw, kh, 8);

    // Knob body
    this.knobBody.fillStyle(THEME.colors.arcadeYellow, 1);
    this.knobBody.fillRoundedRect(-kw / 2, -kh / 2, kw, kh, 8);
    this.knobBody.lineStyle(3, THEME.colors.ink, 1);
    this.knobBody.strokeRoundedRect(-kw / 2, -kh / 2, kw, kh, 8);

    this.valLabel.setText(`${Math.round(this.value)}`);
  }

  setupInteraction() {
    this.setSize(this.sliderWidth + 30, 48);
    this.setInteractive({ useHandCursor: true });

    let dragging = false;

    const updateFromPointer = (pointer) => {
      const matrix = this.getWorldTransformMatrix ? this.getWorldTransformMatrix() : null;
      const worldCenterX = matrix ? matrix.tx : (this.x + (this.parentContainer ? this.parentContainer.x : 0));
      const localX = pointer.x - worldCenterX;
      const halfW = this.sliderWidth / 2;
      const clampedX = Math.max(-halfW, Math.min(halfW, localX));
      const pct = (clampedX + halfW) / this.sliderWidth;
      this.value = Math.round(pct * 100);
      this.draw();
      if (this.onChange) {
        this.onChange(this.value);
      }
    };

    this.on('pointerdown', (pointer) => {
      dragging = true;
      updateFromPointer(pointer);
    });

    const onPointerMove = (pointer) => {
      if (dragging) {
        updateFromPointer(pointer);
      }
    };
    this.scene.input.on('pointermove', onPointerMove);

    const finishDrag = () => {
      if (dragging) {
        dragging = false;
        if (this.onDragEnd) {
          this.onDragEnd(this.value);
        }
      }
    };

    this.scene.input.on('pointerup', finishDrag);
    this.scene.input.on('pointerupoutside', finishDrag);

    this.once('destroy', () => {
      if (this.scene && this.scene.input) {
        this.scene.input.off('pointermove', onPointerMove);
        this.scene.input.off('pointerup', finishDrag);
        this.scene.input.off('pointerupoutside', finishDrag);
      }
    });
  }
}

