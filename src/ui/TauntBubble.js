// src/ui/TauntBubble.js
// Speech bubble with an enemy taunt (GAME_SPEC decision 37). It sits in a free zone given by
// LayoutManager.planTauntBubble (never over the board), its tail points up at the enemy, and it
// pops in, holds, then fades. It never takes input.
import { TAUNT_CONFIG } from '../config/battlefx.config.js';
import { InkText } from './InkText.js';
import { prefersReducedMotion } from '../core/reducedMotion.js';

export class TauntBubble {
  constructor(scene) {
    this.scene = scene;
    this.container = null;
  }

  // zone: free rectangle; anchorX: world x the tail points at (the enemy portrait).
  show(text, zone, anchorX) {
    this.hide();
    if (!zone) return;
    const cfg = TAUNT_CONFIG.bubble;
    const scene = this.scene;

    const w = Math.min(cfg.maxWidth, zone.width);
    const label = new InkText(scene, 0, 0, text, {
      fontSize: `${cfg.fontSize}px`,
      color: cfg.textColor,
      isHud: true
    });
    label.setWordWrapWidth(w - cfg.padX * 2).setAlign('center');
    const h = label.height + cfg.padY * 2;

    // Centre under the enemy, kept inside the zone
    const cx = Math.max(zone.x + w / 2, Math.min(zone.x + zone.width - w / 2, anchorX));
    const top = zone.y + cfg.tail;
    const cy = top + h / 2;

    const g = scene.add.graphics();
    g.fillStyle(cfg.bgColor, 1);
    g.lineStyle(cfg.outlineWidth, cfg.outlineColor, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, cfg.radius);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, cfg.radius);
    // Tail pointing up at the enemy
    const inset = cfg.radius + cfg.tail;
    const tx = Math.max(-w / 2 + inset, Math.min(w / 2 - inset, anchorX - cx));
    const tri = [tx - cfg.tail, -h / 2 + 1, tx + cfg.tail, -h / 2 + 1, tx, -h / 2 - cfg.tail];
    g.fillTriangle(...tri);
    g.lineBetween(tri[0], tri[1], tri[4], tri[5]);
    g.lineBetween(tri[2], tri[3], tri[4], tri[5]);
    // Cover the outline under the tail so it joins the bubble
    g.fillRect(tx - cfg.tail + cfg.outlineWidth, -h / 2 - 1, (cfg.tail - cfg.outlineWidth) * 2, cfg.outlineWidth + 2);

    const box = scene.add.container(cx, cy, [g, label]);
    box.setDepth(TAUNT_CONFIG.depth);
    this.container = box;

    const reduced = prefersReducedMotion();
    box.setAlpha(0);
    if (!reduced) box.setScale(0.6);
    scene.tweens.add({
      targets: box,
      alpha: 1,
      scale: 1,
      duration: TAUNT_CONFIG.popInMs,
      ease: reduced ? 'Linear' : 'Back.easeOut'
    });
    scene.tweens.add({
      targets: box,
      alpha: 0,
      delay: TAUNT_CONFIG.showMs,
      duration: TAUNT_CONFIG.fadeOutMs,
      onComplete: () => {
        if (this.container === box) this.container = null;
        box.destroy();
      }
    });
  }

  hide() {
    if (!this.container) return;
    this.scene.tweens.killTweensOf(this.container);
    this.container.destroy();
    this.container = null;
  }
}

