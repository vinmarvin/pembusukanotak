// src/scenes/BattleScene.js
// Complete Battle scene: match-3 combat engine, fight state, boss attacks, countdowns, and effects.
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';
import { GAMEPLAY } from '../config/gameplay.config.js';
import { TopBar } from '../ui/TopBar.js';
import { Panel } from '../ui/Panel.js';
import { Gauge } from '../ui/Gauge.js';
import { InkText } from '../ui/InkText.js';
import { LocalizedText } from '../ui/LocalizedText.js';
import { Button } from '../ui/Button.js';
import { Popup } from '../ui/Popup.js';
import { Slider } from '../ui/Slider.js';
import { Toggle } from '../ui/Toggle.js';
import { SettingsPopup } from '../ui/SettingsPopup.js';
import { TutorialPopup } from '../ui/TutorialPopup.js';
import { shouldShowTutorial } from '../core/tutorials.js';
import { BoardView } from '../ui/BoardView.js';
import { SpriteFit } from '../ui/SpriteFit.js';
import { BossEffectOverlay } from '../ui/BossEffectOverlay.js';
import { fireOrb, hitReact, damagePop, burst, worldPos } from '../ui/AttackFx.js';
import { LayoutManager } from '../systems/LayoutManager.js';
import { InputManager } from '../systems/InputManager.js';
import { AssetResolver } from '../systems/AssetResolver.js';
import { EventBus } from '../systems/EventBus.js';
import { AudioManager } from '../systems/AudioManager.js';
import { SaveManager } from '../systems/SaveManager.js';
import { recordClearedCandies, recordBossDefeat } from '../core/unlocks/memebook.js';
import { checkAchievements } from '../core/unlocks/achievements.js';
import { createBoard, resolveMove } from '../core/board/index.js';
import { FightEngine } from '../core/combat/index.js';
import { rng } from '../core/rng.js';
import { getLanguage, setLanguage, t } from '../i18n/index.js';

export class BattleScene extends Phaser.Scene {
  constructor() {
    super('Battle');
  }

  init(data) {
    this.stage = data?.stage || 1;
    this.cols = GAMEPLAY.board.cols || 8;
    this.rows = GAMEPLAY.board.rowsStory || 7;
  }

