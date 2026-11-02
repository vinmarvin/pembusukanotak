// src/ui/TutorialPopup.js
// Replayble 3-step tutorial popup that can be opened anywhere, including during gameplay.
import { THEME } from '../config/theme.config.js';
import { Popup } from './Popup.js';
import { Button } from './Button.js';
import { InkText } from './InkText.js';
import { AssetResolver } from '../systems/AssetResolver.js';
import { AudioManager } from '../systems/AudioManager.js';
import { SaveManager } from '../systems/SaveManager.js';
import { t } from '../i18n/index.js';

export class TutorialPopup {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = options;
    this.step = 0;

    const pw = Math.min(scene.scale.width * 0.9, 480);
    const ph = Math.min(scene.scale.height * 0.85, 460);
    this.pw = pw;
    this.ph = ph;

    this.popup = new Popup(scene, pw, ph, {
      title: t('tutorial.title') || 'Tutorial',
      onClose: () => {
        if (options.onClose) options.onClose();
      }
    });

    const d = this.popup.dialog;

    // Step dots indicator
    this.dotsContainer = scene.add.container(0, -ph * 0.36);
    this.dots = [];
    for (let i = 0; i < 3; i++) {
      const dot = scene.add.graphics();
      dot.setPosition((i - 1) * 28, 0);
      this.dots.push(dot);
      this.dotsContainer.add(dot);
    }
    d.add(this.dotsContainer);

    // Visual illustration container
    this.illusContainer = scene.add.container(0, -ph * 0.12);
    d.add(this.illusContainer);

    // Title
    this.titleText = new InkText(scene, 0, ph * 0.12, '', {
      fontSize: '20px',
      color: THEME.colors.arcadeYellowHex,
      isTitle: true
    });
    this.titleText.setWordWrapWidth(pw - 50);

    // Description
    this.descText = scene.add.text(0, ph * 0.23, '', {
      fontFamily: THEME.fonts.body,
      fontSize: '13px',
      color: '#FFFFFF',
      align: 'center',
      wordWrap: { width: pw - 60 },
      lineSpacing: 4
    });
    this.descText.setOrigin(0.5);

    // Buttons
    this.skipBtn = new Button(scene, -pw * 0.25, ph * 0.37, 120, 44, {
      text: t('tutorial.skip'),
      bgColor: THEME.colors.playfieldTray,
      textColor: '#DDDDDD',
      fontSize: '13px',
      radius: 12,
      onClick: () => this.close()
    });

    this.nextBtn = new Button(scene, pw * 0.25, ph * 0.37, 120, 44, {
      text: t('common.next'),
      bgColor: THEME.colors.slimeGreen,
      textColor: '#FFFFFF',
      fontSize: '15px',
      radius: 12,
      onClick: () => this.advanceStep()
    });

    d.add([this.titleText, this.descText, this.skipBtn, this.nextBtn]);

    this.renderStep();
  }

  renderStep() {
    const { scene, pw, ph } = this;

    // Update dots
    for (let i = 0; i < 3; i++) {
      const dot = this.dots[i];
      dot.clear();
      if (i === this.step) {
        dot.fillStyle(THEME.colors.arcadeYellow, 1);
        dot.fillCircle(0, 0, 7);
        dot.lineStyle(2, THEME.colors.ink, 1);
        dot.strokeCircle(0, 0, 7);
      } else {
        dot.fillStyle(THEME.colors.mutedGrey, 0.6);
        dot.fillCircle(0, 0, 5);
      }
    }

    // Update illustration
    this.illusContainer.removeAll(true);

    if (this.step === 0) {
      // Step 1: Match 3 candies in a row
      const candyTypes = [0, 0, 0];
      candyTypes.forEach((type, idx) => {
        const tex = AssetResolver.getCandyKey(scene, type);
        const spr = scene.add.sprite((idx - 1) * 64, 0, tex);
        spr.setDisplaySize(52, 52);
        this.illusContainer.add(spr);
      });
      // Swap hint arrow
      const arrow = scene.add.text(96, 0, '↔️', { fontSize: '26px' }).setOrigin(0.5);
      this.illusContainer.add(arrow);

      this.titleText.setText(t('tutorial.step1.title'));
      this.descText.setText(t('tutorial.step1.desc'));
      this.nextBtn.setText(t('common.next'));
    } else if (this.step === 1) {
      // Step 2: Damage combat
      const candyTex = AssetResolver.getCandyKey(scene, 1);
      const candySpr = scene.add.sprite(-75, 0, candyTex);
      candySpr.setDisplaySize(52, 52);

      const hitArrow = scene.add.text(-20, 0, '💥 ➔', { fontSize: '22px' }).setOrigin(0.5);

      const minionTex = AssetResolver.getMinionKey(scene, 'small');
      const minionSpr = scene.add.sprite(65, 0, minionTex);
      minionSpr.setDisplaySize(58, 58);

      const dmgNum = scene.add.text(65, -32, '-15', {
        fontFamily: THEME.fonts.hud,
        fontSize: '18px',
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
      const bossTex = AssetResolver.getBossKey(scene, 'b1');
      const bossSpr = scene.add.sprite(0, -15, bossTex);
      bossSpr.setDisplaySize(68, 68);

      const warnBg = scene.add.graphics();
      warnBg.fillStyle(THEME.colors.punchMagenta, 1);
      warnBg.fillRoundedRect(-85, 30, 170, 24, 6);
      warnBg.lineStyle(2, THEME.colors.ink, 1);
      warnBg.strokeRoundedRect(-85, 30, 170, 24, 6);

      const warnText = scene.add.text(0, 42, '⏱️ ATTACK: 03.0s', {
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
      this.close();
    }
  }

  close() {
    AudioManager.playSfx('sfx.click');
    SaveManager.update((s) => {
      s.tutorialSeen = true;
    });
    this.popup.close();
  }

  reposition(sw, sh) {
    if (this.popup) {
      this.popup.reposition(sw, sh);
    }
  }

  destroy() {
    if (this.popup) {
      this.popup.destroy();
    }
  }
}

