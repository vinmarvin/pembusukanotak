// src/ui/TutorialIllustrations.js
// Animated, looping illustrations for the tutorial steps (used by TutorialPopup).
// Story:     match (swap makes a 3-match), attack (orbs hit the enemy), countdown (boss + timer pill)
// Time Kill: matchScore (3-match pops "+points"), clock (timer drains, -penalty / +bonus),
//            power (power candy fires: line, bomb, freeze, x5), score (score climbs past the best)
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';
import { GAMEPLAY } from '../config/gameplay.config.js';
import { AssetResolver } from '../systems/AssetResolver.js';
import { InkText } from './InkText.js';
import { prefersReducedMotion } from '../core/reducedMotion.js';
import { t } from '../i18n/index.js';
import { tutorialParams } from '../config/tutorials.config.js';

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
   * @param {string} art  'match' | 'attack' | 'countdown' | 'matchScore' | 'clock' | 'power' | 'score'
   * @param {{ pw: number, ph: number, artH?: number }} size  dialog size and the height free for the art
   */
  constructor(scene, container, art, size) {
    this.scene = scene;
    this.container = container;
    this.size = size;
    this.objects = [];
    this.timers = [];
    this.tweens = [];
    this.reduced = prefersReducedMotion();
    this.destroyed = false;

    const builders = {
      match: () => this.buildMatch(false),
      matchScore: () => this.buildMatch(true),
      attack: () => this.buildAttack(),
      countdown: () => this.buildCountdown(),
      clock: () => this.buildClock(),
      power: () => this.buildPower(),
      score: () => this.buildScore()
    };
    (builders[art] || builders.match)();
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
    if (this.size.artH) return Math.max(80, Math.min(180, this.size.artH));
    return Math.max(90, Math.min(180, this.size.ph * 0.34));
  }

  floatText(x, y, text, color, size = 22) {
    const txt = this.track(new InkText(this.scene, x, y, text, { fontSize: `${size}px`, color, isTitle: true }));
    txt.setOrigin(0.5);
    if (this.reduced) return txt;
    txt.setScale(0.4);
    this.tween({ targets: txt, scale: 1, duration: 160, ease: 'Back.easeOut' });
    this.tween({ targets: txt, y: y - 30, alpha: 0, delay: 500, duration: 600, onComplete: () => this.removeObj(txt) });
    return txt;
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
  buildMatch(withScore = false) {
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
        if (withScore) {
          const mid = matched[1];
          this.floatText(mid.x, mid.y, `+${tutorialParams().points * matched.length}`, THEME.colors.arcadeYellowHex, 24);
        }
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
    const pillH = 24;
    const gap = 10;
    // Centre the boss + pill block in the art area
    const total = bossSize + gap + pillH;
    const bossY = -total / 2 + bossSize / 2;
    const pillY = total / 2 - pillH / 2;
    const boss = this.track(scene.add.image(0, bossY, AssetResolver.getBossKey(scene, 'b1')));
    fitSprite(boss, bossSize);

    const warnBg = this.track(scene.add.graphics());
    warnBg.fillStyle(THEME.colors.punchMagenta, 1);
    warnBg.fillRoundedRect(-90, pillY - pillH / 2, 180, pillH, 6);
    warnBg.lineStyle(2, THEME.colors.ink, 1);
    warnBg.strokeRoundedRect(-90, pillY - pillH / 2, 180, pillH, 6);

    const warnText = this.track(scene.add.text(0, pillY, '⏱️ ATTACK: 03.0s', {
      fontFamily: THEME.fonts.hud,
      fontSize: '12px',
      color: '#FFFFFF'
    }).setOrigin(0.5));

    if (!this.reduced) {
      this.tween({ targets: [warnBg, warnText], alpha: 0.55, duration: 400, yoyo: true, repeat: -1 });
    }
  }

  // ---------- Time Kill: the clock ----------
  // The 2:00 timer drains; a wrong swap knocks off the penalty, a chain reaction adds the bonus.
  buildClock() {
    const { scene } = this;
    const P = tutorialParams();
    const total = P.min * 60;
    const artH = this.artHeight();
    const barW = Math.min(this.size.pw * 0.7, 300);
    const barH = 28;
    const barY = -artH * 0.08;
    const fmt = (sec) => {
      const v = Math.max(0, Math.round(sec));
      return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
    };

    const icon = this.track(scene.add.text(0, barY - barH / 2 - 26, '⏱️', { fontSize: '30px' }).setOrigin(0.5));
    const tray = this.track(scene.add.graphics());
    tray.fillStyle(THEME.colors.hardShadow, 1);
    tray.fillRoundedRect(-barW / 2, barY - barH / 2 + 3, barW, barH, 10);
    tray.fillStyle(THEME.colors.playfieldTray, 1);
    tray.fillRoundedRect(-barW / 2, barY - barH / 2, barW, barH, 10);
    tray.lineStyle(3, THEME.colors.ink, 1);
    tray.strokeRoundedRect(-barW / 2, barY - barH / 2, barW, barH, 10);
    const fill = this.track(scene.add.rectangle(-barW / 2 + 3, barY, barW - 6, barH - 6, THEME.colors.arcadeYellow).setOrigin(0, 0.5));
    const label = this.track(new InkText(scene, 0, barY, fmt(total), { fontSize: '16px', color: '#FFFFFF', isHud: true, strokeThickness: 3 }));
    label.setOrigin(0.5);

    const state = { sec: total };
    const render = () => {
      fill.width = Math.max(0, (barW - 6) * (state.sec / total));
      label.setText(fmt(state.sec));
    };
    const minusTxt = t('tutorial.timeKill.minusSec', { sec: P.penalty });
    const plusTxt = t('tutorial.timeKill.plusSec', { sec: P.combo });
    const popY = barY + barH / 2 + 24;

    if (this.reduced) {
      state.sec = total * 0.75;
      render();
      this.track(new InkText(scene, -barW * 0.22, popY, minusTxt, { fontSize: '20px', color: THEME.colors.punchMagentaHex, isTitle: true })).setOrigin(0.5);
      this.track(new InkText(scene, barW * 0.22, popY, plusTxt, { fontSize: '20px', color: THEME.colors.slimeGreenHex, isTitle: true })).setOrigin(0.5);
      return;
    }

    const flash = (color) => {
      fill.setFillStyle(color);
      this.after(260, () => fill.setFillStyle(THEME.colors.arcadeYellow));
    };

    const loop = () => {
      this.pruneTweens();
      state.sec = total;
      render();
      // Time drains (sped up for the demo)
      this.tween({ targets: state, sec: total - 20, duration: 1100, onUpdate: render });
      // Wrong swap: penalty
      this.after(1150, () => {
        state.sec -= P.penalty;
        render();
        flash(THEME.colors.punchMagenta);
        this.floatText(-barW * 0.22, popY, minusTxt, THEME.colors.punchMagentaHex, 22);
        this.tween({ targets: [tray, fill, label], x: '+=5', duration: 45, yoyo: true, repeat: 2 });
        this.tween({ targets: state, sec: state.sec - 8, duration: 800, onUpdate: render });
      });
      // Chain reaction: bonus
      this.after(2100, () => {
        state.sec += P.combo;
        render();
        flash(THEME.colors.slimeGreen);
        this.floatText(barW * 0.22, popY, plusTxt, THEME.colors.slimeGreenHex, 22);
        this.tween({ targets: icon, scale: 1.25, duration: 120, yoyo: true });
        this.tween({ targets: state, sec: state.sec - 10, duration: 1100, onUpdate: render });
      });
      this.after(3500, loop);
    };
    loop();
  }

  // ---------- Time Kill: power-ups ----------
  // A power candy on a mini board is tapped twice and fires; each loop shows the next power.
  buildPower() {
    const { scene } = this;
    const P = tutorialParams();
    const rows = 3;
    const cols = 4;
    const board = [
      [1, 2, 4, 0],
      [3, 0, 5, 2],
      [4, 1, 3, 5]
    ];
    const cell = Math.floor(Math.min(this.artHeight() / rows, (this.size.pw * 0.6) / cols, 48));
    const bw = cell * cols;
    const bh = cell * rows;
    const pos = (r, c) => ({ x: -bw / 2 + cell / 2 + c * cell, y: -bh / 2 + cell / 2 + r * cell });

    const tray = this.track(scene.add.graphics());
    tray.fillStyle(THEME.colors.playfieldTray, 1);
    tray.fillRoundedRect(-bw / 2 - 6, -bh / 2 - 6, bw + 12, bh + 12, 12);
    tray.lineStyle(3, THEME.colors.ink, 1);
    tray.strokeRoundedRect(-bw / 2 - 6, -bh / 2 - 6, bw + 12, bh + 12, 12);

    const sprites = [];
    for (let r = 0; r < rows; r++) {
      sprites.push([]);
      for (let c = 0; c < cols; c++) {
        const p = pos(r, c);
        const spr = this.track(scene.add.image(p.x, p.y, AssetResolver.getCandyKey(scene, board[r][c])));
        spr.baseScale = fitSprite(spr, cell * 0.8);
        sprites[r].push(spr);
      }
    }

    const PR = 1;
    const PC = 1;
    const pp = pos(PR, PC);
    const kinds = [
      { id: 'line', badge: '↔', color: THEME.colors.electricCyan },
      { id: 'bomb', badge: '💣', color: 0xff7a1a },
      { id: 'freeze', badge: '❄', color: THEME.colors.electricCyan },
      { id: 'x5', badge: `★${P.mult}x`, color: THEME.colors.arcadeYellow }
    ];
    const badgeBg = this.track(scene.add.graphics());
    const badgeTxt = this.track(scene.add.text(pp.x, pp.y + cell * 0.32, '', { fontSize: '12px', fontFamily: THEME.fonts.hud, color: '#FFFFFF' }).setOrigin(0.5));
    const setBadge = (k) => {
      badgeTxt.setText(k.badge);
      const w = Math.max(24, badgeTxt.width + 10);
      badgeBg.clear();
      badgeBg.fillStyle(THEME.colors.ink, 0.9);
      badgeBg.fillRoundedRect(pp.x - w / 2, pp.y + cell * 0.32 - 9, w, 18, 9);
      badgeBg.lineStyle(2, k.color, 1);
      badgeBg.strokeRoundedRect(pp.x - w / 2, pp.y + cell * 0.32 - 9, w, 18, 9);
    };
    const hand = this.track(scene.add.text(pp.x + cell * 0.1, pp.y + cell * 0.15, '👆', { fontSize: `${Math.round(cell * 0.6)}px` }).setOrigin(0.3, 0.1).setAlpha(0));

    if (this.reduced) {
      setBadge(kinds[1]);
      return;
    }

    let k = 0;
    const victims = (id) => {
      if (id === 'line') return sprites[PR];
      if (id === 'bomb') return [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => sprites[r][c]));
      return [sprites[PR][PC]];
    };

    const loop = () => {
      this.pruneTweens();
      const kind = kinds[k % kinds.length];
      k++;
      sprites.flat().forEach((s) => s.setAlpha(1).setScale(s.baseScale).clearTint());
      badgeBg.setAlpha(1);
      badgeTxt.setAlpha(1);
      setBadge(kind);
      this.tween({ targets: sprites[PR][PC], scale: sprites[PR][PC].baseScale * 1.12, duration: 300, yoyo: true, repeat: 1 });

      // Tap twice
      this.tween({ targets: hand, alpha: 1, duration: 180, delay: 300 });
      this.tween({ targets: hand, scale: 0.85, duration: 100, delay: 600, yoyo: true });
      this.tween({ targets: hand, scale: 0.85, duration: 100, delay: 900, yoyo: true });

      this.after(1150, () => {
        this.tween({ targets: hand, alpha: 0, duration: 150 });
        badgeBg.setAlpha(0);
        badgeTxt.setAlpha(0);
        if (kind.id === 'line') {
          const beam = this.track(scene.add.rectangle(0, pp.y, bw + 12, 14, kind.color, 0.8));
          this.tween({ targets: beam, scaleY: 2.4, alpha: 0, duration: 320, onComplete: () => this.removeObj(beam) });
        } else if (kind.id === 'bomb') {
          const blast = this.track(scene.add.circle(pp.x, pp.y, 8, kind.color, 0.7));
          this.tween({ targets: blast, scale: (cell * 1.6) / 8, alpha: 0, duration: 340, onComplete: () => this.removeObj(blast) });
        } else if (kind.id === 'freeze') {
          const wash = this.track(scene.add.rectangle(0, 0, bw + 12, bh + 12, THEME.colors.electricCyan, 0.35));
          const flake = this.track(scene.add.text(0, 0, '❄', { fontSize: `${Math.round(cell * 1.4)}px`, color: '#E6FBFF' }).setOrigin(0.5).setScale(0));
          sprites.flat().forEach((s) => s.setTint(0x9feaff));
          this.tween({ targets: flake, scale: 1, angle: 90, duration: 380, ease: 'Back.easeOut' });
          this.after(900, () => {
            this.tween({ targets: [wash, flake], alpha: 0, duration: 250, onComplete: () => { this.removeObj(wash); this.removeObj(flake); } });
            sprites.flat().forEach((s) => s.clearTint());
          });
        } else {
          this.floatText(0, -cell * 0.4, `★ x${P.mult}`, THEME.colors.arcadeYellowHex, 28);
        }
        victims(kind.id).forEach((s) => {
          this.burst(s.x, s.y, kind.color, 5, 18);
          this.tween({ targets: s, scale: s.baseScale * 1.5, alpha: 0, duration: 220 });
        });
      });

      // Refill
      this.after(2300, () => {
        sprites.flat().forEach((s) => {
          if (s.alpha < 1) {
            s.setScale(s.baseScale).setY(s.y - cell * 0.5);
            this.tween({ targets: s, alpha: 1, y: s.y + cell * 0.5, duration: 240, ease: 'Bounce.easeOut' });
          }
        });
      });
      this.after(3000, loop);
    };
    loop();
  }

  // ---------- Time Kill: high score ----------
  // The score climbs, passes the best score, and a NEW BEST badge pops.
  buildScore() {
    const { scene } = this;
    const P = tutorialParams();
    const artH = this.artHeight();
    const cardW = Math.min(this.size.pw * 0.62, 260);
    const cardH = Math.min(70, artH * 0.46);
    const cardY = -artH * 0.06;
    // Demo values, in whole candies' worth of points
    const best = P.points * 80;
    const final = P.points * 125;

    const trophy = this.track(scene.add.text(0, cardY - cardH / 2 - 22, '🏆', { fontSize: '30px' }).setOrigin(0.5));
    const card = this.track(scene.add.graphics());
    card.fillStyle(THEME.colors.hardShadow, 1);
    card.fillRoundedRect(-cardW / 2, cardY - cardH / 2 + 4, cardW, cardH, 14);
    card.fillStyle(THEME.colors.playfieldTray, 1);
    card.fillRoundedRect(-cardW / 2, cardY - cardH / 2, cardW, cardH, 14);
    card.lineStyle(3, THEME.colors.slimeGreen, 1);
    card.strokeRoundedRect(-cardW / 2, cardY - cardH / 2, cardW, cardH, 14);
    const scoreLabel = this.track(new InkText(scene, 0, cardY - cardH * 0.24, t('timekill.score'), { fontSize: '13px', color: THEME.colors.slimeGreenHex, isHud: true, strokeThickness: 3 }));
    scoreLabel.setOrigin(0.5);
    const scoreVal = this.track(new InkText(scene, 0, cardY + cardH * 0.16, '0', { fontSize: '26px', color: '#FFFFFF', isTitle: true }));
    scoreVal.setOrigin(0.5);
    const bestTxt = this.track(new InkText(scene, 0, cardY + cardH / 2 + 18, `${t('timekill.bestScore')}: ${best}`, { fontSize: '13px', color: '#BBBBBB', isHud: true, strokeThickness: 3 }));
    bestTxt.setOrigin(0.5);
    const newBest = this.track(new InkText(scene, cardW / 2 - 10, cardY - cardH / 2, t('results.newBest'), { fontSize: '14px', color: THEME.colors.arcadeYellowHex, isTitle: true }));
    newBest.setOrigin(0.5).setAngle(12).setAlpha(0);

    if (this.reduced) {
      scoreVal.setText(String(final));
      newBest.setAlpha(1);
      return;
    }

    const state = { v: 0 };
    let celebrated = false;
    const loop = () => {
      this.pruneTweens();
      state.v = 0;
      celebrated = false;
      scoreVal.setText('0');
      newBest.setAlpha(0).setScale(1);
      bestTxt.setText(`${t('timekill.bestScore')}: ${best}`);
      this.tween({
        targets: state,
        v: final,
        duration: 1800,
        delay: 200,
        ease: 'Cubic.easeOut',
        onUpdate: () => {
          const shown = Math.round(state.v / P.points) * P.points;
          scoreVal.setText(String(shown));
          if (!celebrated && shown > best) {
            celebrated = true;
            newBest.setAlpha(1).setScale(0.3);
            this.tween({ targets: newBest, scale: 1, duration: 260, ease: 'Back.easeOut' });
            this.tween({ targets: trophy, y: trophy.y - 10, duration: 160, yoyo: true, repeat: 1 });
            this.burst(0, cardY - cardH / 2, THEME.colors.arcadeYellow, 10, 50);
          }
        }
      });
      this.after(2300, () => bestTxt.setText(`${t('timekill.bestScore')}: ${final}`));
      this.after(3600, loop);
    };
    loop();
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