  create() {
    // 1. Initialize Fight Engine
    const isDebug = new URLSearchParams(window.location.search).get('debug') === '1';
    this.fight = new FightEngine(this.stage, { rng, isDebug });
    // Scene instance is reused between visits: clear a popup left over from Pause > Menu.
    this.currentPopup = null;
    this.bossCasting = false;
    this.castInProgress = false;
    this.moveInFlight = false;
    this.wasFrozen = false;
    this.pendingBossEffects = [];

    // 2. Initialize match-3 board
    this.boardGrid = createBoard(this.cols, this.rows, rng);

    // 3. Visual components
    this.topBar = new TopBar(this, {
      showMenuBtn: true,
      onMenuClick: () => this.openPausePopup(),
      onSettingsClick: () => this.openSettingsPopup()
    });

    this.fightersContainer = this.add.container(0, 0);

    // Player Card
    this.playerPanel = new Panel(this, 0, 0, 200, 100, {
      bgColor: THEME.colors.cardBg,
      radius: THEME.depth.cardRadius
    });
    this.playerName = new LocalizedText(this, 0, -32, 'battle.playerName', {}, {
      fontSize: '14px',
      color: THEME.colors.slimeGreenHex,
      isHud: true
    });
    const playerTex = AssetResolver.getTextureKey(this, 'player');
    this.playerPortrait = this.add.sprite(-55, 6, playerTex);
    this.playerHpGauge = new Gauge(this, 25, 12, 110, 20, {
      maxVal: this.fight.playerMaxHp,
      currentVal: this.fight.playerHp,
      fillColor: THEME.colors.slimeGreen
    });

    this.fightersContainer.add([
      this.playerPanel,
      this.playerName,
      this.playerPortrait,
      this.playerHpGauge
    ]);

    // VS Badge (Bug 3: made larger, clearer, and more prominent)
    this.vsBadge = this.add.container(0, 0);
    this.vsBg = new Panel(this, 0, 0, 110, 68, {
      bgColor: THEME.colors.playfieldTray,
      outlineColor: THEME.colors.arcadeYellow,
      radius: 14
    });
    this.vsText = new LocalizedText(this, 0, -18, 'battle.vs', {}, {
      fontSize: '20px',
      color: THEME.colors.arcadeYellowHex,
      isTitle: true
    });
    this.stageTag = new LocalizedText(this, 0, 4, 'battle.stageTag', { n: this.stage }, {
      fontSize: '14px',
      color: '#FFFFFF',
      isHud: true
    });
    this.enemyTag = new LocalizedText(this, 0, 22, 'battle.enemyTag', { k: 1, total: 6 }, {
      fontSize: '12px',
      color: THEME.colors.slimeGreenHex,
      isHud: true
    });
    this.vsBadge.add([this.vsBg, this.vsText, this.stageTag, this.enemyTag]);
    this.fightersContainer.add(this.vsBadge);

    // Enemy Card
    this.enemyPanel = new Panel(this, 0, 0, 200, 100, {
      bgColor: THEME.colors.cardBg,
      radius: THEME.depth.cardRadius
    });
    this.enemyName = new InkText(this, 0, -32, this.fight.enemy.name, {
      fontSize: '13px',
      color: THEME.colors.punchMagentaHex,
      isHud: true
    });
    const enemyTex = this.fight.enemy.isBoss
      ? AssetResolver.getBossKey(this, this.fight.enemy.assetKey)
      : AssetResolver.getMinionKey(this, this.fight.enemy.assetKey);
    this.enemyPortrait = this.add.sprite(55, 6, enemyTex);
    this.enemyHpGauge = new Gauge(this, -25, 12, 110, 20, {
      maxVal: this.fight.enemy.maxHp,
      currentVal: this.fight.enemyHp,
      fillColor: THEME.colors.punchMagenta
    });
    this.fightersContainer.add([
      this.enemyPanel,
      this.enemyName,
      this.enemyPortrait,
      this.enemyHpGauge
    ]);

    // Attack Countdown Row
    this.countdownRow = this.add.container(0, 0);
    this.countdownGauge = new Gauge(this, 0, 0, 300, 20, {
      maxVal: this.fight.enemy.intervalSec,
      currentVal: this.fight.countdown,
      fillColor: THEME.colors.arcadeYellow,
      isCountdown: true,
      textFormat: (cur) => `${cur.toFixed(1)}s`
    });
    this.countdownRow.add(this.countdownGauge);

    // Board View
    this.boardView = new BoardView(this, this.cols, this.rows);

    // Boss effect & freeze overlay
    this.bossOverlay = new BossEffectOverlay(this);

    // Debug scene button (strictly gated behind ?debug=1 per Phase 8 task)
    if (isDebug) {
      this.debugSceneBtn = new Button(this, 0, 0, 75, 36, {
        text: 'Assets',
        bgColor: THEME.colors.arcadeYellow,
        textColor: THEME.colors.inkHex,
        fontSize: '14px',
        radius: 10,
        onClick: () => this.scene.start('AssetDebug')
      });
    }

    // Input Manager
    this.inputManager = new InputManager({
      scene: this,
      onSwap: (move) => this.handleSwap(move)
    });
    this.inputManager.bindEvents();

    // Listeners
    this.unsubLayout = EventBus.on('layout:changed', (layout) => {
      this.applyLayout(layout);
    });

    this.unsubSettings = EventBus.on('ui:openSettings', () => {
      this.openSettingsPopup();
    });

    this.applyLayout(LayoutManager.getLayout());

    // First time this mode is played: show its tutorial. The game waits behind the popup.
    if (shouldShowTutorial(SaveManager.data, 'story')) {
      this.openTutorialPopup();
    }
    AudioManager.playBgm('bgm.story');

    this.events.once('shutdown', () => {
      if (this.unsubLayout) this.unsubLayout();
      if (this.unsubSettings) this.unsubSettings();
      this.tweens.killAll();
      this.boardView.clearSprites();
    });
  }

