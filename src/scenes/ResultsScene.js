// src/scenes/ResultsScene.js
// Time Kill run results screen showing score, best score, new best badge, and replay options.
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';
import { TopBar } from '../ui/TopBar.js';
import { Panel } from '../ui/Panel.js';
import { Button } from '../ui/Button.js';
import { InkText } from '../ui/InkText.js';
import { LocalizedText } from '../ui/LocalizedText.js';
import { AudioManager } from '../systems/AudioManager.js';
import { t } from '../i18n/index.js';

export class ResultsScene extends Phaser.Scene {
  constructor() {
    super('Results');
  }

  init(data) {
    this.score = data.score || 0;
    this.bestScore = data.bestScore || 0;
    this.isNewBest = data.isNewBest || false;
    // 'timeKill' (default) or 'bossRush' (score = bosses defeated)
    this.mode = data.mode === 'bossRush' ? 'bossRush' : 'timeKill';
  }

  key(name) {
    return this.mode === 'bossRush' ? `results.bossRush.${name}` : `results.${name}`;
  }

  create() {
    AudioManager.playSfx(this.isNewBest ? 'sfx.win' : 'sfx.hit');

    const w = this.scale.width;
    const h = this.scale.height;

    this.topBar = new TopBar(this, {
      showMenuBtn: true,
      onMenuClick: () => this.scene.start('MainMenu')
    });

    const pw = Math.min(w * 0.88, 420);
    const ph = Math.min(h * 0.78, 360);

    this.dialog = this.add.container(w / 2, h / 2 + 20);
    this.panel = new Panel(this, 0, 0, pw, ph, {
      bgColor: THEME.colors.cardBg,
      outlineColor: THEME.colors.arcadeYellow,
      radius: THEME.depth.panelRadius
    });
    this.dialog.add(this.panel);

    // Title
    this.title = new InkText(this, 0, -ph * 0.36, t(this.key('title')), {
      fontSize: '28px',
      color: THEME.colors.arcadeYellowHex,
      isTitle: true
    });

    if (this.isNewBest) {
      // New Best Badge (prominent, distinctly placed above the score label)
      this.newBestBadge = new Panel(this, 0, -ph * 0.22, 160, 32, {
        bgColor: THEME.colors.punchMagenta,
        outlineColor: THEME.colors.ink,
        outlineWidth: 2,
        radius: 10
      });
      this.newBestText = new LocalizedText(this, 0, -ph * 0.22, 'results.newBest', {}, {
        fontSize: '13px',
        color: '#FFFFFF',
        isHud: true
      });
      this.dialog.add([this.newBestBadge, this.newBestText]);

      // Score Label & Score Value (positioned with clear separation below the badge)
      this.scoreLabel = new LocalizedText(this, 0, -ph * 0.10, this.key('score'), {}, {
        fontSize: '14px',
        color: '#CCCCCC',
        isHud: true
      });
      this.scoreValue = new InkText(this, 0, ph * 0.02, `${this.score}`, {
        fontSize: '38px',
        color: THEME.colors.slimeGreenHex,
        isTitle: true
      });
    } else {
      // Score Label & Score Value (standard spacing when not new best)
      this.scoreLabel = new LocalizedText(this, 0, -ph * 0.16, this.key('score'), {}, {
        fontSize: '14px',
        color: '#CCCCCC',
        isHud: true
      });
      this.scoreValue = new InkText(this, 0, -ph * 0.03, `${this.score}`, {
        fontSize: '38px',
        color: THEME.colors.slimeGreenHex,
        isTitle: true
      });
    }

    // Best Score
    this.bestScoreText = new LocalizedText(this, 0, ph * 0.13, this.key('bestScore'), {}, {
      fontSize: '13px',
      color: THEME.colors.mutedGreyHex,
      isHud: true
    });
    this.bestScoreNum = new InkText(this, 0, ph * 0.20, `${this.bestScore}`, {
      fontSize: '20px',
      color: THEME.colors.arcadeYellowHex,
      isHud: true
    });

    // Action Buttons
    const btnW = 160;
    const btnY = ph * 0.34;

    this.replayBtn = new Button(this, -btnW * 0.55, btnY, btnW, 46, {
      text: t('results.playAgain'),
      bgColor: THEME.colors.slimeGreen,
      textColor: '#FFFFFF',
      fontSize: '16px',
      onClick: () => this.scene.start(this.mode === 'bossRush' ? 'Battle' : 'TimeKill', this.mode === 'bossRush' ? { mode: 'bossRush' } : undefined)
    });

    this.menuBtn = new Button(this, btnW * 0.55, btnY, btnW, 46, {
      text: t('results.menu'),
      bgColor: THEME.colors.playfieldTray,
      textColor: '#FFFFFF',
      fontSize: '16px',
      onClick: () => this.scene.start('MainMenu')
    });

    this.dialog.add([
      this.title,
      this.scoreLabel,
      this.scoreValue,
      this.bestScoreText,
      this.bestScoreNum,
      this.replayBtn,
      this.menuBtn
    ]);
  }
}

