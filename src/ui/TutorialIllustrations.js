// src/ui/TutorialIllustrations.js
// Animated, looping illustrations for the 3 tutorial steps. Shared by TutorialScene and TutorialPopup.
// Step 1: a mini board where a swap forms a 3-match that pops.
// Step 2: matched candies burst into energy orbs that Nirodha fires at the enemy (HP bar drops, damage number).
// Step 3: boss with the countdown pill.
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';
import { GAMEPLAY } from '../config/gameplay.config.js';
import { AssetResolver } from '../systems/AssetResolver.js';
import { InkText } from './InkText.js';
import { prefersReducedMotion } from '../core/reducedMotion.js';
import { t } from '../i18n/index.js';

// Mini board for step 1 (candy type indices). Swapping (0,2) with (1,2) makes row 1 a 3-match.
// No 3-match exists before the swap.
const DEMO_BOARD = [
  [2, 3, 0, 4],
  [0, 0, 1, 3],
  [4, 1, 2, 5]
];
const SWAP_A = { r: 0, c: 2 };
const SWAP_B = { r: 1, c: 2 };
const MATCH_CELLS = [{ r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }];

// Scale a sprite so its longer side equals maxSide, keeping its aspect ratio.
function fitSprite(spr, maxSide) {
  const w = spr.width || 1;
  const h = spr.height || 1;
  const s = maxSide / Math.max(w, h);
  spr.setScale(s);
  return s;
}

export class TutorialIllustration {
  /**
   * @param {Phaser.Scene} scene
   * @param {Phaser.GameObjects.Container} container  illustration container (cleared by caller)
   * @param {number} step  0, 1, or 2
   * @param {{ pw: number, ph: number }} size  dialog size, used to scale the art
   */
  constructor(scene, container, step, size) {
    this.scene = scene;
    this.container = container;
    this.size = size;
    this.objects = [];
    this.timers = [];
    this.tweens = [];
    this.reduced = prefersReducedMotion();
    this.destroyed = false;

    if (step === 0) this.buildMatch();
    else if (step === 1) this.buildAttack();
    else this.buildCountdown();
  }

  // ---------- helpers ----------
  track(obj) {
    this.objects.push(obj);
    this.container.add(obj);
    return obj;
  }

  tween(cfg) {
    if (this.destroyed) return null;
    const tw = this.scene.tweens.add(cfg);
    this.tweens.push(tw);
    return tw;
  }

  after(ms, fn) {
    if (this.destroyed) return;
    const ev = this.scene.time.delayedCall(ms, () => {
      this.timers = this.timers.filter((e) => e !== ev);
      if (!this.destroyed) fn();
    });
    this.timers.push(ev);
  }

  // Area available for the art (between the step dots and the title).
  artHeight() {
    return Math.max(110, Math.min(180, this.size.ph * 0.38));
  }

