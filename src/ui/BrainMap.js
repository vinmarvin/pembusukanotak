// src/ui/BrainMap.js
// Stage Select background: a side-view brain drawn with Graphics in a fixed design space and
// scaled to fit the map panel. Uncleared areas are covered in brainrot; cleared areas glow healthy.
import Phaser from 'phaser';
import { BRAIN_MAP } from '../config/brainmap.config.js';
import { RNG } from '../core/rng.js';

const C = BRAIN_MAP.colors;
const A = BRAIN_MAP.alpha;

// Smooth closed curve through every point (uniform Catmull-Rom, wraps around).
function closedCatmullRom(points, samplesPerSeg) {
  const n = points.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    for (let s = 0; s < samplesPerSeg; s++) {
      const t = s / samplesPerSeg;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  return out;
}

export class BrainMap extends Phaser.GameObjects.Container {
  constructor(scene) {
    super(scene, 0, 0);
    this.gfx = scene.add.graphics();
    this.gfx.setPosition(-BRAIN_MAP.designW / 2, -BRAIN_MAP.designH / 2);
    this.add(this.gfx);
    this.brainScale = 1;
    this.clearedCount = -1;

    this.outline = this.buildOutline();
    this.cerebrumPoly = new Phaser.Geom.Polygon(this.outline);
    this.insetPoly = this.scalePolygon(this.outline, BRAIN_MAP.gyri.inset);
    scene.add.existing(this);
  }

  // Smooth closed outline through the control points, with a scalloped (folded) edge.
  buildOutline() {
    const loop = closedCatmullRom(BRAIN_MAP.cerebrum, Math.ceil(BRAIN_MAP.outlineSamples / BRAIN_MAP.cerebrum.length));
    const centre = this.centroid(loop);
    return loop.map((p, i) => {
      const t = i / loop.length;
      const bump = Math.abs(Math.sin(t * BRAIN_MAP.bumps * Math.PI)) * BRAIN_MAP.bumpAmp;
      const dx = p.x - centre.x;
      const dy = p.y - centre.y;
      const len = Math.hypot(dx, dy) || 1;
      return { x: p.x + (dx / len) * bump, y: p.y + (dy / len) * bump };
    });
  }

  centroid(points) {
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / points.length, y: sum.y / points.length };
  }

  scalePolygon(points, k) {
    const c = this.centroid(points);
    return new Phaser.Geom.Polygon(points.map((p) => ({ x: c.x + (p.x - c.x) * k, y: c.y + (p.y - c.y) * k })));
  }

  inside(x, y, poly = this.cerebrumPoly) {
    return Phaser.Geom.Polygon.Contains(poly, x, y);
  }

  // Circle fully inside the cerebrum (checks 8 points on its edge)
  circleInside(x, y, r) {
    if (!this.inside(x, y)) return false;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      if (!this.inside(x + Math.cos(a) * r, y + Math.sin(a) * r)) return false;
    }
    return true;
  }

  // Fit into a w x h panel. Returns the scale used.
  fit(w, h) {
    this.brainScale = Math.min((w * BRAIN_MAP.fill) / BRAIN_MAP.designW, (h * BRAIN_MAP.fill) / BRAIN_MAP.designH);
    this.setScale(this.brainScale);
    return this.brainScale;
  }

  // Design-space point -> coordinates in this map's parent container
  toParent(p) {
    return {
      x: this.x + (p.x - BRAIN_MAP.designW / 2) * this.brainScale,
      y: this.y + (p.y - BRAIN_MAP.designH / 2) * this.brainScale
    };
  }

  nodePositions() {
    return BRAIN_MAP.nodes.map((p) => this.toParent(p));
  }

  nodeScale() {
    const s = BRAIN_MAP.nodeScale;
    return Math.min(s.max, Math.max(s.min, this.brainScale * s.perBrainScale));
  }

  // Redraw for a progress value (number of cleared areas). Cheap to call repeatedly.
  draw(clearedCount) {
    if (clearedCount === this.clearedCount) return;
    this.clearedCount = clearedCount;
    const g = this.gfx;
    const rng = new RNG(BRAIN_MAP.seed);
    g.clear();

    this.drawStem(g);
    this.drawCerebellum(g);

    // Cerebrum body with a soft upper highlight
    g.fillStyle(C.brain, 1);
    g.fillPoints(this.outline, true);
    g.fillStyle(C.brainHighlight, 0.18);
    g.fillPoints(this.scalePolygon(this.outline, 0.82).points.map((p) => ({ x: p.x, y: p.y - 26 })), true);

    this.drawGyri(g, rng);
    this.drawFissures(g);

    BRAIN_MAP.nodes.forEach((node, i) => {
      if (i < clearedCount) this.drawHealed(g, node);
      else this.drawRot(g, node, rng);
    });

    g.lineStyle(BRAIN_MAP.outlineWidth, C.outline, 1);
    g.strokePoints(this.outline, true, true);
  }

  drawStem(g) {
    g.fillStyle(C.stem, 1);
    g.fillPoints(BRAIN_MAP.stem, true);
    g.lineStyle(BRAIN_MAP.outlineWidth, C.outline, 1);
    g.strokePoints(BRAIN_MAP.stem, true, true);
  }

  drawCerebellum(g) {
    const cb = BRAIN_MAP.cerebellum;
    g.fillStyle(C.cerebellum, 1);
    g.fillEllipse(cb.x, cb.y, cb.rx * 2, cb.ry * 2);
    // Folia: thin curved stripes across the cerebellum
    g.lineStyle(BRAIN_MAP.grooveWidth * 0.7, C.groove, 0.9);
    for (let i = 1; i <= cb.folia; i++) {
      const fy = cb.y - cb.ry + (i * 2 * cb.ry) / (cb.folia + 1);
      const half = cb.rx * Math.sqrt(Math.max(0, 1 - ((fy - cb.y) / cb.ry) ** 2)) * 0.88;
      const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(cb.x - half, fy),
        new Phaser.Math.Vector2(cb.x, fy + 12),
        new Phaser.Math.Vector2(cb.x + half, fy)
      );
      g.strokePoints(curve.getPoints(16));
    }
    g.lineStyle(BRAIN_MAP.outlineWidth, C.outline, 1);
    g.strokeEllipse(cb.x, cb.y, cb.rx * 2, cb.ry * 2);
  }

  // Meandering grooves made of short random walks, cut where they leave the inset outline.
  drawGyri(g, rng) {
    const cfg = BRAIN_MAP.gyri;
    const bounds = Phaser.Geom.Polygon.GetAABB(this.insetPoly);
    for (let i = 0; i < cfg.count; i++) {
      let x = bounds.x + rng.cosmetic() * bounds.width;
      let y = bounds.y + rng.cosmetic() * bounds.height;
      if (!this.inside(x, y, this.insetPoly)) continue;
      let angle = rng.cosmetic() * Math.PI * 2;
      const pts = [{ x, y }];
      for (let s = 0; s < cfg.segments; s++) {
        angle += (rng.cosmetic() - 0.5) * cfg.turn * 2;
        const nx = x + Math.cos(angle) * cfg.segmentLen;
        const ny = y + Math.sin(angle) * cfg.segmentLen;
        if (!this.inside(nx, ny, this.insetPoly)) break;
        x = nx;
        y = ny;
        pts.push({ x, y });
      }
      if (pts.length < 3) continue;
      const smooth = new Phaser.Curves.Spline(pts.map((p) => new Phaser.Math.Vector2(p.x, p.y))).getPoints(pts.length * 4);
      g.lineStyle(BRAIN_MAP.grooveWidth, C.groove, 0.85);
      g.strokePoints(smooth);
      g.lineStyle(BRAIN_MAP.grooveWidth * 0.4, C.brainHighlight, 0.35);
      g.strokePoints(smooth.map((p) => ({ x: p.x - 3, y: p.y - 3 })));
    }
  }

  drawFissures(g) {
    BRAIN_MAP.fissures.forEach((line) => {
      const pts = new Phaser.Curves.Spline(line.map((p) => new Phaser.Math.Vector2(p.x, p.y))).getPoints(40);
      g.lineStyle(BRAIN_MAP.grooveWidth * 1.6, C.groove, 1);
      g.strokePoints(pts);
    });
  }

  drawHealed(g, node) {
    const r = BRAIN_MAP.rot.radius * 0.8;
    for (let k = 3; k >= 1; k--) {
      const rr = (r * k) / 3;
      if (!this.circleInside(node.x, node.y, rr)) continue;
      g.fillStyle(C.healedGlow, A.healedGlow / k);
      g.fillCircle(node.x, node.y, rr);
    }
  }

  drawRot(g, node, rng) {
    const cfg = BRAIN_MAP.rot;
    const blobs = [];
    for (let i = 0; i < cfg.blobs; i++) {
      const a = rng.cosmetic() * Math.PI * 2;
      const d = rng.cosmetic() * cfg.radius;
      let r = cfg.blobMin + rng.cosmetic() * (cfg.blobMax - cfg.blobMin);
      const x = node.x + Math.cos(a) * d;
      const y = node.y + Math.sin(a) * d;
      // Shrink until the blob stays on the brain, or drop it
      let tries = 3;
      while (tries > 0 && !this.circleInside(x, y, r * 1.25)) {
        r *= 0.7;
        tries--;
      }
      if (tries > 0) blobs.push({ x, y, r });
    }
    blobs.forEach((b) => {
      g.fillStyle(C.rotBruise, A.rotBruise);
      g.fillCircle(b.x + b.r * 0.2, b.y + b.r * 0.25, b.r * 1.25);
    });
    blobs.forEach((b) => {
      g.fillStyle(C.rotSlime, A.rotSlime);
      g.fillCircle(b.x, b.y, b.r);
    });
    for (let i = 0; i < cfg.bubbles && blobs.length; i++) {
      const b = blobs[i % blobs.length];
      const br = 4 + rng.cosmetic() * 7;
      const bx = b.x + (rng.cosmetic() - 0.5) * b.r;
      const by = b.y + (rng.cosmetic() - 0.5) * b.r;
      if (!this.circleInside(bx, by, br)) continue;
      g.fillStyle(C.rotBubble, A.rotBubble);
      g.fillCircle(bx, by, br);
      g.fillStyle(0xFFFFFF, 0.6);
      g.fillCircle(bx - br * 0.35, by - br * 0.35, br * 0.3);
    }
  }
}
