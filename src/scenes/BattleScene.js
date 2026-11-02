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
import { BoardView } from '../ui/BoardView.js';
import { SpriteFit } from '../ui/SpriteFit.js';
import { BossEffectOverlay } from '../ui/BossEffectOverlay.js';
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
    this.bossCasting = false;

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
    AudioManager.playBgm('bgm.story');

    this.events.once('shutdown', () => {
      if (this.unsubLayout) this.unsubLayout();
      if (this.unsubSettings) this.unsubSettings();
      this.tweens.killAll();
      this.boardView.clearSprites();
    });
  }

  handleSwap({ r1, c1, r2, c2 }) {
    if (this.boardView.isAnimating || this.fight.isFrozen || this.fight.isGameOver || this.fight.isStageComplete) {
      return;
    }

    this.inputManager.setEnabled(false);
    this.boardView.setSelected(null);

    this.boardView.animateSwap(r1, c1, r2, c2, () => {
      const result = resolveMove(this.boardGrid, { r1, c1, r2, c2 }, rng, { isTimeKill: false });

      if (!result.valid) {
        this.boardView.animateRevert(r1, c1, r2, c2, () => {
          this.inputManager.setEnabled(true);
        });
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
        (step) => {
          // Player attacks enemy
          const defRes = this.fight.dealPlayerDamage(step.cleared.length);
          this.enemyHpGauge.setValue(this.fight.enemyHp);

          // Show damage numbers and flash
          const enemyPos = this.getEnemyCardWorldPos();
          this.showFloatingText(enemyPos.x, enemyPos.y, `-${defRes.damage}`, THEME.colors.slimeGreenHex);
          this.flashSprite(this.enemyPortrait, THEME.colors.slimeGreen);

          if (defRes.defeated) {
            this.handleEnemyDefeated(defRes);
          }
        },
        () => {
          if (result.reshuffled) {
            this.boardView.animateReshuffle(this.boardGrid, () => {
              if (!this.fight.isFrozen && !this.fight.isGameOver) {
                this.inputManager.setEnabled(true);
              }
            });
          } else {
            if (!this.fight.isFrozen && !this.fight.isGameOver) {
              this.inputManager.setEnabled(true);
            }
          }
        }
      );
    });
  }

  handleEnemyDefeated(defRes) {
    AudioManager.playSfx('sfx.win');
    if (defRes.stageComplete) {
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
    this.enemyPortrait.setTexture(enemyTex);

    this.enemyHpGauge.setValue(this.fight.enemyHp, enemy.maxHp);
    this.countdownGauge.setValue(this.fight.countdown, enemy.intervalSec);
  }

  update(time, delta) {
    if (this.currentPopup || this.fight.isGameOver || this.fight.isStageComplete) return;

    const deltaSec = delta / 1000;

    // Tick combat clock
    const attackEvent = this.fight.tick(deltaSec, this.boardGrid);

    // Update countdown gauge
    this.countdownGauge.setValue(this.fight.countdown);

    // Update freeze display
    this.bossOverlay.setFreeze(this.fight.isFrozen, this.fight.freezeTime);
    if (this.fight.isFrozen && this.inputManager.enabled) {
      this.inputManager.setEnabled(false);
    } else if (!this.fight.isFrozen && !this.inputManager.enabled && !this.boardView.isAnimating && !this.bossCasting) {
      this.inputManager.setEnabled(true);
    }

    if (attackEvent) {
      this.handleEnemyAttack(attackEvent);
    }

    if (!this.boardView.isAnimating && !this.fight.isFrozen && !this.bossCasting) {
      this.boardView.setSelected(this.inputManager.selectedCell);
    }
  }

  handleEnemyAttack(attackEvent) {
    // Enemy damages player
    this.playerHpGauge.setValue(attackEvent.playerHp);
    const playerPos = this.getPlayerCardWorldPos();
    this.showFloatingText(playerPos.x, playerPos.y, `-${attackEvent.damage}`, THEME.colors.punchMagentaHex);
    this.flashSprite(this.playerPortrait, THEME.colors.punchMagenta);

    if (attackEvent.attacker === 'boss') {
      AudioManager.playBossSfx(this.stage);

      // Disable player input and clear selection while boss attack is executing
      this.bossCasting = true;
      this.inputManager.setEnabled(false);
      this.boardView.setSelected(null);

      // Boss special effect banner
      this.bossOverlay.showBanner(attackEvent.enemy.name, attackEvent.effect, () => {
        if (attackEvent.effect === 'shuffle') {
          this.boardView.animateReshuffle(this.boardGrid, () => {
            this.bossCasting = false;
            if (!this.fight.isFrozen) {
              this.inputManager.setEnabled(true);
            }
          });
        } else if (attackEvent.effect === 'remove10' && attackEvent.effectResult) {
          this.boardView.animateDevour(attackEvent.effectResult, this.boardGrid, () => {
            this.bossCasting = false;
            if (!this.fight.isFrozen) {
              this.inputManager.setEnabled(true);
            }
          });
        } else {
          this.bossCasting = false;
          if (!this.fight.isFrozen) {
            this.inputManager.setEnabled(true);
          }
        }
      });
    } else {
      AudioManager.playSfx('sfx.hit');
    }

    if (attackEvent.isGameOver) {
      this.time.delayedCall(400, () => {
        this.scene.start('GameOver', { stage: this.stage });
      });
    }
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
    if (!this.currentPopup && !this.fight.isGameOver && !this.fight.isStageComplete && !this.fight.isFrozen && !this.boardView.isAnimating && !this.bossCasting) {
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

    // Fighters Row
    const fZone = battle.fighters;
    this.fightersContainer.setPosition(fZone.x + fZone.width / 2, fZone.y + fZone.height / 2);

    const cardW = Math.min(fZone.width * 0.38, 220 * uiScale);
    const cardH = Math.min(fZone.height * 0.9, 90 * uiScale);

    this.playerPanel.resize(cardW, cardH);
    this.playerPanel.setPosition(-fZone.width * 0.28, 0);
    this.playerName.setPosition(-fZone.width * 0.28, -cardH * 0.32);
    this.playerPortrait.setPosition(-fZone.width * 0.28 - cardW * 0.28, 6);
    SpriteFit.fitContain(this.playerPortrait, cardW * 0.35, cardH * 0.6);
    this.playerHpGauge.setPosition(-fZone.width * 0.28 + cardW * 0.15, 6);
    this.playerHpGauge.resize(cardW * 0.5, Math.max(16, cardH * 0.25));

    this.vsBadge.setPosition(0, 0);
    this.vsBg.resize(Math.max(90, 110 * uiScale), Math.max(54, 68 * uiScale));

    this.enemyPanel.resize(cardW, cardH);
    this.enemyPanel.setPosition(fZone.width * 0.28, 0);
    this.enemyName.setPosition(fZone.width * 0.28, -cardH * 0.32);
    this.enemyPortrait.setPosition(fZone.width * 0.28 + cardW * 0.28, 6);
    SpriteFit.fitContain(this.enemyPortrait, cardW * 0.35, cardH * 0.6);
    this.enemyHpGauge.setPosition(fZone.width * 0.28 - cardW * 0.15, 6);
    this.enemyHpGauge.resize(cardW * 0.5, Math.max(16, cardH * 0.25));

    // Countdown Row
    const cZone = battle.countdown;
    this.countdownRow.setPosition(cZone.x + cZone.width / 2, cZone.y + cZone.height / 2);
    this.countdownGauge.resize(
      Math.min(cZone.width * 0.7, 360 * uiScale),
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

    // Update overlay layout
    this.bossOverlay.updateLayout(width, height, battle.board);

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
      },
      onHowToPlay: () => {
        this.currentPopup = null;
        this.openTutorialPopup();
      }
    });
  }

  openTutorialPopup(onCloseCallback = null) {
    if (this.currentPopup) return;
    this.inputManager.setEnabled(false);
    this.currentPopup = new TutorialPopup(this, {
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