  // Turn order when the boss attacks during a player move (owner rule):
  // 1) boss damage lands at once, 2) the player's in-flight move resolves and deals its damage,
  // 3) only then the boss effect (shuffle / devour / freeze) is cast on the settled board.
  handleSwap({ r1, c1, r2, c2 }) {
    if (this.moveInFlight || this.bossCasting || this.boardView.isAnimating || this.fight.isFrozen || this.fight.isGameOver || this.fight.isStageComplete) {
      return;
    }

    this.moveInFlight = true;
    this.inputManager.setEnabled(false);
    this.boardView.setSelected(null);

    this.boardView.animateSwap(r1, c1, r2, c2, () => {
      const result = resolveMove(this.boardGrid, { r1, c1, r2, c2 }, rng, { isTimeKill: false });

      if (!result.valid) {
        this.boardView.animateRevert(r1, c1, r2, c2, () => this.finishMove());
        return;
      }

      this.boardGrid = result.grid;

      // Track destroyed candies across modes
      SaveManager.update((s) => {
        recordClearedCandies(s, result.steps);
        checkAchievements(s);
      });

      this.boardView.animateSteps(
        result.steps,
        (step) => this.applyStepDamage(step),
        () => {
          if (result.reshuffled) {
            this.boardView.animateReshuffle(this.boardGrid, () => this.finishMove());
          } else {
            this.finishMove();
          }
        }
      );
    });
  }

  finishMove() {
    this.moveInFlight = false;
    if (this.runPendingBossEffect()) return;
    this.checkRestoreInput();
  }

  // Damage is applied to the fight state at once (rules stay exact); the HP bar,
  // damage number and hit reaction land when the first orb reaches the enemy.
  applyStepDamage(step) {
    const enemyIdx = this.fight.enemyIndex;
    const defRes = this.fight.dealPlayerDamage(step.cleared.length);
    if (defRes.damage <= 0 && !defRes.defeated) return;

    this.fireAttackOrbs(step.cleared, () => {
      const pos = worldPos(this.enemyPortrait);
      damagePop(this, pos.x, pos.y - 20, `-${defRes.damage}`, THEME.colors.arcadeYellowHex);
      if (defRes.defeated) {
        this.handleEnemyDefeated(defRes);
      } else if (this.fight.enemyIndex === enemyIdx) {
        this.enemyHpGauge.setValue(this.fight.enemyHp);
      }
    });
  }

  fireAttackOrbs(cells, onFirstHit) {
    const max = THEME.fx.maxOrbsPerStep;
    const stepSize = Math.max(1, cells.length / max);
    const picks = [];
    for (let i = 0; i < cells.length && picks.length < max; i += stepSize) {
      picks.push(cells[Math.floor(i)]);
    }
    let first = true;
    const target = worldPos(this.enemyPortrait);
    picks.forEach((cell, i) => {
      const from = this.boardView.getCellWorld(cell.r, cell.c);
      burst(this, from.x, from.y, THEME.colors.arcadeYellow, 5, 20);
      fireOrb(this, from, target, {
        delay: i * THEME.fx.orbStaggerMs,
        onHit: () => {
          const now = worldPos(this.enemyPortrait);
          burst(this, now.x, now.y, THEME.colors.punchMagenta, 6, 30);
          hitReact(this, this.enemyPortrait);
          if (first) {
            first = false;
            onFirstHit();
          }
        }
      });
    });
    if (picks.length === 0) onFirstHit();
  }

