// src/ui/SpriteFit.js
// Utility to apply fit.js sizing calculations to Phaser GameObjects.
import { fitCandy, fitContain, fitPortrait } from '../core/assets/fit.js';

export class SpriteFit {
  static fitCandy(sprite, cellSize) {
    if (!sprite || !sprite.texture) return;
    const srcW = sprite.width;
    const srcH = sprite.height;
    const fit = fitCandy(srcW, srcH, cellSize);
    sprite.setScale(fit.scale);
    return fit;
  }

  static fitContain(sprite, slotWidth, slotHeight) {
    if (!sprite || !sprite.texture) return;
    const srcW = sprite.width;
    const srcH = sprite.height;
    const fit = fitContain(srcW, srcH, slotWidth, slotHeight);
    sprite.setScale(fit.scale);
    return fit;
  }

  static fitPortrait(sprite, slot) {
    if (!sprite || !sprite.texture) return;
    const srcW = sprite.width;
    const srcH = sprite.height;
    const fit = fitPortrait(srcW, srcH, slot);
    sprite.setOrigin(fit.originX, fit.originY);
    sprite.setPosition(fit.x, fit.y);
    sprite.setScale(fit.scale);
    return fit;
  }
}

