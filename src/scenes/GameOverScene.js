// src/scenes/GameOverScene.js
// Game Over screen allowing the player to retry the stage or return to menu.
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';
import { TopBar } from '../ui/TopBar.js';
import { Panel } from '../ui/Panel.js';
import { Button } from '../ui/Button.js';
import { InkText } from '../ui/InkText.js';
import { LocalizedText } from '../ui/LocalizedText.js';
import { AudioManager } from '../systems/AudioManager.js';
import { StoryProgression } from '../core/progression/story.js';
import { t } from '../i18n/index.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  init(data) {
    this.stage = data.stage || 1;
    this.mode = data.mode === 'hard' ? 'hard' : 'normal';
  }

  create() {
    AudioManager.playSfx('sfx.lose');
    if (this.mode === 'normal') StoryProgression.onGameOver();

    const w = this.scale.width;
    const h = this.scale.height;

    this.topBar = new TopBar(this, {
      showMenuBtn: true,
      onMenuClick: () => this.scene.start('MainMenu')
    });

    const pw = Math.min(w * 0.88, 400);
    const ph = Math.min(h * 0.75, 320);

    this.dialog = this.add.container(w / 2, h / 2 + 20);
    this.panel = new Panel(this, 0, 0, pw, ph, {
      bgColor: THEME.colors.cardBg,
      outlineColor: THEME.colors.punchMagenta,
      radius: THEME.depth.panelRadius
    });
    this.dialog.add(this.panel);

    this.title = new InkText(this, 0, -ph * 0.32, t('gameover.title'), {
      fontSize: '24px',
      color: THEME.colors.punchMagentaHex,
      isTitle: true
    });

    this.sub = new LocalizedText(this, 0, -ph * 0.1, 'gameover.subtitle', {}, {
      fontSize: '15px',
      color: '#FFFFFF'
    });

    const btnW = 160;
    const btnY = ph * 0.25;

    this.retryBtn = new Button(this, -btnW * 0.55, btnY, btnW, 46, {
      text: t('gameover.retry'),
      bgColor: THEME.colors.slimeGreen,
      textColor: '#FFFFFF',
      fontSize: '16px',
      onClick: () => {
        // Decision 8: restart current stage from its first enemy
        this.scene.start('Battle', { stage: this.stage, mode: this.mode });
      }
    });

    this.menuBtn = new Button(this, btnW * 0.55, btnY, btnW, 46, {
      text: t('gameover.menu'),
      bgColor: THEME.colors.playfieldTray,
      textColor: '#FFFFFF',
      fontSize: '16px',
      onClick: () => this.scene.start('MainMenu')
    });

    this.dialog.add([this.title, this.sub, this.retryBtn, this.menuBtn]);
  }
}

