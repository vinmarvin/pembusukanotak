// src/ui/BoardView.js
// Handles visual rendering, sprite mapping, and animations for the match-3 board.
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';
import { CANDIES_CONFIG } from '../config/candies.config.js';
import { Panel } from './Panel.js';
import { SpriteFit } from './SpriteFit.js';
import { AssetResolver } from '../systems/AssetResolver.js';
import { AudioManager } from '../systems/AudioManager.js';
import { prefersReducedMotion } from '../core/reducedMotion.js';

export class BoardView extends Phaser.GameObjects.Container {
  constructor(scene, cols, rows, options = {}) {
    super(scene, 0, 0);
    this.cols = cols;
    this.rows = rows;
    this.options = options;
    this.boardMetrics = null;
    this.sprites = []; // 2D array [r][c]
    this.isAnimating = false;

    // Tray panel
    this.trayPanel = new Panel(scene, 0, 0, 100, 100, {
      bgColor: THEME.colors.playfieldTray,
      radius: THEME.depth.panelRadius
    });
    this.add(this.trayPanel);

    // Candy container
    this.candiesContainer = scene.add.container(0, 0);
    this.add(this.candiesContainer);

    // Selection highlight indicator
    this.selectionBox = scene.add.graphics();
    this.add(this.selectionBox);

    // Reshuffle banner
    this.reshuffleText = scene.add.text(0, 0, 'RESHUFFLE!', {
      fontFamily: THEME.fonts.title,
      fontSize: '28px',
      color: THEME.colors.arcadeYellowHex,
      stroke: THEME.colors.inkHex,
      strokeThickness: 4
    }).setOrigin(0.5).setAlpha(0);
    this.add(this.reshuffleText);

    scene.add.existing(this);
  }

  initGrid(grid, metrics) {
    this.clearSprites();
    this.boardMetrics = metrics;

    this.sprites = [];
    for (let r = 0; r < this.rows; r++) {
      const rowSprites = [];
      for (let c = 0; c < this.cols; c++) {
        const item = grid[r][c];
        const sprite = this.createCandySprite(r, c, item);
        rowSprites.push(sprite);
      }
      this.sprites.push(rowSprites);
    }

    this.updateMetrics(metrics);
  }

  createCandySprite(r, c, item) {
    if (!item) return null;
    const texKey = AssetResolver.getCandyKey(this.scene, item.type);
    const sprite = this.scene.add.sprite(0, 0, texKey);
    this.candiesContainer.add(sprite);

    // Add power overlay if present
    if (item.power) {
      this.attachPowerOverlay(sprite, item);
    }

    // Optional candy code label (only if theme.showCandyCodes is true per spec)
    if (THEME.showCandyCodes) {
      const candyConfig = CANDIES_CONFIG.types[item.type];
      if (candyConfig) {
        const codeText = this.scene.add.text(0, 0, candyConfig.code, {
          fontFamily: THEME.fonts.hud,
          fontSize: '10px',
          color: '#FFFFFF',
          stroke: THEME.colors.inkHex,
          strokeThickness: 2
        }).setOrigin(0.5);
        sprite.codeLabel = codeText;
        this.candiesContainer.add(codeText);
      }
    }

    return sprite;
  }