  handleEnemyDefeated(defRes) {
    AudioManager.playSfx('sfx.win');
    if (defRes.stageComplete) {
      this.pendingBossEffects = [];
      SaveManager.update((s) => {
        recordBossDefeat(s, `b${this.stage}`);
        checkAchievements(s);
      });
      this.time.delayedCall(600, () => {
        this.scene.start('StageClear', { stage: this.stage });
      });
    } else {
      // Advance to next enemy and update visuals
      this.updateEnemyCardVisuals();
      this.playerHpGauge.setValue(this.fight.playerHp);
      this.showFloatingText(this.getPlayerCardWorldPos().x, this.getPlayerCardWorldPos().y, 'HEALED!', THEME.colors.slimeGreenHex);
    }
  }

  updateEnemyCardVisuals() {
    const enemy = this.fight.enemy;
    this.enemyName.setText(enemy.name);
    this.enemyTag.setParams({ k: this.fight.enemyIndex + 1, total: 6 });

    const enemyTex = enemy.isBoss
      ? AssetResolver.getBossKey(this, enemy.assetKey)
      : AssetResolver.getMinionKey(this, enemy.assetKey);
    this.tweens.killTweensOf(this.enemyPortrait);
    this.enemyPortrait._hitShaking = false;
    this.enemyPortrait._biting = false;
    this.enemyPortrait.clearTint();
    this.enemyPortrait.setTexture(enemyTex);
    if (this.enemyPortraitBox) {
      const b = this.enemyPortraitBox;
      this.enemyPortrait.setPosition(b.x, b.y);
      SpriteFit.fitContain(this.enemyPortrait, b.w, b.h);
    }

    this.enemyHpGauge.setValue(this.fight.enemyHp, enemy.maxHp);
    this.countdownGauge.setValue(this.fight.countdown, enemy.intervalSec);
  }

  update(time, delta) {
    if (this.currentPopup || this.fight.isGameOver || this.fight.isStageComplete) return;

    const deltaSec = delta / 1000;

    // Tick combat clock. No grid is passed: boss effects are cast later by runPendingBossEffect().
    const attackEvent = this.fight.tick(deltaSec);

    // Update countdown gauge
    this.countdownGauge.setValue(this.fight.countdown);

    // Freeze display and icy candies
    const frozen = this.fight.isFrozen;
    if (frozen !== this.wasFrozen) {
      this.wasFrozen = frozen;
      this.boardView.setFrozenTint(frozen);
    }
    this.bossOverlay.setFreeze(frozen, this.fight.freezeTime);
    if (frozen && this.inputManager.enabled) {
      this.inputManager.setEnabled(false);
    } else if (!frozen && !this.inputManager.enabled && !this.boardView.isAnimating && !this.bossCasting && !this.moveInFlight) {
      this.inputManager.setEnabled(true);
    }

    if (attackEvent) {
      this.handleEnemyAttack(attackEvent);
    }

    if (!this.boardView.isAnimating && !frozen && !this.bossCasting && !this.moveInFlight) {
      this.boardView.setSelected(this.inputManager.selectedCell);
    }
  }

