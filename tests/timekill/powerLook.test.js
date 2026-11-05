// tests/timekill/powerLook.test.js
// Power candies must look different from plain candies (owner playtest): freeze blue, bomb red,
// x5 badge in front, line stripes in the clearing direction.
import { describe, it, expect } from 'vitest';
import { decoratePowerCandy, reapplyPowerTint } from '../../src/ui/PowerCandyLook.js';
import { POWER_CANDY_LOOK } from '../../src/config/effects.config.js';

// Minimal stand-ins for the Phaser objects the look uses.
function fakeGraphics() {
  const calls = [];
  const g = { calls, alpha: 1 };
  for (const fn of ['clear', 'fillStyle', 'fillRoundedRect', 'lineStyle', 'strokeRoundedRect']) {
    g[fn] = (...args) => {
      calls.push([fn, ...args]);
      return g;
    };
  }
  return g;
}
function fakeContainer() {
  const c = { children: [], handlers: {} };
  c.add = (items) => {
    c.children.push(...[].concat(items));
    return c;
  };
  c.setAngle = (a) => ((c.angle = a), c);
  c.setPosition = (x, y) => ((c.x = x), (c.y = y), c);
  c.once = (ev, fn) => ((c.handlers[ev] = fn), c);
  return c;
}
function fakeScene() {
  const tweens = [];
  return {
    tweens: { add: (cfg) => (tweens.push(cfg), { remove() {} }), list: tweens },
    add: {
      container: () => fakeContainer(),
      graphics: () => fakeGraphics(),
      text: (x, y, text) => {
        const t = { text };
        t.setOrigin = () => t;
        t.setFontSize = (s) => ((t.fontSize = s), t);
        return t;
      }
    }
  };
}
function fakeSprite() {
  const s = { tint: null, handlers: {} };
  s.setTint = (t) => ((s.tint = t), s);
  s.clearTint = () => ((s.tint = null), s);
  s.once = (ev, fn) => ((s.handlers[ev] = fn), s);
  return s;
}

describe('Power candy look', () => {
  it('tints freeze candies blue and bomb candies red, with no front marker', () => {
    for (const power of ['freeze', 'bomb']) {
      const sprite = fakeSprite();
      const marker = decoratePowerCandy(fakeScene(), sprite, power, null, 64);
      expect(marker).toBeNull();
      expect(sprite.tint).toBe(POWER_CANDY_LOOK[power].tint);
    }
    const freeze = POWER_CANDY_LOOK.freeze.tint;
    const bomb = POWER_CANDY_LOOK.bomb.tint;
    expect(freeze & 0xff).toBeGreaterThan((freeze >> 16) & 0xff); // more blue than red
    expect((bomb >> 16) & 0xff).toBeGreaterThan(bomb & 0xff); // more red than blue
  });

  it('puts an "x5" badge in front of x5 candies, sized to the cell', () => {
    const sprite = fakeSprite();
    const marker = decoratePowerCandy(fakeScene(), sprite, 'x5', null, 80);
    expect(marker).not.toBeNull();
    expect(sprite.powerMarker).toBe(marker);
    const holder = marker.children[0];
    const text = holder.children.find((c) => c.text !== undefined);
    expect(text.text).toBe('x5');
    expect(text.fontSize).toBe(Math.round(80 * POWER_CANDY_LOOK.x5.badge.fontSize));
    marker.redraw(40);
    expect(text.fontSize).toBe(Math.max(9, Math.round(40 * POWER_CANDY_LOOK.x5.badge.fontSize)));
  });

  it('draws line stripes along the clearing direction', () => {
    const size = (orientation) => {
      const marker = decoratePowerCandy(fakeScene(), fakeSprite(), 'line', orientation, 100);
      const g = marker.children[0];
      const rects = g.calls.filter((c) => c[0] === 'fillRoundedRect');
      expect(rects.length).toBe(6); // 2 stripes x (outline, colour, core)
      const [, , , w, h] = rects[1]; // colour layer of the first stripe
      return { w, h };
    };
    const h = size('h');
    const v = size('v');
    expect(h.w).toBeGreaterThan(h.h); // horizontal stripes are wide
    expect(v.h).toBeGreaterThan(v.w); // vertical stripes are tall
  });

  it('restores the power tint after another tint is cleared', () => {
    const sprite = fakeSprite();
    decoratePowerCandy(fakeScene(), sprite, 'bomb', null, 64);
    sprite.clearTint();
    reapplyPowerTint(sprite);
    expect(sprite.tint).toBe(POWER_CANDY_LOOK.bomb.tint);
  });
});