  burst(x, y, color, count = 6, dist = 26) {
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const dot = this.track(this.scene.add.circle(x, y, 3 + Math.random() * 2, color, 1));
      this.tween({
        targets: dot,
        x: x + Math.cos(a) * dist,
        y: y + Math.sin(a) * dist,
        alpha: 0,
        scale: 0.3,
        duration: 380,
        ease: 'Cubic.easeOut',
        onComplete: () => this.removeObj(dot)
      });
    }
  }

  pruneTweens() {
    this.tweens = this.tweens.filter((tw) => tw && !tw.isDestroyed());
  }

  removeObj(obj) {
    const i = this.objects.indexOf(obj);
    if (i >= 0) this.objects.splice(i, 1);
    if (obj && obj.scene) obj.destroy();
  }

  // ---------- step 1: swap to match ----------
  buildMatch() {
    const { scene } = this;
    const rows = DEMO_BOARD.length;
    const cols = DEMO_BOARD[0].length;
    const cell = Math.floor(Math.min(this.artHeight() / rows, (this.size.pw * 0.6) / cols, 48));
    const bw = cell * cols;
    const bh = cell * rows;
    const ox = -bw / 2 + cell / 2;
    const oy = -bh / 2 + cell / 2;
    const pos = (r, c) => ({ x: ox + c * cell, y: oy + r * cell });

    // Board tray, same look as the battle tray
    const tray = this.track(scene.add.graphics());
    tray.fillStyle(THEME.colors.hardShadow, 1);
    tray.fillRoundedRect(-bw / 2 - 6 + 4, -bh / 2 - 6 + 4, bw + 12, bh + 12, 12);
    tray.fillStyle(THEME.colors.playfieldTray, 1);
    tray.fillRoundedRect(-bw / 2 - 6, -bh / 2 - 6, bw + 12, bh + 12, 12);
    tray.lineStyle(3, THEME.colors.ink, 1);
    tray.strokeRoundedRect(-bw / 2 - 6, -bh / 2 - 6, bw + 12, bh + 12, 12);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const p = pos(r, c);
        tray.fillStyle(THEME.colors.brainSurface, (r + c) % 2 === 0 ? 0.9 : 0.55);
        tray.fillRoundedRect(p.x - cell / 2 + 2, p.y - cell / 2 + 2, cell - 4, cell - 4, 6);
      }
    }

    // Row highlight for the match (shown after the swap)
    const hl = this.track(scene.add.graphics());
    const hp = pos(MATCH_CELLS[0].r, MATCH_CELLS[0].c);
    hl.lineStyle(3, THEME.colors.arcadeYellow, 1);
    hl.strokeRoundedRect(hp.x - cell / 2, hp.y - cell / 2, cell * MATCH_CELLS.length, cell, 8);
    hl.fillStyle(THEME.colors.arcadeYellow, 0.18);
    hl.fillRoundedRect(hp.x - cell / 2, hp.y - cell / 2, cell * MATCH_CELLS.length, cell, 8);

    // Candies
    const candySize = cell * 0.8;
    this.grid = [];
    for (let r = 0; r < rows; r++) {
      this.grid.push([]);
      for (let c = 0; c < cols; c++) {
        const p = pos(r, c);
        const spr = this.track(scene.add.image(p.x, p.y, AssetResolver.getCandyKey(scene, DEMO_BOARD[r][c])));
        spr.baseScale = fitSprite(spr, candySize);
        this.grid[r].push(spr);
      }
    }

    // Pointer hand
    const hand = this.track(scene.add.text(0, 0, '👆', { fontSize: `${Math.round(cell * 0.62)}px` }).setOrigin(0.3, 0.1));

    const a = this.grid[SWAP_A.r][SWAP_A.c];
    const b = this.grid[SWAP_B.r][SWAP_B.c];
    const pa = pos(SWAP_A.r, SWAP_A.c);
    const pb = pos(SWAP_B.r, SWAP_B.c);
    // After the swap, candy `a` sits in the match row.
    const matched = [this.grid[1][0], this.grid[1][1], a];

    if (this.reduced) {
      // Static frame: highlight the candy to move and show the swap direction.
      hl.setAlpha(0);
      const sel = this.track(scene.add.graphics());
      sel.lineStyle(3, THEME.colors.electricCyan, 1);
      sel.strokeRoundedRect(pa.x - cell / 2 + 1, pa.y - cell / 2 + 1, cell - 2, cell * 2 - 2, 8);
      hand.setPosition(pa.x + cell * 0.1, pa.y + cell * 0.15);
      return;
    }

    const loop = () => {
      this.pruneTweens();
      // Reset
      a.setPosition(pa.x, pa.y);
      b.setPosition(pb.x, pb.y);
      this.grid.forEach((row) => row.forEach((s) => s.setAlpha(1).setScale(s.baseScale)));
      hl.setAlpha(0);
      hand.setPosition(pa.x + cell * 0.1, pa.y + cell * 0.15).setAlpha(0).setScale(1);

      // Hand appears and presses the top candy
      this.tween({ targets: hand, alpha: 1, duration: 250, delay: 250 });
      this.tween({ targets: hand, scale: 0.85, duration: 120, delay: 550, yoyo: true });
      this.tween({ targets: a, scale: a.baseScale * 1.15, duration: 120, delay: 550, yoyo: true });

      // Drag down: swap the two candies
      this.after(850, () => {
        this.tween({ targets: hand, y: pb.y + cell * 0.15, duration: 320, ease: 'Sine.easeInOut' });
        this.tween({ targets: a, y: pb.y, duration: 320, ease: 'Back.easeOut' });
        this.tween({ targets: b, y: pa.y, duration: 320, ease: 'Back.easeOut' });
      });

      // Match found: highlight and pulse
      this.after(1250, () => {
        this.tween({ targets: hand, alpha: 0, duration: 200 });
        this.tween({ targets: hl, alpha: 1, duration: 150 });
        matched.forEach((s) => this.tween({ targets: s, scale: s.baseScale * 1.2, duration: 160, yoyo: true, repeat: 1 }));
      });

      // Pop
      this.after(1950, () => {
        matched.forEach((s) => {
          this.burst(s.x, s.y, THEME.colors.arcadeYellow);
          this.tween({ targets: s, scale: s.baseScale * 1.6, alpha: 0, duration: 220, ease: 'Cubic.easeOut' });
        });
        this.tween({ targets: hl, alpha: 0, duration: 300, delay: 150 });
      });

      this.after(3100, loop);
    };
    loop();
  }

  // ---------- step 2: player attacks enemy ----------
  buildAttack() {
    const { scene } = this;
    const artH = this.artHeight();
    const half = Math.min(this.size.pw * 0.32, 150);
    const charSize = Math.min(artH * 0.55, 92);
    const charY = -artH * 0.12;

    // Damage from the real rules: Stage 1 attack x 3 candies, against a Stage 1 small minion.
    const candiesInMatch = GAMEPLAY.balanceSim.candiesPerMatch;
    const damage = GAMEPLAY.player.baseAttack * candiesInMatch;
    const enemyHp = GAMEPLAY.enemies.small.hp;

    // Player (left)
    const player = this.track(scene.add.image(-half, charY, AssetResolver.getTextureKey(scene, 'player')));
    fitSprite(player, charSize);
    const nameTag = this.track(new InkText(scene, -half, charY + charSize / 2 + 10, t('battle.playerName'), {
      fontSize: '13px',
      color: THEME.colors.slimeGreenHex,
      isHud: true,
      strokeThickness: 3
    }));
    nameTag.setOrigin(0.5);

    // Enemy (right) with HP bar
    const enemy = this.track(scene.add.image(half, charY, AssetResolver.getMinionKey(scene, 'small')));
    const enemyScale = fitSprite(enemy, charSize);
    const barW = Math.min(90, half * 0.9);
    const barH = 10;
    const barY = charY - charSize / 2 - 14;
    const barBg = this.track(scene.add.graphics());
    barBg.fillStyle(THEME.colors.ink, 1);
    barBg.fillRoundedRect(half - barW / 2 - 2, barY - barH / 2 - 2, barW + 4, barH + 4, 5);
    const barFill = this.track(scene.add.rectangle(half - barW / 2, barY, barW, barH, THEME.colors.punchMagenta).setOrigin(0, 0.5));

    // Matched candies row under the player, the source of the attack
    const candySize = Math.min(artH * 0.2, 34);
    const rowY = charY + charSize / 2 + candySize * 0.5 + 24;
    const candyTex = AssetResolver.getCandyKey(scene, 1);
    const candies = [];
    for (let i = 0; i < candiesInMatch; i++) {
      const spr = this.track(scene.add.image(-half + (i - (candiesInMatch - 1) / 2) * (candySize + 4), rowY, candyTex));
      spr.baseScale = fitSprite(spr, candySize);
      candies.push(spr);
    }

    const dmgText = this.track(new InkText(scene, half, charY - charSize / 2, `-${damage}`, {
      fontSize: '24px',
      color: THEME.colors.slimeGreenHex,
      isTitle: true
    }));
    dmgText.setOrigin(0.5);

    const hpAfter = Math.max(0, (enemyHp - damage) / enemyHp);

    if (this.reduced) {
      barFill.width = barW * hpAfter;
      dmgText.setPosition(half + charSize * 0.45, charY - charSize * 0.2);
      const arrow = this.track(scene.add.graphics());
      arrow.lineStyle(4, THEME.colors.arcadeYellow, 1);
      arrow.lineBetween(-half + charSize * 0.55, charY, half - charSize * 0.55, charY);
      arrow.fillStyle(THEME.colors.arcadeYellow, 1);
      const tipX = half - charSize * 0.55;
      arrow.fillTriangle(tipX + 4, charY, tipX - 10, charY - 8, tipX - 10, charY + 8);
      return;
    }

    const loop = () => {
      this.pruneTweens();
      // Reset
      barFill.width = barW;
      enemy.setPosition(half, charY).clearTint().setScale(enemyScale);
      player.setPosition(-half, charY);
      dmgText.setAlpha(0).setPosition(half, charY - charSize * 0.2);
      candies.forEach((s) => s.setAlpha(1).setScale(s.baseScale));

      // Candies glow as a matched set
      candies.forEach((s, i) => this.tween({ targets: s, scale: s.baseScale * 1.25, duration: 150, delay: 300 + i * 60, yoyo: true }));

      // Player winds up and lunges toward the enemy as the candies burst into orbs
      this.after(750, () => {
        this.tween({ targets: player, x: -half + 16, duration: 140, yoyo: true, ease: 'Quad.easeOut' });

        candies.forEach((s, i) => {
          this.burst(s.x, s.y, THEME.colors.arcadeYellow, 5, 18);
          this.tween({ targets: s, alpha: 0, scale: s.baseScale * 1.5, duration: 180 });
          this.fireOrb(s.x, s.y, half, charY, i * 90, () => this.onHit(enemy, enemyScale, half, charY));
        });
      });

      // After the hits: damage number and HP drop
      this.after(750 + 90 * (candiesInMatch - 1) + 480, () => {
        dmgText.setAlpha(1);
        this.tween({ targets: dmgText, y: charY - charSize * 0.75, alpha: { from: 1, to: 0 }, duration: 1000, ease: 'Cubic.easeOut' });
        this.tween({ targets: barFill, width: barW * hpAfter, duration: 400, ease: 'Cubic.easeOut' });
      });

      // Refill: new candies drop back in, like the board refill in battle
      this.after(2000, () => {
        candies.forEach((s, i) => {
          s.setAlpha(1).setScale(s.baseScale).setY(rowY - 24);
          this.tween({ targets: s, y: rowY, alpha: { from: 0, to: 1 }, duration: 260, delay: i * 60, ease: 'Bounce.easeOut' });
        });
      });

      this.after(3300, loop);
    };
    loop();
  }

  fireOrb(x0, y0, x1, y1, delay, onHit) {
    const { scene } = this;
    this.after(delay, () => {
      const glow = this.track(scene.add.circle(x0, y0, 10, THEME.colors.arcadeYellow, 0.35));
      const core = this.track(scene.add.circle(x0, y0, 5, THEME.colors.white, 1));
      const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(x0, y0),
        new Phaser.Math.Vector2((x0 + x1) / 2, Math.min(y0, y1) - 60),
        new Phaser.Math.Vector2(x1, y1)
      );
      const pt = new Phaser.Math.Vector2();
      const state = { t: 0 };
      this.tween({
        targets: state,
        t: 1,
        duration: 420,
        ease: 'Sine.easeIn',
        onUpdate: () => {
          curve.getPoint(state.t, pt);
          glow.setPosition(pt.x, pt.y);
          core.setPosition(pt.x, pt.y);
          // Fading trail
          if (Math.random() < 0.6) {
            const tr = this.track(scene.add.circle(pt.x, pt.y, 4, THEME.colors.arcadeYellow, 0.7));
            this.tween({ targets: tr, alpha: 0, scale: 0.2, duration: 220, onComplete: () => this.removeObj(tr) });
          }
        },
        onComplete: () => {
          this.removeObj(glow);
          this.removeObj(core);
          onHit();
        }
      });
    });
  }

  onHit(enemy, enemyScale, x, y) {
    this.burst(x, y, THEME.colors.punchMagenta, 7, 30);
    enemy.setTintFill(THEME.colors.white);
    this.after(70, () => enemy.setTint(0xff6680));
    this.after(180, () => enemy.clearTint());
    this.tween({ targets: enemy, x: x + 8, duration: 50, yoyo: true, repeat: 1 });
    this.tween({ targets: enemy, scaleX: enemyScale * 0.9, duration: 60, yoyo: true });
  }

  // ---------- step 3: enemy countdown ----------
  buildCountdown() {
    const { scene } = this;
    const artH = this.artHeight();
    const bossSize = Math.min(artH * 0.55, 90);
    const boss = this.track(scene.add.image(0, -artH * 0.12, AssetResolver.getBossKey(scene, 'b1')));
    fitSprite(boss, bossSize);

    const pillY = -artH * 0.12 + bossSize / 2 + 22;
    const warnBg = this.track(scene.add.graphics());
    warnBg.fillStyle(THEME.colors.punchMagenta, 1);
    warnBg.fillRoundedRect(-90, pillY - 12, 180, 24, 6);
    warnBg.lineStyle(2, THEME.colors.ink, 1);
    warnBg.strokeRoundedRect(-90, pillY - 12, 180, 24, 6);

    const warnText = this.track(scene.add.text(0, pillY, '⏱️ ATTACK: 03.0s', {
      fontFamily: THEME.fonts.hud,
      fontSize: '12px',
      color: '#FFFFFF'
    }).setOrigin(0.5));

    if (!this.reduced) {
      this.tween({ targets: [warnBg, warnText], alpha: 0.55, duration: 400, yoyo: true, repeat: -1 });
    }
  }

  destroy() {
    this.destroyed = true;
    this.timers.forEach((ev) => ev.remove(false));
    this.timers = [];
    this.tweens.forEach((tw) => {
      if (tw && !tw.isDestroyed()) tw.stop();
    });
    this.tweens = [];
    this.objects = [];
  }
}
