// src/ui/BattleCallout.js
// Boss Rush callout text (GAME_SPEC decision 38): big outlined text in the middle of the board,
// popping in per break and replacing the previous one, then fading out. Never takes input.
import { CALLOUT_CONFIG } from '../config/battlefx.config.js';
import { InkText } from './InkText.js';
import { prefersReducedMotion } from '../core/reducedMotion.js';
import { t } from '../i18n/index.js';

export class BattleCallout {
  constructor(scene) {
    this.scene = scene;
    this.text = null;
  }

  // tier: entry of CALLOUT_CONFIG.tiers; board: { x, y, width, height } in world px.
  show(tier, board) {
    this.hide();
    if (!tier || !board) return;
    const cfg = CALLOUT_CONFIG;
    const scene = this.scene;

    const fontPx = Math.round(Math.min(cfg.maxFontPx, board.width * cfg.fontShare));
    const txt = new InkText(scene, board.x + board.width / 2, board.y + board.height / 2, t(tier.key), {
      fontSize: `${fontPx}px`,
      color: tier.color,
      isTitle: true,
      strokeThickness: cfg.strokeThickness
    });
    txt.setDepth(cfg.depth);
    // Shrink to fit the board width
    const maxW = board.width * cfg.maxWidthShare;
    const baseScale = txt.width > maxW ? maxW / txt.width : 1;
    this.text = txt;

    const reduced = prefersReducedMotion();
    txt.setAlpha(reduced ? 0 : 1);
    txt.setScale(reduced ? baseScale : baseScale * cfg.popScale);
    scene.tweens.add({
      targets: txt,
      alpha: 1,
      scale: baseScale,
      duration: cfg.popInMs,
      ease: reduced ? 'Linear' : 'Back.easeOut'
    });
    scene.tweens.add({
      targets: txt,
      alpha: 0,
      delay: cfg.popInMs + cfg.holdMs,
      duration: cfg.fadeOutMs,
      onComplete: () => {
        if (this.text === txt) this.text = null;
        txt.destroy();
      }
    });
  }

  hide() {
    if (!this.text) return;
    this.scene.tweens.killTweensOf(this.text);
    this.text.destroy();
    this.text = null;
  }
}