  handleEnemyAttack(attackEvent) {
    // 1. Enemy damage lands now (logic). The visual is a magenta orb from enemy to player.
    const from = worldPos(this.enemyPortrait);
    const to = worldPos(this.playerPortrait);
    fireOrb(this, from, to, {
      color: THEME.colors.punchMagenta,
      arc: -40,
      onHit: () => {
        this.playerHpGauge.setValue(attackEvent.playerHp);
        damagePop(this, to.x, to.y - 20, `-${attackEvent.damage}`, THEME.colors.punchMagentaHex);
        burst(this, to.x, to.y, THEME.colors.punchMagenta, 7, 30);
        hitReact(this, this.playerPortrait);
      }
    });

    if (attackEvent.attacker === 'boss') {
      AudioManager.playBossSfx(this.stage);
    } else {
      AudioManager.playSfx('sfx.hit');
    }

    if (attackEvent.isGameOver) {
      this.inputManager.setEnabled(false);
      this.time.delayedCall(THEME.fx.orbFlightMs + 400, () => {
        this.scene.start('GameOver', { stage: this.stage });
      });
      return;
    }

    // 2. Boss effect is queued; it is cast once any in-flight player move has resolved.
    if (attackEvent.attacker === 'boss' && attackEvent.effect) {
      this.pendingBossEffects.push({ bossName: attackEvent.enemy.name, effect: attackEvent.effect });
      // No new move may start now; a move already in progress finishes first.
      this.bossCasting = true;
      this.inputManager.setEnabled(false);
      this.boardView.setSelected(null);
      if (!this.moveInFlight && !this.boardView.isAnimating) {
        this.runPendingBossEffect();
      }
    }
  }

  // Casts the next queued boss effect. Returns true if a cast started.
  runPendingBossEffect() {
    if (this.castInProgress) return true;
    if (!this.pendingBossEffects.length) {
      return false;
    }
    if (this.fight.isStageComplete || this.fight.isGameOver || !this.fight.enemy.isBoss) {
      this.pendingBossEffects = [];
      this.bossCasting = false;
      return false;
    }

    const { bossName, effect } = this.pendingBossEffects.shift();
    this.castInProgress = true;
    this.bossCasting = true;
    this.inputManager.setEnabled(false);
    this.boardView.setSelected(null);

    const done = () => {
      this.castInProgress = false;
      if (this.runPendingBossEffect()) return;
      this.bossCasting = false;
      this.checkRestoreInput();
    };

    this.bossOverlay.showBanner(bossName, effect, () => {
      const result = this.fight.castBossEffect(effect, this.boardGrid);
      if (!result) {
        done();
      } else if (effect === 'shuffle') {
        this.boardView.animateBossShuffle(this.boardGrid, done);
      } else if (effect === 'remove10') {
        this.boardView.animateDevour(result, this.boardGrid, done, {
          targetWorld: worldPos(this.enemyPortrait),
          onBite: () => this.bossBite()
        });
      } else {
        // Freeze: update() picks up fight.isFrozen and plays the ice effect.
        done();
      }
    });
    return true;
  }

  // Boss "chomp" as each devoured candy arrives.
  bossBite() {
    const p = this.enemyPortrait;
    if (!p || !p.scene) return;
    const pos = worldPos(p);
    burst(this, pos.x, pos.y, THEME.colors.arcadeYellow, 4, 18);
    if (p._biting) return;
    p._biting = true;
    const sy = p.scaleY;
    const sx = p.scaleX;
    this.tweens.add({
      targets: p,
      scaleY: sy * 0.82,
      scaleX: sx * 1.12,
      duration: 70,
      yoyo: true,
      onComplete: () => {
        p.setScale(sx, sy);
        p._biting = false;
      }
    });
  }

  showFloatingText(x, y, text, color) {
    const txt = new InkText(this, x, y - 10, text, {
      fontSize: '24px',
      color,
      isTitle: true
    });
    txt.setDepth(120);

    this.tweens.add({
      targets: txt,
      y: y - 50,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy()
    });
  }

  flashSprite(sprite, tint) {
    if (!sprite) return;
    sprite.setTint(tint);
    this.time.delayedCall(150, () => sprite.clearTint());
  }

  getPlayerCardWorldPos() {
    return {
      x: this.fightersContainer.x + this.playerPanel.x,
      y: this.fightersContainer.y + this.playerPanel.y
    };
  }

  getEnemyCardWorldPos() {
    return {
      x: this.fightersContainer.x + this.enemyPanel.x,
      y: this.fightersContainer.y + this.enemyPanel.y
    };
  }