  attachPowerOverlay(sprite, item) {
    const powerType = typeof item === 'string' ? item : item?.power;
    const orientation = item?.orientation || null;
    if (!powerType) return;

    const container = this.scene.add.container(0, 0);
    const bg = this.scene.add.graphics();

    let iconText = '★';
    let label = '';
    let bgColor = 0x241442;
    let strokeColor = 0xFFD700;
    let textColor = '#FFFFFF';

    if (powerType === 'bomb') {
      iconText = '💣';
      label = 'BOMB';
      bgColor = 0x330000;
      strokeColor = 0xFF3D00;
      textColor = '#FFD54F';
    } else if (powerType === 'line') {
      if (orientation === 'v') {
        iconText = '↕';
        label = 'LINE';
      } else {
        iconText = '↔';
        label = 'LINE';
      }
      bgColor = 0x003344;
      strokeColor = 0x00E5FF;
      textColor = '#00E5FF';
    } else if (powerType === 'freeze') {
      iconText = '❄️';
      label = 'FREEZE';
      bgColor = 0x002B49;
      strokeColor = 0x40C4FF;
      textColor = '#E1F5FE';
    } else if (powerType === 'x5') {
      iconText = '★';
      label = '5x';
      bgColor = 0x4A3800;
      strokeColor = 0xFFD700;
      textColor = '#FFE082';
    }

    const pillW = label.length > 4 ? 46 : 38;
    const pillH = 18;

    bg.fillStyle(bgColor, 0.92);
    bg.fillRoundedRect(-pillW / 2, -pillH / 2, pillW, pillH, 9);
    bg.lineStyle(2, strokeColor, 1);
    bg.strokeRoundedRect(-pillW / 2, -pillH / 2, pillW, pillH, 9);

    const txt = this.scene.add.text(0, 0, `${iconText} ${label}`, {
      fontFamily: THEME.fonts.hud,
      fontSize: '9px',
      fontStyle: 'bold',
      color: textColor,
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    container.add([bg, txt]);
    container.setDepth(15);
    sprite.powerMarker = container;
    this.candiesContainer.add(container);
  }

  clearSprites() {
    if (this.candiesContainer && this.candiesContainer.list) {
      const children = [...this.candiesContainer.list];
      for (const child of children) {
        this.scene.tweens.killTweensOf(child);
        if (child.powerMarker) child.powerMarker.destroy();
        if (child.codeLabel) child.codeLabel.destroy();
        child.destroy();
      }
      this.candiesContainer.removeAll(true);
    }
    this.sprites = [];
    this.selectionBox.clear();
  }

  updateMetrics(metrics) {
    this.boardMetrics = metrics;
    this.setPosition(
      metrics.startX + metrics.boardWidth / 2,
      metrics.startY + metrics.boardHeight / 2
    );
    this.trayPanel.resize(metrics.boardWidth + 18, metrics.boardHeight + 18);

    const halfW = metrics.boardWidth / 2;
    const halfH = metrics.boardHeight / 2;
    const cellSize = metrics.cellSize;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const sprite = this.sprites[r]?.[c];
        if (sprite) {
          const cx = -halfW + c * cellSize + cellSize / 2;
          const cy = -halfH + r * cellSize + cellSize / 2;
          sprite.setPosition(cx, cy);
          SpriteFit.fitCandy(sprite, cellSize);
          if (sprite.powerMarker) {
            sprite.powerMarker.setPosition(cx, cy);
          }
          if (sprite.codeLabel) {
            sprite.codeLabel.setPosition(cx, cy + cellSize * 0.35);
          }
        }
      }
    }
  }

  getCellCoords(r, c) {
    if (!this.boardMetrics) return { x: 0, y: 0 };
    const halfW = this.boardMetrics.boardWidth / 2;
    const halfH = this.boardMetrics.boardHeight / 2;
    const cellSize = this.boardMetrics.cellSize;
    return {
      x: -halfW + c * cellSize + cellSize / 2,
      y: -halfH + r * cellSize + cellSize / 2
    };
  }

  setSelected(cell) {
    this.selectionBox.clear();
    if (!cell || !this.boardMetrics) return;

    const { x, y } = this.getCellCoords(cell.r, cell.c);
    const size = this.boardMetrics.cellSize;

    this.selectionBox.lineStyle(4, THEME.colors.arcadeYellow, 1);
    this.selectionBox.strokeRoundedRect(x - size / 2 + 2, y - size / 2 + 2, size - 4, size - 4, 12);
  }

  animateSwap(r1, c1, r2, c2, onComplete) {
    this.isAnimating = true;
    this.setSelected(null);

    const s1 = this.sprites[r1][c1];
    const s2 = this.sprites[r2][c2];
    const p1 = this.getCellCoords(r1, c1);
    const p2 = this.getCellCoords(r2, c2);

    AudioManager.playSfx('sfx.swap');

    this.scene.tweens.add({
      targets: s1,
      x: p2.x,
      y: p2.y,
      duration: 150,
      ease: 'Quad.easeInOut'
    });

    this.scene.tweens.add({
      targets: s2,
      x: p1.x,
      y: p1.y,
      duration: 150,
      ease: 'Quad.easeInOut',
      onComplete: () => {
        // Swap references in sprite grid
        this.sprites[r1][c1] = s2;
        this.sprites[r2][c2] = s1;
        if (s1.powerMarker) s1.powerMarker.setPosition(p2.x, p2.y);
        if (s2.powerMarker) s2.powerMarker.setPosition(p1.x, p1.y);
        onComplete();
      }
    });
  }

