// src/scenes/TimeKillScene.js
// 2-minute score attack mode matching Time_Kill.png with section 6 corrections.
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
import { LayoutManager } from '../systems/LayoutManager.js';
import { InputManager } from '../systems/InputManager.js';
import { AudioManager } from '../systems/AudioManager.js';
import { SaveManager } from '../systems/SaveManager.js';
import { EventBus } from '../systems/EventBus.js';
import { TimeKillEngine } from '../core/timekill/timekill.js';
import { recordClearedCandies } from '../core/unlocks/memebook.js';
import { checkAchievements } from '../core/unlocks/achievements.js';
import { createBoard, resolveMove } from '../core/board/index.js';
import { rng } from '../core/rng.js';
import { getLanguage, setLanguage, t } from '../i18n/index.js';

export class TimeKillScene extends Phaser.Scene {
  constructor() {
    super('TimeKill');
  }

  create() {
    this.cols = GAMEPLAY.board.cols || 8;
    this.rows = GAMEPLAY.board.rowsTimeKill || 8; // 8x8 for Time Kill per Decision 1

    this.engine = new TimeKillEngine({ rng });
    this.boardGrid = createBoard(this.cols, this.rows, rng);

    // Top Bar
    this.topBar = new TopBar(this, {
      showMenuBtn: true,
      onMenuClick: () => this.openPausePopup(),
      onSettingsClick: () => this.openSettingsPopup()
    });

    // Score Header
    this.headerContainer = this.add.container(0, 0);

    // Score Card
    this.scoreCard = new Panel(this, 0, 0, 180, 70, {
      bgColor: THEME.colors.cardBg,
      radius: 14
    });
    this.scoreLabel = new LocalizedText(this, 0, -16, 'timekill.score', {}, {
      fontSize: '12px',
      color: THEME.colors.arcadeYellowHex,
      isHud: true
    });
    this.scoreValue = new InkText(this, 0, 12, '0', {
      fontSize: '24px',
      color: '#FFFFFF',
      isTitle: true
    });
    this.headerContainer.add([this.scoreCard, this.scoreLabel, this.scoreValue]);

    // Best Score Card
    this.bestScoreCard = new Panel(this, 0, 0, 180, 70, {
      bgColor: THEME.colors.cardBg,
      radius: 14
    });
    this.bestScoreLabel = new LocalizedText(this, 0, -16, 'timekill.bestScore', {}, {
      fontSize: '12px',
      color: THEME.colors.slimeGreenHex,
      isHud: true
    });
    this.bestScoreValue = new InkText(this, 0, 12, `${this.engine.bestScore}`, {
      fontSize: '20px',
      color: '#FFFFFF',
      isTitle: true
    });
    this.headerContainer.add([this.bestScoreCard, this.bestScoreLabel, this.bestScoreValue]);

    // Active Effect Chips (Freeze, 5x Score)
    this.freezeChip = new Panel(this, 0, 0, 110, 32, {
      bgColor: THEME.colors.electricCyan,
      radius: 10
    });
    this.freezeChipText = new InkText(this, 0, 0, '❄️ Freeze', {
      fontSize: '12px',
      color: THEME.colors.inkHex,
      isHud: true
    });
    this.freezeChipContainer = this.add.container(0, 0, [this.freezeChip, this.freezeChipText]);
    this.freezeChipContainer.setAlpha(0);

    this.x5Chip = new Panel(this, 0, 0, 110, 32, {
      bgColor: THEME.colors.arcadeYellow,
      radius: 10
    });
    this.x5ChipText = new InkText(this, 0, 0, '★ 5x Score', {
      fontSize: '12px',
      color: THEME.colors.inkHex,
      isHud: true
    });
    this.x5ChipContainer = this.add.container(0, 0, [this.x5Chip, this.x5ChipText]);
    this.x5ChipContainer.setAlpha(0);

    this.headerContainer.add([this.freezeChipContainer, this.x5ChipContainer]);

    // Timer Row (Draining gauge bar and big digital countdown)
    this.timerContainer = this.add.container(0, 0);
    this.timerContainer.setDepth(25);
    this.timerGauge = new Gauge(this, 0, 0, 320, 24, {
      maxVal: 120,
      currentVal: 120,
      fillColor: THEME.colors.arcadeYellow,
      isCountdown: true,
      textFormat: (cur) => {
        const m = Math.floor(cur / 60);
        const s = Math.floor(cur % 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }
    });
    this.timerContainer.add(this.timerGauge);

    // 8x8 Board View
    this.boardView = new BoardView(this, this.cols, this.rows);

    // Hint line at bottom
    this.hintLine = new LocalizedText(this, 0, 0, 'timekill.hint', {}, {
      fontSize: '12px',
      color: THEME.colors.mutedGreyHex
    });

    // Input Manager
    this.inputManager = new InputManager({
      scene: this,
      onSwap: (move) => this.handleSwap(move),
      onPowerTap: (cell) => this.handlePowerTap(cell)
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
    AudioManager.playBgm('bgm.timekill');

    this.events.once('shutdown', () => {
      if (this.unsubLayout) this.unsubLayout();
      if (this.unsubSettings) this.unsubSettings();
      if (this.timerEvent) this.timerEvent.remove(false);
      this.tweens.killAll();
      this.boardView.clearSprites();
    });
  }

  handleSwap({ r1, c1, r2, c2 }) {
    if (this.boardView.isAnimating || this.engine.isGameOver) return;

    this.inputManager.setEnabled(false);
    this.boardView.setSelected(null);

    this.boardView.animateSwap(r1, c1, r2, c2, () => {
      const result = resolveMove(this.boardGrid, { r1, c1, r2, c2 }, rng, { isTimeKill: true });

      if (!result.valid) {
        // Penalty: -10s on wrong swap per Decision 5
        const pen = this.engine.onWrongSwap();
        this.boardView.animateRevert(r1, c1, r2, c2, () => {
          if (this.engine.isGameOver) {
            this.endGame();
          } else {
            this.inputManager.setEnabled(true);
          }
        });

        const p = this.boardView.getCellCoords(r1, c1);
        this.showFloatingNotice(p.x + this.boardView.x, p.y + this.boardView.y, '-10 s', THEME.colors.punchMagentaHex);

        if (pen.isGameOver) {
          this.endGame();
        }
        return;
      }

      this.boardGrid = result.grid;

      // Score and bonuses
      const summary = this.engine.onMoveResolved(result);
      if (summary) {
        SaveManager.update((s) => {
          recordClearedCandies(s, result.steps);
          checkAchievements(s);
        });
        this.scoreValue.setText(`${summary.totalScore}`);
        if (summary.isNewBest) {
          this.bestScoreValue.setText(`${summary.totalScore}`);
        }

        if (summary.timeBonus > 0) {
          const p = this.boardView.getCellCoords(r2, c2);
          this.showFloatingNotice(p.x + this.boardView.x, p.y + this.boardView.y, `+${summary.timeBonus} s`, THEME.colors.slimeGreenHex);
        }
      }

      this.boardView.animateSteps(
        result.steps,
        (step) => {
          // Candy destruction step
        },
        () => {
          if (result.reshuffled) {
            this.boardView.animateReshuffle(this.boardGrid, () => {
              if (this.engine.isGameOver) {
                this.endGame();
              } else {
                this.inputManager.setEnabled(true);
              }
            });
          } else {
            if (this.engine.isGameOver) {
              this.endGame();
            } else {
              this.inputManager.setEnabled(true);
            }
          }
        }
      );
    });
  }

  handlePowerTap(cell) {
    if (this.boardView.isAnimating || this.engine.isGameOver) return;

    const res = this.engine.triggerPowerUpAt(this.boardGrid, cell.r, cell.c);
    if (!res) return;

    AudioManager.playSfx('sfx.powerup');
    this.scoreValue.setText(`${res.totalScore}`);

    SaveManager.update((s) => {
      recordClearedCandies(s, [{ cleared: res.cleared }]);
      checkAchievements(s);
    });

    this.boardView.isAnimating = true;
    this.inputManager.setEnabled(false);

    // Trigger visual effects for the tapped powerup
    if (res.effects && res.effects.length > 0) {
      for (const eff of res.effects) {
        this.boardView.renderPowerEventFx(eff);
      }
    }

    this.boardView.animateSingleStep(
      {
        cleared: res.cleared,
        falls: res.falls,
        spawns: res.spawns,
        powerEvents: res.effects
      },
      () => {
        this.boardGrid = res.grid;
        this.boardView.initGrid(this.boardGrid, this.boardView.boardMetrics);
        this.boardView.isAnimating = false;
        if (this.engine.isGameOver) {
          this.endGame();
        } else {
          this.inputManager.setEnabled(true);
        }
      }
    );
  }

  update(time, delta) {
    if (this.currentPopup || this.engine.isGameOver) return;

    const deltaSec = delta / 1000;
    const tickRes = this.engine.tick(deltaSec);

    // Update gauge
    this.timerGauge.setValue(this.engine.timeLeft);

    // Active Chips
    if (this.engine.freezeRemaining > 0) {
      this.freezeChipContainer.setAlpha(1);
      this.freezeChipText.setText(`❄️ ${this.engine.freezeRemaining.toFixed(0)}s`);
    } else {
      this.freezeChipContainer.setAlpha(0);
    }

    if (this.engine.scoreMultRemaining > 0) {
      this.x5ChipContainer.setAlpha(1);
      this.x5ChipText.setText(`★ 5x ${this.engine.scoreMultRemaining.toFixed(0)}s`);
    } else {
      this.x5ChipContainer.setAlpha(0);
    }

    if (tickRes.isGameOver) {
      // If board is animating, let it finish and let animateSteps' onComplete call endGame
      if (!this.boardView.isAnimating) {
        this.endGame();
      }
    }

    if (!this.boardView.isAnimating) {
      this.boardView.setSelected(this.inputManager.selectedCell);
    }
  }

  endGame() {
    if (this.isEnding) return;
    this.isEnding = true;
    this.inputManager.setEnabled(false);
    this.time.delayedCall(400, () => {
      this.scene.start('Results', {
        score: this.engine.score,
        bestScore: this.engine.bestScore,
        isNewBest: this.engine.isNewBest
      });
    });
  }

  showFloatingNotice(x, y, text, color) {
    const txt = new InkText(this, x, y, text, {
      fontSize: '22px',
      color,
      isTitle: true
    });
    txt.setDepth(110);
    this.tweens.add({
      targets: txt,
      y: y - 45,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy()
    });
  }

  checkRestoreInput() {
    if (!this.currentPopup && !this.engine.isGameOver && !this.boardView.isAnimating) {
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

    const menuBtn = new Button(this, 0, 35, 200, 44, {
      text: t('common.menu'),
      bgColor: THEME.colors.playfieldTray,
      textColor: '#FFFFFF',
      fontSize: '16px',
      onClick: () => {
        popup.destroy();
        this.scene.start('MainMenu');
      }
    });

    d.add([resumeBtn, tutorialBtn, menuBtn]);
    this.currentPopup = popup;
  }

  applyLayout(layout) {
    const { width, height, isLandscape, uiScale, topBar, timeKill } = layout;
    this.topBar.updateLayout(width, topBar.height);

    const hZone = timeKill.header;
    this.headerContainer.setPosition(hZone.x + hZone.width / 2, hZone.y + hZone.height / 2);

    const cardW = Math.min(180 * uiScale, hZone.width * 0.32);
    const cardH = Math.min(65 * uiScale, hZone.height * 0.7);

    this.scoreCard.resize(cardW, cardH);
    this.scoreCard.setPosition(-cardW * 1.1, 0);
    this.scoreLabel.setPosition(-cardW * 1.1, -cardH * 0.25);
    this.scoreValue.setPosition(-cardW * 1.1, cardH * 0.18);

    this.bestScoreCard.resize(cardW, cardH);
    this.bestScoreCard.setPosition(cardW * 1.1, 0);
    this.bestScoreLabel.setPosition(cardW * 1.1, -cardH * 0.25);
    this.bestScoreValue.setPosition(cardW * 1.1, cardH * 0.18);

    // Active effect chips in center
    this.freezeChipContainer.setPosition(-60, 0);
    this.x5ChipContainer.setPosition(60, 0);

    // Timer Row
    const tZone = timeKill.timer;
    const timerY = tZone ? (tZone.y + tZone.height / 2) : (hZone.y + hZone.height + 16);
    const timerH = tZone ? Math.max(20, Math.min(26, tZone.height)) : 24;
    this.timerContainer.setPosition(width / 2, timerY);
    this.timerGauge.resize(Math.min(width * 0.70, 360 * uiScale), timerH);

    // 8x8 Board Placement
    const metrics = LayoutManager.computeBoardMetrics(this.cols, this.rows, timeKill.board);
    if (!this.boardView.boardMetrics) {
      this.boardView.initGrid(this.boardGrid, metrics);
    } else {
      this.boardView.updateMetrics(metrics);
    }
    this.inputManager.setBoardMetrics(metrics);

    // Hint line at bottom
    this.hintLine.setPosition(width / 2, height - 18);

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

