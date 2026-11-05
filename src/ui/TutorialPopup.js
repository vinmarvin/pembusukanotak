// src/ui/TutorialPopup.js
// Replayble 3-step tutorial popup that can be opened anywhere, including during gameplay.
import { THEME } from '../config/theme.config.js';
import { Popup } from './Popup.js';
import { Button } from './Button.js';
import { InkText } from './InkText.js';
import { AudioManager } from '../systems/AudioManager.js';
import { SaveManager } from '../systems/SaveManager.js';
import { TutorialIllustration } from './TutorialIllustrations.js';
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
        this.stopIllustration();
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

    // Update illustration (animated, shared with the other tutorial entry point)
    if (this.illustration) this.illustration.destroy();
    this.illusContainer.removeAll(true);
    this.illustration = new TutorialIllustration(scene, this.illusContainer, this.step, { pw: pw, ph: ph });

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
      this.close();
    }
  }

  stopIllustration() {
    if (this.illustration) {
      this.illustration.destroy();
      this.illustration = null;
    }
  }

  close() {
    AudioManager.playSfx('sfx.click');
    this.stopIllustration();
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
    this.stopIllustration();
    if (this.popup) {
      this.popup.destroy();
    }
  }
}

