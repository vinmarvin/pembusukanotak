// src/ui/AttackFx.js
// Battle attack visuals: energy orbs from matched candies to the enemy, hit impacts, damage pops.
// All coordinates are world (scene) coordinates; objects live at scene level above the HUD.
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';
import { InkText } from './InkText.js';
import { prefersReducedMotion } from '../core/reducedMotion.js';

const FX_DEPTH = 150;

export function worldPos(obj) {
  const m = obj.getWorldTransformMatrix();
  return { x: m.tx, y: m.ty };
}

export function burst(scene, x, y, color, count = 6, dist = 28) {
  if (prefersReducedMotion()) return;
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const d = dist * (0.6 + Math.random() * 0.6);
    const dot = scene.add.circle(x, y, 2.5 + Math.random() * 2.5, color, 1).setDepth(FX_DEPTH);
    scene.tweens.add({
      targets: dot,
      x: x + Math.cos(a) * d,
      y: y + Math.sin(a) * d,
      alpha: 0,
      scale: 0.3,
      duration: 360,
      ease: 'Cubic.easeOut',
      onComplete: () => dot.destroy()
    });
  }
}

/**
 * Fly one glowing orb along an arc from `from` to `to`, then call onHit.
 */
export function fireOrb(scene, from, to, { delay = 0, color = THEME.colors.arcadeYellow, arc = -70, onHit } = {}) {
  if (prefersReducedMotion()) {
    scene.time.delayedCall(delay, () => onHit && onHit());
    return;
  }
  scene.time.delayedCall(delay, () => {
    const glow = scene.add.circle(from.x, from.y, 11, color, 0.35).setDepth(FX_DEPTH);
    const core = scene.add.circle(from.x, from.y, 5, THEME.colors.white, 1).setDepth(FX_DEPTH + 1);
    const ctrl = new Phaser.Math.Vector2((from.x + to.x) / 2 + (Math.random() - 0.5) * 60, Math.min(from.y, to.y) + arc);
    const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(from.x, from.y), ctrl, new Phaser.Math.Vector2(to.x, to.y));
    const pt = new Phaser.Math.Vector2();
    const state = { t: 0 };
    let trailToggle = false;
    scene.tweens.add({
      targets: state,
      t: 1,
      duration: THEME.fx.orbFlightMs,
      ease: 'Sine.easeIn',
      onUpdate: () => {
        curve.getPoint(state.t, pt);
        glow.setPosition(pt.x, pt.y);
        core.setPosition(pt.x, pt.y);
        trailToggle = !trailToggle;
        if (trailToggle) {
          const tr = scene.add.circle(pt.x, pt.y, 4, color, 0.7).setDepth(FX_DEPTH);
          scene.tweens.add({ targets: tr, alpha: 0, scale: 0.2, duration: 220, onComplete: () => tr.destroy() });
        }
      },
      onComplete: () => {
        glow.destroy();
        core.destroy();
        if (onHit) onHit();
      }
    });
  });
}

/**
 * Hit reaction on a portrait sprite: white flash, red tint, shake, squash. Safe to call repeatedly.
 */
export function hitReact(scene, sprite, { tint = 0xff6680 } = {}) {
  if (!sprite || !sprite.scene) return;
  sprite.setTintFill(THEME.colors.white);
  scene.time.delayedCall(60, () => sprite.scene && sprite.setTint(tint));
  scene.time.delayedCall(170, () => sprite.scene && sprite.clearTint());
  if (prefersReducedMotion() || sprite._hitShaking) return;
  sprite._hitShaking = true;
  const baseX = sprite.x;
  const baseSX = sprite.scaleX;
  scene.tweens.add({
    targets: sprite,
    x: baseX + 6,
    scaleX: baseSX * 0.9,
    duration: 50,
    yoyo: true,
    repeat: 1,
    onComplete: () => {
      sprite._hitShaking = false;
    }
  });
}

/**
 * Damage number that pops in, rises and fades.
 */
export function damagePop(scene, x, y, text, color = THEME.colors.arcadeYellowHex) {
  const txt = new InkText(scene, x + (Math.random() - 0.5) * 24, y, text, {
    fontSize: '28px',
    color,
    isTitle: true
  });
  txt.setDepth(FX_DEPTH + 2).setScale(0.4);
  scene.tweens.add({ targets: txt, scale: 1.15, duration: 140, ease: 'Back.easeOut' });
  scene.tweens.add({
    targets: txt,
    y: y - 46,
    alpha: 0,
    delay: 260,
    duration: 650,
    ease: 'Cubic.easeOut',
    onComplete: () => txt.destroy()
  });
}
