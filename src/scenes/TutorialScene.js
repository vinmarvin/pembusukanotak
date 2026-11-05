// src/scenes/TutorialScene.js
// First-launch and replayable 3-step tutorial matching UI_SPEC section 5.
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';
import { TopBar } from '../ui/TopBar.js';
import { Panel } from '../ui/Panel.js';
import { Button } from '../ui/Button.js';
import { InkText } from '../ui/InkText.js';
import { LocalizedText } from '../ui/LocalizedText.js';
import { LayoutManager } from '../systems/LayoutManager.js';
import { AudioManager } from '../systems/AudioManager.js';
import { SaveManager } from '../systems/SaveManager.js';
import { EventBus } from '../systems/EventBus.js';
import { TutorialIllustration } from '../ui/TutorialIllustrations.js';
import { t } from '../i18n/index.js';

export class TutorialScene extends Phaser.Scene {
  constructor() {
    super('Tutorial');
    this.step = 0; // 0, 1, 2
  }

  init(data) {
    this.fromSettings = data?.fromSettings || false;
    this.step = 0;
  }

  create() {
    AudioManager.playBgm('bgm.menu');

    this.topBar = new TopBar(this, {
      showMenuBtn: false
    });

    this.container = this.add.container(0, 0);

    this.unsubLayout = EventBus.on('layout:changed', (layout) => {
      this.applyLayout(layout);
    });

    this.unsubLang = EventBus.on('language:changed', () => {
      this.renderStep();
    });

    this.applyLayout(LayoutManager.getLayout());

    this.events.once('shutdown', () => {
      if (this.unsubLayout) this.unsubLayout();
      if (this.unsubLang) this.unsubLang();
      if (this.illustration) {
        this.illustration.destroy();
        this.illustration = null;
      }
    });
  }

  applyLayout(layout) {
    const { width, height } = layout;
    this.topBar.updateLayout(width, 64);

    if (this.illustration) {
      this.illustration.destroy();
      this.illustration = null;
    }
    this.container.removeAll(true);

    const pw = Math.min(width * 0.9, 500);
    const ph = Math.min(height * 0.82, 460);
    this.pw = pw;
    this.ph = ph;

    this.dialog = this.add.container(width / 2, height / 2 + 20);

    this.panel = new Panel(this, 0, 0, pw, ph, {
      bgColor: THEME.colors.cardBg,
      outlineColor: THEME.colors.electricCyan,
      radius: THEME.depth.panelRadius
    });
    this.dialog.add(this.panel);

    // Step dots indicator
    this.dotsContainer = this.add.container(0, -ph * 0.38);
    this.dots = [];
    for (let i = 0; i < 3; i++) {
      const dot = this.add.graphics();
      dot.setPosition((i - 1) * 30, 0);
      this.dots.push(dot);
      this.dotsContainer.add(dot);
    }
    this.dialog.add(this.dotsContainer);

    // Visual illustration container
    this.illusContainer = this.add.container(0, -ph * 0.12);
    this.dialog.add(this.illusContainer);

    // Title
    this.titleText = new InkText(this, 0, ph * 0.12, '', {
      fontSize: '22px',
      color: THEME.colors.arcadeYellowHex,
      isTitle: true
    });
    this.titleText.setWordWrapWidth(pw - 50);

    // Description
    this.descText = this.add.text(0, ph * 0.23, '', {
      fontFamily: THEME.fonts.body,
      fontSize: '14px',
      color: '#FFFFFF',
      align: 'center',
      wordWrap: { width: pw - 60 },
      lineSpacing: 4
    });
    this.descText.setOrigin(0.5);

    // Buttons
    this.skipBtn = new Button(this, -pw * 0.26, ph * 0.37, 130, 44, {
      text: t('tutorial.skip'),
      bgColor: THEME.colors.playfieldTray,
      textColor: '#DDDDDD',
      fontSize: '13px',
      radius: 12,
      onClick: () => this.completeTutorial()
    });

    this.nextBtn = new Button(this, pw * 0.26, ph * 0.37, 130, 44, {
      text: t('common.next'),
      bgColor: THEME.colors.slimeGreen,
      textColor: '#FFFFFF',
      fontSize: '16px',
      radius: 12,
      onClick: () => this.advanceStep()
    });

    this.dialog.add([this.titleText, this.descText, this.skipBtn, this.nextBtn]);
    this.container.add(this.dialog);

    this.renderStep();
  }

  renderStep() {
    // Update dots
    for (let i = 0; i < 3; i++) {
      const dot = this.dots[i];
      dot.clear();
      if (i === this.step) {
        dot.fillStyle(THEME.colors.arcadeYellow, 1);
        dot.fillCircle(0, 0, 8);
        dot.lineStyle(2, THEME.colors.ink, 1);
        dot.strokeCircle(0, 0, 8);
      } else {
        dot.fillStyle(THEME.colors.mutedGrey, 0.6);
        dot.fillCircle(0, 0, 6);
      }
    }

    // Update illustration (animated, shared with the other tutorial entry point)
    if (this.illustration) this.illustration.destroy();
    this.illusContainer.removeAll(true);
    this.illustration = new TutorialIllustration(this, this.illusContainer, this.step, { pw: this.pw, ph: this.ph });

    const keys = ['step1', 'step2', 'step3'];
    this.titleText.setText(t(`tutorial.${keys[this.step]}.title`));
    this.descText.setText(t(`tutorial.${keys[this.step]}.desc`));
    this.nextBtn.setText(this.step < 2 ? t('common.next') : t('tutorial.gotIt'));
  }

  advanceStep() {
    AudioManager.playSfx('sfx.click');
    if (this.step < 2) {
      this.step++;
      this.renderStep();
    } else {
      this.completeTutorial();
    }
  }

  completeTutorial() {
    AudioManager.playSfx('sfx.click');
    SaveManager.update((s) => {
      s.tutorialSeen = true;
    });

    if (this.fromSettings) {
      this.scene.start('MainMenu');
    } else {
      this.scene.start('MainMenu');
    }
  }


}

