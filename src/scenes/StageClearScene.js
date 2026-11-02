// src/scenes/StageClearScene.js
// Stage clear reward screen showing upgrades before and after, retry, next, and menu.
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';
import { TopBar } from '../ui/TopBar.js';
import { Panel } from '../ui/Panel.js';
import { Button } from '../ui/Button.js';
import { InkText } from '../ui/InkText.js';
import { LocalizedText } from '../ui/LocalizedText.js';
import { AudioManager } from '../systems/AudioManager.js';
import { StoryProgression } from '../core/progression/story.js';
import { statsForStage } from '../core/combat/stats.js';
import { t } from '../i18n/index.js';

export class StageClearScene extends Phaser.Scene {
  constructor() {
    super('StageClear');
  }

  init(data) {
    this.stage = data.stage || 1;
  }

  create() {
    AudioManager.playSfx('sfx.win');

    // Update progression and persistence
    StoryProgression.onStageCleared(this.stage);

    const w = this.scale.width;
    const h = this.scale.height;

    this.topBar = new TopBar(this, {
      showMenuBtn: true,
      onMenuClick: () => this.scene.start('StageSelect')
    });

    // Panel Dialog
    const pw = Math.min(w * 0.88, 440);
    const ph = Math.min(h * 0.8, 380);

    this.dialog = this.add.container(w / 2, h / 2 + 20);
    this.panel = new Panel(this, 0, 0, pw, ph, {
      bgColor: THEME.colors.cardBg,
      outlineColor: THEME.colors.slimeGreen,
      radius: THEME.depth.panelRadius
    });
    this.dialog.add(this.panel);

    // Title
    this.title = new InkText(this, 0, -ph * 0.35, t('stageclear.title'), {
      fontSize: '26px',
      color: THEME.colors.slimeGreenHex,
      isTitle: true
    });

    const beforeStats = statsForStage(this.stage);
    const afterStats = statsForStage(Math.min(5, this.stage + 1));

    // Upgrades
    this.hpUpgrade = new LocalizedText(this, 0, -ph * 0.15, 'stageclear.hpUpgrade', {
      before: beforeStats.maxHp,
      after: afterStats.maxHp
    }, {
      fontSize: '16px',
      color: THEME.colors.arcadeYellowHex,
      isHud: true
    });

    this.atkUpgrade = new LocalizedText(this, 0, -ph * 0.03, 'stageclear.atkUpgrade', {
      before: beforeStats.attack,
      after: afterStats.attack
    }, {
      fontSize: '16px',
      color: THEME.colors.electricCyanHex,
      isHud: true
    });

    // Meme Book Unlocked Toast
    this.memeToast = new LocalizedText(this, 0, ph * 0.1, 'stageclear.memeUnlocked', {}, {
      fontSize: '13px',
      color: THEME.colors.punchMagentaHex,
      isHud: true
    });

    // Action Buttons
    const btnW = 160;
    const btnY = ph * 0.3;

    if (this.stage < 5) {
      this.nextBtn = new Button(this, -btnW * 0.55, btnY, btnW, 46, {
        text: t('stageclear.nextStage'),
        bgColor: THEME.colors.slimeGreen,
        textColor: '#FFFFFF',
        fontSize: '16px',
        onClick: () => {
          this.scene.start('StoryText', {
            key: `story.area${this.stage + 1}`,
            nextScene: 'Battle',
            nextSceneData: { stage: this.stage + 1 }
          });
        }
      });
      this.dialog.add(this.nextBtn);

      this.retryBtn = new Button(this, btnW * 0.55, btnY, btnW, 46, {
        text: t('stageclear.retry'),
        bgColor: THEME.colors.playfieldTray,
        textColor: '#FFFFFF',
        fontSize: '16px',
        onClick: () => this.scene.start('Battle', { stage: this.stage })
      });
      this.dialog.add(this.retryBtn);
    } else {
      // Completed Stage 5!
      this.endingBtn = new Button(this, 0, btnY, 220, 48, {
        text: 'SEE ENDING',
        bgColor: THEME.colors.arcadeYellow,
        textColor: '#FFFFFF',
        fontSize: '18px',
        onClick: () => {
          this.scene.start('StoryText', {
            key: 'story.ending',
            nextScene: 'MainMenu',
            nextSceneData: {}
          });
        }
      });
      this.dialog.add(this.endingBtn);
    }

    this.dialog.add([this.title, this.hpUpgrade, this.atkUpgrade, this.memeToast]);
  }
}