  showGameOverOverlay() {
    AudioManager.playSfx('sfx.lose');
    const pw = Math.min(this.scale.width * 0.85, 380);
    const ph = Math.min(this.scale.height * 0.7, 300);

    const popup = new Popup(this, pw, ph, {
      title: t('gameover.title'),
      showCloseBtn: false
    });

    const d = popup.dialog;

    const sub = new InkText(this, 0, -20, t('gameover.subtitle'), {
      fontSize: '16px',
      color: THEME.colors.punchMagentaHex
    });
    d.add(sub);

    const retryBtn = new Button(this, 0, 40, 160, 44, {
      text: t('gameover.retry'),
      bgColor: THEME.colors.slimeGreen,
      textColor: THEME.colors.inkHex,
      onClick: () => {
        popup.destroy();
        this.scene.restart({ stage: this.stage });
      }
    });
    d.add(retryBtn);

    this.currentPopup = popup;
  }

  showStageClearOverlay() {
    const pw = Math.min(this.scale.width * 0.85, 400);
    const ph = Math.min(this.scale.height * 0.75, 340);

    const popup = new Popup(this, pw, ph, {
      title: t('stageclear.title'),
      showCloseBtn: false
    });

    const d = popup.dialog;

    const info = new InkText(this, 0, -30, `Area ${this.stage} Conquered!`, {
      fontSize: '18px',
      color: THEME.colors.slimeGreenHex,
      isHud: true
    });
    d.add(info);

    const nextBtn = new Button(this, 0, 40, 160, 44, {
      text: this.stage < 5 ? t('stageclear.nextStage') : t('common.menu'),
      bgColor: THEME.colors.arcadeYellow,
      textColor: THEME.colors.inkHex,
      onClick: () => {
        popup.destroy();
        if (this.stage < 5) {
          this.scene.restart({ stage: this.stage + 1 });
        } else {
          this.scene.restart({ stage: 1 });
        }
      }
    });
    d.add(nextBtn);

    this.currentPopup = popup;
  }

  checkRestoreInput() {
    if (!this.currentPopup && !this.fight.isGameOver && !this.fight.isStageComplete && !this.fight.isFrozen && !this.boardView.isAnimating && !this.bossCasting && !this.moveInFlight) {
      this.inputManager.setEnabled(true);
    }
  }

  openPausePopup() {
    if (this.currentPopup) return;
    this.inputManager.setEnabled(false);

    const pw = Math.min(this.scale.width * 0.88, 360);
    const ph = Math.min(this.scale.height * 0.85, 380);

    const popup = new Popup(this, pw, ph, {
      title: t('pause.title'),
      onClose: () => {
        this.currentPopup = null;
        this.checkRestoreInput();
      }
    });

    const d = popup.dialog;

    const resumeBtn = new Button(this, 0, -75, 200, 44, {
      text: t('pause.resume'),
      bgColor: THEME.colors.slimeGreen,
      textColor: THEME.colors.inkHex,
      fontSize: '16px',
      onClick: () => popup.close()
    });

    const tutorialBtn = new Button(this, 0, -20, 200, 44, {
      text: t('settings.howToPlay'),
      bgColor: THEME.colors.electricCyan,
      textColor: THEME.colors.inkHex,
      fontSize: '16px',
      onClick: () => {
        popup.destroy();
        this.currentPopup = null;
        this.openTutorialPopup(() => {
          this.openPausePopup();
        });
      }
    });

    const restartBtn = new Button(this, 0, 35, 200, 44, {
      text: t('pause.restart'),
      bgColor: THEME.colors.arcadeYellow,
      textColor: THEME.colors.inkHex,
      fontSize: '16px',
      onClick: () => {
        popup.destroy();
        this.scene.restart({ stage: this.stage });
      }
    });

    const menuBtn = new Button(this, 0, 90, 200, 44, {
      text: t('common.menu'),
      bgColor: THEME.colors.playfieldTray,
      textColor: '#FFFFFF',
      fontSize: '16px',
      onClick: () => {
        popup.destroy();
        this.currentPopup = null;
        this.scene.start('MainMenu');
      }
    });

    d.add([resumeBtn, tutorialBtn, restartBtn, menuBtn]);
    this.currentPopup = popup;
  }

