// src/ui/BattleFx.js
// Wires the enemy taunt bubble (GAME_SPEC decision 37) and Boss Rush callouts (decision 38) into a
// battle. Rules are in core/combat/battlefx.js; this file only feeds them and shows the visuals.
import { TAUNT_CONFIG } from '../config/battlefx.config.js';
import {
  createTauntState, registerWrongSwap, resetWrongSwaps, nextTauntKey,
  calloutsEnabled, createCalloutState, startMove, onBreak
} from '../core/combat/battlefx.js';
import { isDesktopPointer } from '../core/device.js';
import { LayoutManager } from '../systems/LayoutManager.js';
import { TauntBubble } from './TauntBubble.js';
import { BattleCallout } from './BattleCallout.js';
import { rng } from '../core/rng.js';
import { t } from '../i18n/index.js';

export class BattleFx {
  // opts: mode, getEnemy(), getBoardMetrics(), getEnemyAnchorX(), getAvoidRight()
  constructor(scene, opts) {
    this.scene = scene;
    this.opts = opts;
    this.taunts = createTauntState();
    this.callouts = calloutsEnabled(opts.mode) ? createCalloutState() : null;
    this.bubble = new TauntBubble(scene);
    this.callout = new BattleCallout(scene);
  }

  // ── Taunts ──
  wrongSwap() {
    if (!registerWrongSwap(this.taunts)) return;
    if (!isDesktopPointer(TAUNT_CONFIG.desktopQuery)) return;
    const metrics = this.opts.getBoardMetrics();
    if (!metrics) return;
    const cfg = TAUNT_CONFIG.bubble;
    const zone = LayoutManager.planTauntBubble(LayoutManager.getLayout(), metrics, {
      avoidRight: this.opts.getAvoidRight(),
      minWidth: cfg.minWidth,
      gap: cfg.gap
    });
    if (!zone) return;
    const key = nextTauntKey(this.taunts, this.opts.getEnemy(), () => rng.cosmetic());
    this.bubble.show(t(key), zone, this.opts.getEnemyAnchorX());
  }

  validMove() {
    resetWrongSwaps(this.taunts);
  }

  newEnemy() {
    resetWrongSwaps(this.taunts);
    this.bubble.hide();
  }

  // ── Callouts ──
  moveStart() {
    if (this.callouts) startMove(this.callouts);
  }

  // Once per resolved step of a move; defeated = this step killed the enemy.
  step(defeated) {
    if (!this.callouts) return;
    const tier = onBreak(this.callouts, defeated);
    if (defeated) {
      this.callout.hide();
      return;
    }
    if (!tier) return;
    const m = this.opts.getBoardMetrics();
    if (!m) return;
    this.callout.show(tier, { x: m.startX, y: m.startY, width: m.boardWidth, height: m.boardHeight });
  }

  // Layout changed: drop the bubble (its zone may be gone); a callout just fades on its own.
  relayout() {
    this.bubble.hide();
  }

  destroy() {
    this.bubble.hide();
    this.callout.hide();
  }
}