  animateRevert(r1, c1, r2, c2, onComplete) {
    const s1 = this.sprites[r1][c1];
    const s2 = this.sprites[r2][c2];
    const p1 = this.getCellCoords(r1, c1);
    const p2 = this.getCellCoords(r2, c2);

    AudioManager.playSfx('sfx.invalid');

    if (prefersReducedMotion()) {
      // Skip shake animation under reduced motion
      this.scene.tweens.add({
        targets: s1,
        x: p2.x,
        y: p2.y,
        duration: 100
      });
      this.scene.tweens.add({
        targets: s2,
        x: p1.x,
        y: p1.y,
        duration: 100,
        onComplete: () => {
          this.sprites[r1][c1] = s2;
          this.sprites[r2][c2] = s1;
          if (s1.powerMarker) s1.powerMarker.setPosition(p2.x, p2.y);
          if (s2.powerMarker) s2.powerMarker.setPosition(p1.x, p1.y);
          this.isAnimating = false;
          onComplete();
        }
      });
      return;
    }

    // Shake + swap back
    this.scene.tweens.add({
      targets: [s1, s2],
      x: '+=6',
      duration: 40,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.scene.tweens.add({
          targets: s1,
          x: p2.x,
          y: p2.y,
          duration: 140,
          ease: 'Quad.easeInOut'
        });
        this.scene.tweens.add({
          targets: s2,
          x: p1.x,
          y: p1.y,
          duration: 140,
          ease: 'Quad.easeInOut',
          onComplete: () => {
            this.sprites[r1][c1] = s2;
            this.sprites[r2][c2] = s1;
            if (s1.powerMarker) s1.powerMarker.setPosition(p2.x, p2.y);
            if (s2.powerMarker) s2.powerMarker.setPosition(p1.x, p1.y);
            this.isAnimating = false;
            onComplete();
          }
        });
      }
    });
  }

  animateSteps(steps, onStepCallback, onAllComplete) {
    let stepIndex = 0;

    const runNextStep = () => {
      if (stepIndex >= steps.length) {
        this.isAnimating = false;
        onAllComplete();
        return;
      }

      const step = steps[stepIndex];
      this.animateSingleStep(step, () => {
        if (onStepCallback) onStepCallback(step, stepIndex);
        stepIndex++;
        runNextStep();
      });
    };

    runNextStep();
  }

  animateSingleStep(step, onComplete) {
    const { cleared, falls, spawns } = step;

    AudioManager.playSfx('sfx.hit');

    // Trigger power event visual effects if any
    if (step.powerEvents && step.powerEvents.length > 0) {
      for (const pEvent of step.powerEvents) {
        this.renderPowerEventFx(pEvent);
      }
    }

    // 1. Pop & destroy cleared candies
    const clearTargets = [];
    for (const cell of cleared) {
      const s = this.sprites[cell.r]?.[cell.c];
      if (s) {
        clearTargets.push(s);
        this.sprites[cell.r][cell.c] = null;
      }
    }

    if (clearTargets.length > 0) {
      this.scene.tweens.add({
        targets: clearTargets,
        scaleX: '*=1.3',
        scaleY: '*=1.3',
        alpha: 0,
        duration: 140,
        ease: 'Back.easeIn',
        onComplete: () => {
          clearTargets.forEach((s) => {
            if (s.powerMarker) s.powerMarker.destroy();
            s.destroy();
          });
          this.executeFallsAndSpawns(falls, spawns, onComplete);
        }
      });
    } else {
      this.executeFallsAndSpawns(falls, spawns, onComplete);
    }
  }

  executeFallsAndSpawns(falls, spawns, onComplete) {
    const fallTweens = [];
    const cellSize = this.boardMetrics.cellSize;

    // Execute falls
    for (const f of falls) {
      const s = this.sprites[f.fromR]?.[f.fromC];
      if (s) {
        const dest = this.getCellCoords(f.toR, f.toC);
        this.sprites[f.toR][f.toC] = s;
        this.sprites[f.fromR][f.fromC] = null;

        fallTweens.push({
          target: s,
          y: dest.y,
          marker: s.powerMarker,
          markerY: dest.y
        });
      }
    }

    // Execute spawns
    for (const sp of spawns) {
      const dest = this.getCellCoords(sp.r, sp.c);
      const startY = dest.y - cellSize * (this.rows - sp.r + 1);
      const s = this.createCandySprite(sp.r, sp.c, sp.candy);
      s.setPosition(dest.x, startY);
      s.setAlpha(0);
      SpriteFit.fitCandy(s, cellSize);
      this.sprites[sp.r][sp.c] = s;

      fallTweens.push({
        target: s,
        y: dest.y,
        alpha: 1,
        marker: s.powerMarker,
        markerY: dest.y
      });
    }

    if (fallTweens.length === 0) {
      onComplete();
      return;
    }

    let completedCount = 0;
    for (const item of fallTweens) {
      const tweenConfig = {
        targets: item.target,
        y: item.y,
        duration: 200,
        ease: 'Bounce.easeOut',
        onComplete: () => {
          completedCount++;
          if (completedCount === fallTweens.length) {
            onComplete();
          }
        }
      };
      if (item.alpha !== undefined) tweenConfig.alpha = item.alpha;
      this.scene.tweens.add(tweenConfig);

      if (item.marker) {
        this.scene.tweens.add({
          targets: item.marker,
          y: item.markerY,
          duration: 200,
          ease: 'Bounce.easeOut'
        });
      }
    }
  }

  animateReshuffle(grid, onComplete) {
    this.isAnimating = true;
    AudioManager.playSfx('sfx.powerup');

    // Show banner
    this.reshuffleText.setAlpha(1).setScale(0.5);
    this.scene.tweens.add({
      targets: this.reshuffleText,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 300,
      yoyo: true,
      onComplete: () => {
        this.reshuffleText.setAlpha(0);
      }
    });

    // Kill any active tweens on candy sprites
    if (this.candiesContainer && this.candiesContainer.list) {
      this.candiesContainer.list.forEach((child) => {
        this.scene.tweens.killTweensOf(child);
      });
    }

    const allSprites = this.candiesContainer ? [...this.candiesContainer.list] : [];

    this.scene.tweens.add({
      targets: allSprites,
      alpha: 0,
      scaleX: 0,
      scaleY: 0,
      duration: 200,
      onComplete: () => {
        this.initGrid(grid, this.boardMetrics);
        this.isAnimating = false;
        if (onComplete) onComplete();
      }
    });
  }

  renderPowerEventFx(pEvent) {
    if (!pEvent || !this.boardMetrics) return;
    const halfW = this.boardMetrics.boardWidth / 2;
    const halfH = this.boardMetrics.boardHeight / 2;
    const cellSize = this.boardMetrics.cellSize;

    if (pEvent.type === 'line') {
      const isH = pEvent.orientation === 'h';
      const beam = this.scene.add.graphics();
      beam.fillStyle(0x00E5FF, 0.75);

      if (isH) {
        const y = -halfH + pEvent.row * cellSize + cellSize / 2;
        beam.fillRect(-halfW, y - 8, this.boardMetrics.boardWidth, 16);
        this.candiesContainer.add(beam);
        this.scene.tweens.add({
          targets: beam,
          alpha: 0,
          scaleY: 2.2,
          duration: 250,
          onComplete: () => beam.destroy()
        });
      } else {
        const x = -halfW + pEvent.col * cellSize + cellSize / 2;
        beam.fillRect(x - 8, -halfH, 16, this.boardMetrics.boardHeight);
        this.candiesContainer.add(beam);
        this.scene.tweens.add({
          targets: beam,
          alpha: 0,
          scaleX: 2.2,
          duration: 250,
          onComplete: () => beam.destroy()
        });
      }
      try {
        this.scene.cameras.main.shake(120, 0.003);
      } catch (e) {}
    } else if (pEvent.type === 'bomb') {
      const size = pEvent.size || 4;
      const centerR = pEvent.startR + size / 2;
      const centerC = pEvent.startC + size / 2;
      const cx = -halfW + centerC * cellSize;
      const cy = -halfH + centerR * cellSize;

      const blast = this.scene.add.circle(cx, cy, 10, 0xFF3D00, 0.65);
      blast.setStrokeStyle(4, 0xFFD54F, 1);
      this.candiesContainer.add(blast);

      this.scene.tweens.add({
        targets: blast,
        radius: (size * cellSize) / 2,
        alpha: 0,
        duration: 280,
        ease: 'Cubic.easeOut',
        onComplete: () => blast.destroy()
      });

      try {
        this.scene.cameras.main.shake(180, 0.007);
      } catch (e) {}
    } else if (pEvent.type === 'freeze') {
      try {
        this.scene.cameras.main.flash(200, 0, 229, 255);
      } catch (e) {}
    }
  }

  // World position of a cell centre (the board container is never scaled).
  getCellWorld(r, c) {
    const p = this.getCellCoords(r, c);
    return { x: this.x + p.x, y: this.y + p.y };
  }

  allCandySprites() {
    const out = [];
    for (const row of this.sprites) for (const s of row) if (s) out.push(s);
    return out;
  }

  // Icy tint on every candy while the boss freeze is active.
  setFrozenTint(on) {
    this.frozenTint = on;
    for (const s of this.allCandySprites()) {
      if (on) s.setTint(0x9feaff, 0x9feaff, 0xe6fbff, 0xe6fbff);
      else s.clearTint();
    }
  }

  // Boss shuffle: every candy spirals into a vortex at the board centre, then flies out to its new cell.
  animateBossShuffle(grid, onComplete) {
    this.isAnimating = true;
    this.setSelected(null);
    AudioManager.playSfx('sfx.powerup');
    const fx = THEME.fx;

    const sprites = this.allCandySprites();
    sprites.forEach((s) => this.scene.tweens.killTweensOf(s));

    if (prefersReducedMotion() || sprites.length === 0) {
      this.initGrid(grid, this.boardMetrics);
      this.isAnimating = false;
      if (onComplete) onComplete();
      return;
    }

    const radius = Math.min(this.boardMetrics.boardWidth, this.boardMetrics.boardHeight) * 0.42;
    const vortex = this.scene.add.graphics();
    this.add(vortex);
    const drawVortex = (rot, alpha) => {
      vortex.clear();
      for (let k = 0; k < 3; k++) {
        vortex.lineStyle(5 - k, k === 1 ? THEME.colors.arcadeYellow : THEME.colors.punchMagenta, alpha * (1 - k * 0.2));
        vortex.beginPath();
        for (let i = 0; i <= 40; i++) {
          const t = i / 40;
          const a = rot + k * ((Math.PI * 2) / 3) + t * Math.PI * 2.2;
          const rr = radius * (1 - t);
          const px = Math.cos(a) * rr;
          const py = Math.sin(a) * rr;
          if (i === 0) vortex.moveTo(px, py);
          else vortex.lineTo(px, py);
        }
        vortex.strokePath();
      }
    };
    const spin = { rot: 0, alpha: 0 };
    const total = fx.shuffleGatherMs + fx.shuffleScatterMs + 200;
    this.scene.tweens.add({
      targets: spin,
      rot: Math.PI * 6,
      duration: total,
      onUpdate: () => drawVortex(spin.rot, spin.alpha)
    });
    this.scene.tweens.add({ targets: spin, alpha: 0.85, duration: 200 });
    try {
      this.scene.cameras.main.shake(fx.shuffleGatherMs, 0.004);
    } catch (e) {}

    const scatter = () => {
      this.initGrid(grid, this.boardMetrics);
      const fresh = this.allCandySprites();
      let landed = 0;
      fresh.forEach((s) => {
        const tx = s.x;
        const ty = s.y;
        const ts = s.scaleX;
        s.setPosition(0, 0).setScale(ts * 0.3).setAngle(-360).setAlpha(0.2);
        this.scene.tweens.add({
          targets: s,
          x: tx,
          y: ty,
          scaleX: ts,
          scaleY: ts,
          angle: 0,
          alpha: 1,
          duration: fx.shuffleScatterMs,
          delay: Math.hypot(tx, ty) * 0.25,
          ease: 'Back.easeOut',
          onComplete: () => {
            landed++;
            if (landed === fresh.length) {
              this.scene.tweens.add({
                targets: spin,
                alpha: 0,
                duration: 150,
                onComplete: () => {
                  vortex.destroy();
                  this.isAnimating = false;
                  if (onComplete) onComplete();
                }
              });
            }
          }
        });
      });
    };

    // Gather: spiral inward
    let gathered = 0;
    sprites.forEach((s) => {
      const startA = Math.atan2(s.y, s.x);
      const startR = Math.hypot(s.x, s.y);
      const st = { t: 0 };
      const baseScale = s.scaleX;
      this.scene.tweens.add({
        targets: st,
        t: 1,
        duration: fx.shuffleGatherMs,
        delay: Math.random() * 120,
        ease: 'Cubic.easeIn',
        onUpdate: () => {
          const a = startA + st.t * Math.PI * 1.5;
          const rr = startR * (1 - st.t);
          s.setPosition(Math.cos(a) * rr, Math.sin(a) * rr);
          s.setScale(baseScale * (1 - 0.7 * st.t));
          s.setAngle(st.t * 360);
        },
        onComplete: () => {
          gathered++;
          if (gathered === sprites.length) scatter();
        }
      });
    });
  }

  // Boss devour: target rings mark the victims, they wobble, then get sucked into the boss portrait.
  // options.targetWorld: where the boss is; options.onBite(): called as each candy arrives.
  animateDevour(effectResult, finalGrid, onComplete, options = {}) {
    this.isAnimating = true;
    this.setSelected(null);
    const fx = THEME.fx;

    const removed = effectResult?.removedCells || [];
    const victims = [];
    for (const cell of removed) {
      const s = this.sprites[cell.r]?.[cell.c];
      if (s) {
        victims.push(s);
        this.sprites[cell.r][cell.c] = null;
      }
    }

    const finish = () => {
      const settleGrid = () => {
        this.initGrid(finalGrid, this.boardMetrics);
        this.isAnimating = false;
        if (onComplete) onComplete();
      };
      if (effectResult?.falls?.length || effectResult?.spawns?.length) {
        this.executeFallsAndSpawns(effectResult.falls || [], effectResult.spawns || [], settleGrid);
      } else {
        settleGrid();
      }
    };

    const destroySprite = (s) => {
      if (s.powerMarker) s.powerMarker.destroy();
      if (s.codeLabel) s.codeLabel.destroy();
      s.destroy();
    };

    if (victims.length === 0) {
      finish();
      return;
    }

    if (prefersReducedMotion()) {
      victims.forEach(destroySprite);
      finish();
      return;
    }

    // 1. Mark victims with pulsing target rings and a wobble
    const cellSize = this.boardMetrics.cellSize;
    const rings = this.scene.add.graphics();
    this.add(rings);
    const ringState = { p: 0 };
    this.scene.tweens.add({
      targets: ringState,
      p: 1,
      duration: fx.devourMarkMs,
      onUpdate: () => {
        rings.clear();
        const pulse = 0.5 + 0.5 * Math.sin(ringState.p * Math.PI * 4);
        rings.lineStyle(3, THEME.colors.punchMagenta, 0.6 + 0.4 * pulse);
        rings.fillStyle(THEME.colors.punchMagenta, 0.18 + 0.12 * pulse);
        for (const s of victims) {
          const rr = cellSize * (0.55 - 0.1 * ringState.p);
          rings.fillCircle(s.x, s.y, rr);
          rings.strokeCircle(s.x, s.y, rr);
        }
      }
    });
    victims.forEach((s) => {
      this.scene.tweens.add({ targets: s, angle: { from: -12, to: 12 }, duration: 70, yoyo: true, repeat: Math.floor(fx.devourMarkMs / 140) });
    });

    // 2. Suck them into the boss along curved paths
    const target = options.targetWorld || { x: this.x, y: this.y - this.boardMetrics.boardHeight };
    const local = { x: target.x - this.x, y: target.y - this.y };
    this.scene.time.delayedCall(fx.devourMarkMs, () => {
      rings.destroy();
      let arrived = 0;
      victims.forEach((s, i) => {
        this.scene.tweens.killTweensOf(s);
        s.setAngle(0);
        this.candiesContainer.bringToTop(s);
        const fromX = s.x;
        const fromY = s.y;
        const ctrl = { x: (fromX + local.x) / 2 + (Math.random() - 0.5) * cellSize * 3, y: Math.min(fromY, local.y) - cellSize };
        const st = { t: 0 };
        const baseScale = s.scaleX;
        this.scene.tweens.add({
          targets: st,
          t: 1,
          delay: i * fx.devourStaggerMs,
          duration: fx.devourFlightMs,
          ease: 'Cubic.easeIn',
          onUpdate: () => {
            const u = 1 - st.t;
            s.setPosition(
              u * u * fromX + 2 * u * st.t * ctrl.x + st.t * st.t * local.x,
              u * u * fromY + 2 * u * st.t * ctrl.y + st.t * st.t * local.y
            );
            s.setScale(baseScale * (1 - 0.75 * st.t));
            s.setAngle(st.t * 540);
          },
          onComplete: () => {
            destroySprite(s);
            if (options.onBite) options.onBite();
            arrived++;
            if (arrived === victims.length) finish();
          }
        });
      });
    });
  }
}

