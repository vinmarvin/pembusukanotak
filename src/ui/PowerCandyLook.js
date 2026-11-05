// src/ui/PowerCandyLook.js
// Gives a Time Kill power candy its own look (POWER_CANDY_LOOK in effects.config.js):
// freeze = blue tint + icy glow, bomb = red tint + pulsing glow, x5 = badge in front,
// line = two neon stripes across the candy in the direction it clears.
import { THEME } from '../config/theme.config.js';
import { POWER_CANDY_LOOK } from '../config/effects.config.js';
import { prefersReducedMotion } from '../core/reducedMotion.js';

// Tint, glow and (when the power has one) a front marker. Returns the marker container or null.
// The caller adds the marker above the sprite and keeps it on the sprite's position.
export function decoratePowerCandy(scene, sprite, power, orientation, cellSize) {
  const look = POWER_CANDY_LOOK[power];
  if (!look) return null;
  const calm = prefersReducedMotion();

  sprite.powerLook = { power, tint: look.tint };
  if (look.tint !== 0xffffff) sprite.setTint(look.tint);

  // Glow (WebGL only; Canvas just keeps the tint and marker).
  if (look.glow && sprite.preFX) {
    sprite.preFX.padding = POWER_CANDY_LOOK.glowPadding;
    const glow = sprite.preFX.addGlow(look.glow.color, look.glow.strength, 0, false, 0.1, 12);
    if (!calm) {
      const tween = scene.tweens.add({
        targets: glow,
        outerStrength: look.glow.pulseTo,
        duration: look.glow.pulseMs,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      sprite.once('destroy', () => tween.remove());
    }
  }

  let marker = null;
  if (look.badge) marker = buildBadge(scene, look.badge, calm);
  else if (look.stripes) marker = buildStripes(scene, look.stripes, orientation === 'v', calm);
  if (marker) {
    marker.redraw(cellSize || 64);
    sprite.powerMarker = marker;
  }
  return marker;
}

// Re-apply only the tint (e.g. after a boss freeze tint is cleared).
export function reapplyPowerTint(sprite) {
  if (sprite?.powerLook && sprite.powerLook.tint !== 0xffffff) sprite.setTint(sprite.powerLook.tint);
}

function buildBadge(scene, cfg, calm) {
  const marker = scene.add.container(0, 0);
  const holder = scene.add.container(0, 0); // bobs and tilts; marker itself follows the candy
  const g = scene.add.graphics();
  const txt = scene.add.text(0, 0, cfg.text, {
    fontFamily: THEME.fonts.title,
    color: cfg.textColor
  }).setOrigin(0.5, 0.52);
  holder.add([g, txt]);
  holder.setAngle(cfg.angle);
  marker.add(holder);

  marker.redraw = (cell) => {
    const w = cell * cfg.width;
    const h = cell * cfg.height;
    const r = h / 2;
    const shadow = Math.max(2, cell * 0.04);
    const line = Math.max(1.5, cell * 0.03);
    holder.setPosition(cell * cfg.offsetX, cell * cfg.offsetY);
    g.clear();
    g.fillStyle(cfg.shadow, 1);
    g.fillRoundedRect(-w / 2, -h / 2 + shadow, w, h, r);
    g.fillStyle(cfg.fill, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    g.lineStyle(line, cfg.outline, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    // White shine along the top edge.
    g.fillStyle(0xffffff, 0.45);
    g.fillRoundedRect(-w / 2 + r * 0.6, -h / 2 + line, w - r * 1.2, h * 0.22, h * 0.11);
    txt.setFontSize(Math.max(9, Math.round(cell * cfg.fontSize)));
  };

  if (!calm) {
    const tween = scene.tweens.add({
      targets: holder,
      scaleX: cfg.bobScale,
      scaleY: cfg.bobScale,
      duration: cfg.bobMs,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    marker.once('destroy', () => tween.remove());
  }
  return marker;
}

function buildStripes(scene, cfg, vertical, calm) {
  const marker = scene.add.container(0, 0);
  const g = scene.add.graphics();
  marker.add(g);

  marker.redraw = (cell) => {
    const len = cell * cfg.length;
    const th = Math.max(3, cell * cfg.thickness);
    const gap = cell * cfg.gap;
    const outline = Math.max(1.5, th * 0.35);
    g.clear();
    for (const off of [-gap / 2, gap / 2]) {
      // Rectangle for one stripe, drawn along x then rotated by swapping axes when vertical.
      const rect = (l, t, pad) => {
        const L = l + pad * 2;
        const T = t + pad * 2;
        return vertical
          ? [off - T / 2, -L / 2, T, L]
          : [-L / 2, off - T / 2, L, T];
      };
      const [ox, oy, ow, oh] = rect(len, th, outline);
      g.fillStyle(cfg.outline, 0.9);
      g.fillRoundedRect(ox, oy, ow, oh, Math.min(ow, oh) / 2);
      const [cx, cy, cw, ch] = rect(len, th, 0);
      g.fillStyle(cfg.color, 1);
      g.fillRoundedRect(cx, cy, cw, ch, Math.min(cw, ch) / 2);
      const [kx, ky, kw, kh] = rect(len * 0.86, th * 0.36, 0);
      g.fillStyle(cfg.core, 0.95);
      g.fillRoundedRect(kx, ky, kw, kh, Math.min(kw, kh) / 2);
    }
  };

  if (!calm) {
    const tween = scene.tweens.add({
      targets: g,
      alpha: cfg.shimmerMinAlpha,
      duration: cfg.shimmerMs,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    marker.once('destroy', () => tween.remove());
  }
  return marker;
}
