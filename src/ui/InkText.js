// src/ui/InkText.js
// Phaser text helper with thick ink outline and crisp styling.
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';

export class InkText extends Phaser.GameObjects.Text {
  constructor(scene, x, y, text, style = {}) {
    const isDarkText = style.color && (
      style.color === THEME.colors.inkHex ||
      style.color === THEME.colors.loreInkHex ||
      style.color === '#0B0410' ||
      style.color === '#2B1A3D' ||
      style.color === '#000000' ||
      style.color === '#111111'
    );

    const defaultStyle = {
      fontFamily: style.isTitle ? THEME.fonts.title : (style.isHud ? THEME.fonts.hud : THEME.fonts.body),
      fontSize: style.fontSize || '18px',
      color: style.color || '#FFFFFF',
      stroke: style.stroke !== undefined ? style.stroke : (isDarkText ? null : THEME.colors.inkHex),
      strokeThickness: style.strokeThickness !== undefined ? style.strokeThickness : (isDarkText ? 0 : THEME.depth.outlineWidth),
      shadow: style.shadow !== undefined ? style.shadow : (isDarkText ? null : {
        offsetX: 2,
        offsetY: 2,
        color: THEME.colors.hardShadowHex,
        blur: 0,
        stroke: true,
        fill: true
      }),
      align: style.align || 'center'
    };

    super(scene, x, y, text, defaultStyle);
    this.setOrigin(style.originX ?? 0.5, style.originY ?? 0.5);
    scene.add.existing(this);
  }
}