  applyLayout(layout) {
    const { width, height, uiScale, topBar, battle } = layout;

    this.topBar.updateLayout(width, topBar.height);
    if (this.debugSceneBtn) {
      this.debugSceneBtn.setPosition(width - 230, topBar.height / 2);
    }

    // Fighter cards and VS badge: absolute rectangles from LayoutManager (stacked row on
    // laptops/tablets, side columns on short landscape screens).
    this.fightersContainer.setPosition(0, 0);
    const placeCard = (r, panel, name, portrait, gauge, isEnemy) => {
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      const cardW = r.width;
      const cardH = r.height;
      panel.resize(cardW, cardH);
      panel.setPosition(cx, cy);
      name.setPosition(cx, cy - cardH * 0.32);
      const box = {
        x: cx + (isEnemy ? 1 : -1) * cardW * 0.28,
        y: cy + 6,
        w: cardW * 0.35,
        h: cardH * 0.6
      };
      portrait.setPosition(box.x, box.y);
      SpriteFit.fitContain(portrait, box.w, box.h);
      gauge.setPosition(cx + (isEnemy ? -1 : 1) * cardW * 0.15, cy + 6);
      gauge.resize(cardW * 0.5, Math.max(16, Math.min(cardH * 0.25, 26)));
      return box;
    };
    placeCard(battle.playerCard, this.playerPanel, this.playerName, this.playerPortrait, this.playerHpGauge, false);
    this.enemyPortraitBox = placeCard(battle.enemyCard, this.enemyPanel, this.enemyName, this.enemyPortrait, this.enemyHpGauge, true);

    this.vsBadge.setPosition(battle.vs.x + battle.vs.width / 2, battle.vs.y + battle.vs.height / 2);
    this.vsBg.resize(battle.vs.width, battle.vs.height);

    // Countdown Row
    const cZone = battle.countdown;
    this.countdownRow.setPosition(cZone.x + cZone.width / 2, cZone.y + cZone.height / 2);
    this.countdownGauge.resize(
      Math.min(cZone.width * (battle.mode === 'compact' ? 0.95 : 0.7), 360 * uiScale),
      Math.max(16, cZone.height * 0.7)
    );

    // Board Metrics & Placement
    const metrics = LayoutManager.computeBoardMetrics(this.cols, this.rows, battle.board);
    if (!this.boardView.boardMetrics) {
      this.boardView.initGrid(this.boardGrid, metrics);
    } else {
      this.boardView.updateMetrics(metrics);
    }
    this.inputManager.setBoardMetrics(metrics);

    // Freeze overlay covers exactly the board
    this.bossOverlay.updateLayout(width, height, {
      x: metrics.startX,
      y: metrics.startY,
      width: metrics.boardWidth,
      height: metrics.boardHeight
    });

    if (this.currentPopup) {
      this.currentPopup.reposition(width, height);
    }
  }

  openSettingsPopup() {
    if (this.currentPopup) return;
    this.inputManager.setEnabled(false);
    this.currentPopup = new SettingsPopup(this, {
      onClose: () => {
        this.currentPopup = null;
        this.checkRestoreInput();
      }
    });
  }

  openTutorialPopup(onCloseCallback = null) {
    if (this.currentPopup) return;
    this.inputManager.setEnabled(false);
    this.currentPopup = new TutorialPopup(this, {
      mode: 'story',
      onClose: () => {
        this.currentPopup = null;
        if (onCloseCallback) {
          onCloseCallback();
        } else {
          this.checkRestoreInput();
        }
      }
    });
  }


}
