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
import { AssetResolver } from '../systems/AssetResolver.js';
import { EventBus } from '../systems/EventBus.js';
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
    });
  }

  applyLayout(layout) {
    const { width, height } = layout;
    this.topBar.updateLayout(width, 64);

    this.container.removeAll(true);

    const pw = Math.min(width * 0.9, 500);
    const ph = Math.min(height * 0.82, 460);

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

    // Update illustration
    this.illusContainer.removeAll(true);

    if (this.step === 0) {
      // Step 1: Match 3 candies in a row
      const candyTypes = [0, 0, 0];
      candyTypes.forEach((type, idx) => {
        const tex = AssetResolver.getCandyKey(this, type);
        const spr = this.add.sprite((idx - 1) * 70, 0, tex);
        spr.setDisplaySize(56, 56);
        this.illusContainer.add(spr);
      });
      // Swap hint arrow
      const arrow = this.add.text(105, 0, '↔️', { fontSize: '28px' }).setOrigin(0.5);
      this.illusContainer.add(arrow);

      this.titleText.setText(t('tutorial.step1.title'));
      this.descText.setText(t('tutorial.step1.desc'));
      this.nextBtn.setText(t('common.next'));
    } else if (this.step === 1) {
      // Step 2: Damage combat
      const candyTex = AssetResolver.getCandyKey(this, 1);
      const candySpr = this.add.sprite(-80, 0, candyTex);
      candySpr.setDisplaySize(56, 56);

      const hitArrow = this.add.text(-20, 0, '💥 ➔', { fontSize: '24px' }).setOrigin(0.5);

      const minionTex = AssetResolver.getMinionKey(this, 'small');
      const minionSpr = this.add.sprite(70, 0, minionTex);
      minionSpr.setDisplaySize(64, 64);

      const dmgNum = this.add.text(70, -35, '-15', {
        fontFamily: THEME.fonts.hud,
        fontSize: '20px',
        color: THEME.colors.slimeGreenHex,
        stroke: THEME.colors.inkHex,
        strokeThickness: 3
      }).setOrigin(0.5);

      this.illusContainer.add([candySpr, hitArrow, minionSpr, dmgNum]);

      this.titleText.setText(t('tutorial.step2.title'));
      this.descText.setText(t('tutorial.step2.desc'));
      this.nextBtn.setText(t('common.next'));
    } else {
      // Step 3: Enemy countdown and Boss effects
      const bossTex = AssetResolver.getBossKey(this, 'b1');
      const bossSpr = this.add.sprite(0, -15, bossTex);
      bossSpr.setDisplaySize(72, 72);

      const warnBg = this.add.graphics();
      warnBg.fillStyle(THEME.colors.punchMagenta, 1);
      warnBg.fillRoundedRect(-90, 35, 180, 24, 6);
      warnBg.lineStyle(2, THEME.colors.ink, 1);
      warnBg.strokeRoundedRect(-90, 35, 180, 24, 6);

      const warnText = this.add.text(0, 47, '⏱️ ATTACK: 03.0s', {
        fontFamily: THEME.fonts.hud,
        fontSize: '12px',
        color: '#FFFFFF'
      }).setOrigin(0.5);

      this.illusContainer.add([bossSpr, warnBg, warnText]);

      this.titleText.setText(t('tutorial.step3.title'));
      this.descText.setText(t('tutorial.step3.desc'));
      this.nextBtn.setText(t('tutorial.gotIt'));
    }
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

