// src/ui/ScrollableText.js
// Reusable scrollable text container with geometry mask, drag & wheel scrolling, and visual scrollbar.
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';
import { InkText } from './InkText.js';

export class ScrollableText extends Phaser.GameObjects.Container {
  constructor(scene, x, y, width, height, options = {}) {
    super(scene, x, y);
    this.boxWidth = Math.max(width, 100);
    this.boxHeight = Math.max(height, 50);
    this.padding = options.padding ?? 12;

    this.options = {
      bgColor: options.bgColor ?? THEME.colors.playfieldTray,
      outlineColor: options.outlineColor ?? THEME.colors.ink,
      outlineWidth: options.outlineWidth ?? 2,
      radius: options.radius ?? 10,
      fontSize: options.fontSize || '13px',
      color: options.color || '#FFFFFF',
      lineSpacing: options.lineSpacing || 3,
      ...options
    };

    this.scrollY = 0;
    this.minScroll = 0;
    this.maxScroll = 0;
    this.isDragging = false;
    this.startY = 0;
    this.startScroll = 0;

    // Background & Border
    this.bgGraphics = scene.add.graphics();
    this.add(this.bgGraphics);

    // Scrollbar Graphics
    this.scrollbarGraphics = scene.add.graphics();

    // Text object
    this.textWrapWidth = Math.max(50, this.boxWidth - this.padding * 2 - 8);
    this.textObj = new InkText(scene, 0, 0, options.text || '', {
      fontSize: this.options.fontSize,
      color: this.options.color,
      originX: 0,
      originY: 0,
      align: 'left',
      strokeThickness: 2
    });
    this.textObj.setWordWrapWidth(this.textWrapWidth, true);
    this.textObj.setLineSpacing(this.options.lineSpacing);
    this.add(this.textObj);

    // Add scrollbar graphics above text
    this.add(this.scrollbarGraphics);

    // Create Geometry Mask
    this.maskGraphics = scene.make.graphics({ add: false });
    this.geomMask = this.maskGraphics.createGeometryMask();
    this.textObj.setMask(this.geomMask);

    // Hit area for dragging
    this.setSize(this.boxWidth, this.boxHeight);
    this.setInteractive({ useHandCursor: true });

    this.setupInteraction(scene);
    this.drawBackground();
    this.recalculate();

    scene.add.existing(this);
  }

  setupInteraction(scene) {
    this.on('pointerdown', (pointer) => {
      this.isDragging = true;
      this.startY = pointer.y;
      this.startScroll = this.scrollY;
    });

    const onPointerMove = (pointer) => {
      if (!this.isDragging || this.minScroll >= 0) return;
      const dy = pointer.y - this.startY;
      this.scrollY = Phaser.Math.Clamp(this.startScroll + dy, this.minScroll, this.maxScroll);
      this.updatePositions();
    };

    const finishDrag = () => {
      this.isDragging = false;
    };

    scene.input.on('pointermove', onPointerMove);
    scene.input.on('pointerup', finishDrag);
    scene.input.on('pointerupoutside', finishDrag);

    // Mouse wheel support
    this.wheelHandler = (pointer, gameObjects, deltaX, deltaY) => {
      if (this.minScroll >= 0) return;
      const bounds = this.getBounds();
      if (bounds.contains(pointer.x, pointer.y)) {
        this.scrollY = Phaser.Math.Clamp(this.scrollY - deltaY * 0.35, this.minScroll, this.maxScroll);
        this.updatePositions();
      }
    };
    scene.input.on('wheel', this.wheelHandler);

    scene.events.once('shutdown', () => {
      scene.input.off('pointermove', onPointerMove);
      scene.input.off('pointerup', finishDrag);
      scene.input.off('pointerupoutside', finishDrag);
      if (this.wheelHandler) {
        scene.input.off('wheel', this.wheelHandler);
      }
      if (this.maskGraphics) {
        this.maskGraphics.destroy();
      }
    });
  }

  setText(newText) {
    this.textObj.setText(newText);
    this.scrollY = 0;
    this.recalculate();
  }

  setFontSize(size) {
    this.textObj.setFontSize(size);
    this.recalculate();
  }

  resize(width, height) {
    this.boxWidth = Math.max(width, 100);
    this.boxHeight = Math.max(height, 50);
    this.setSize(this.boxWidth, this.boxHeight);
    if (this.input) {
      this.input.hitArea.setSize(this.boxWidth, this.boxHeight);
    }
    this.textWrapWidth = Math.max(50, this.boxWidth - this.padding * 2 - 8);
    this.textObj.setWordWrapWidth(this.textWrapWidth, true);

    this.drawBackground();
    this.recalculate();
  }

  drawBackground() {
    this.bgGraphics.clear();
    const w = this.boxWidth;
    const h = this.boxHeight;
    const { bgColor, outlineColor, outlineWidth, radius } = this.options;

    this.bgGraphics.fillStyle(bgColor, 0.95);
    this.bgGraphics.fillRoundedRect(-w / 2, -h / 2, w, h, radius);

    if (outlineWidth > 0) {
      this.bgGraphics.lineStyle(outlineWidth, outlineColor, 1);
      this.bgGraphics.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
    }
  }

  updateMask() {
    if (!this.maskGraphics || !this.scene) return;
    const matrix = this.getWorldTransformMatrix();
    const w = this.boxWidth;
    const h = this.boxHeight;
    const pad = 2;

    this.maskGraphics.clear();
    this.maskGraphics.fillStyle(0xffffff);
    this.maskGraphics.fillRect(
      matrix.tx - w / 2 + pad,
      matrix.ty - h / 2 + pad,
      w - pad * 2,
      h - pad * 2
    );
  }

  recalculate() {
    const visibleH = this.boxHeight - this.padding * 2;
    const textH = this.textObj.height;

    if (textH > visibleH) {
      this.minScroll = visibleH - textH;
    } else {
      this.minScroll = 0;
    }
    this.maxScroll = 0;
    this.scrollY = Phaser.Math.Clamp(this.scrollY, this.minScroll, this.maxScroll);

    this.updatePositions();
  }

  updatePositions() {
    const leftX = -this.boxWidth / 2 + this.padding;
    const topY = -this.boxHeight / 2 + this.padding;
    this.textObj.setPosition(leftX, topY + this.scrollY);

    this.updateMask();
    this.drawScrollbar();
  }

  drawScrollbar() {
    this.scrollbarGraphics.clear();
    if (this.minScroll >= 0) return;

    const visibleH = this.boxHeight - this.padding * 2;
    const textH = this.textObj.height;
    const trackH = this.boxHeight - 16;
    const trackX = this.boxWidth / 2 - 7;
    const trackTop = -this.boxHeight / 2 + 8;

    // Track
    this.scrollbarGraphics.fillStyle(THEME.colors.ink, 0.4);
    this.scrollbarGraphics.fillRoundedRect(trackX, trackTop, 4, trackH, 2);

    // Thumb
    const thumbRatio = Math.max(0.18, Math.min(1, visibleH / textH));
    const thumbH = Math.max(16, trackH * thumbRatio);
    const scrollProgress = this.minScroll === 0 ? 0 : this.scrollY / this.minScroll;
    const thumbY = trackTop + (trackH - thumbH) * scrollProgress;

    this.scrollbarGraphics.fillStyle(THEME.colors.slimeGreen, 0.9);
    this.scrollbarGraphics.fillRoundedRect(trackX, thumbY, 4, thumbH, 2);
  }
}

