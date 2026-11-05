// src/ui/TutorialPopup.js
// Per-mode tutorial popup (Story or Time Kill). Opened automatically the first time a mode is
// played, and from that mode's pause menu ("How to play"). The game behind it is paused by the
// owning scene while the popup is open.
import { THEME } from '../config/theme.config.js';
import { TUTORIALS_CONFIG, tutorialParams } from '../config/tutorials.config.js';
import { Popup } from './Popup.js';
import { Button } from './Button.js';
import { InkText } from './InkText.js';
import { TutorialIllustration } from './TutorialIllustrations.js';
import { AudioManager } from '../systems/AudioManager.js';
import { SaveManager } from '../systems/SaveManager.js';
import { markTutorialSeen } from '../core/tutorials.js';
import { t } from '../i18n/index.js';

export class TutorialPopup {
  /**
   * @param {Phaser.Scene} scene
   * @param {{ mode?: 'story'|'timeKill', onClose?: Function }} options
   */
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = options;
    this.mode = TUTORIALS_CONFIG[options.mode] ? options.mode : 'story';
    this.cfg = TUTORIALS_CONFIG[this.mode];
    this.steps = this.cfg.steps;
    this.step = 0;
    this.params = tutorialParams();

    const pw = Math.min(scene.scale.width * 0.9, 480);
    const ph = Math.min(scene.scale.height * 0.9, 460);
    this.pw = pw;
    this.ph = ph;

    this.popup = new Popup(scene, pw, ph, {
      title: t(this.cfg.titleKey),
      onClose: () => {
        // Any way out (Got it, Skip, X) counts as seen
        this.stopIllustration();
        SaveManager.update((s) => markTutorialSeen(s, this.mode));
        if (options.onClose) options.onClose();
      }
    });

    const d = this.popup.dialog;

    // Fixed rows: dots under the popup title, buttons at the bottom.
    // Step title + description are measured and stacked above the buttons; the art fills the rest.
    this.dotsY = -ph / 2 + 70;
    this.btnY = ph / 2 - 34;

    this.dotsContainer = scene.add.container(0, this.dotsY);
    this.dots = this.steps.map((_, i) => {
      const dot = scene.add.graphics();
      dot.setPosition((i - (this.steps.length - 1) / 2) * 26, 0);
      this.dotsContainer.add(dot);
      return dot;
    });
    d.add(this.dotsContainer);

    this.illusContainer = scene.add.container(0, 0);
    d.add(this.illusContainer);

    this.titleText = new InkText(scene, 0, 0, '', {
      fontSize: '20px',
      color: THEME.colors.arcadeYellowHex,
      isTitle: true
    });
    this.titleText.setWordWrapWidth(pw - 50);

    this.descText = scene.add.text(0, 0, '', {
      fontFamily: THEME.fonts.body,
      fontSize: '14px',
      color: '#FFFFFF',
      align: 'center',
      wordWrap: { width: pw - 48 },
      lineSpacing: 3
    });
    this.descText.setOrigin(0.5, 0);

    const btnW = Math.min(130, (pw - 60) / 2);
    this.skipBtn = new Button(scene, -pw * 0.25, this.btnY, btnW, 44, {
      text: t('tutorial.skip'),
      bgColor: THEME.colors.playfieldTray,
      textColor: '#DDDDDD',
      fontSize: '13px',
      radius: 12,
      onClick: () => this.close()
    });

    this.nextBtn = new Button(scene, pw * 0.25, this.btnY, btnW, 44, {
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
    const last = this.steps.length - 1;
    const stepCfg = this.steps[this.step];

    this.dots.forEach((dot, i) => {
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
    });

    // Text first, so its real height decides how much room the art gets
    this.titleText.setText(t(`${stepCfg.key}.title`, this.params));
    this.descText.setText(t(`${stepCfg.key}.desc`, this.params));
    this.descText.setFontSize('14px');
    const btnTop = this.btnY - 22;
    const minArt = 80;
    const fits = () => {
      const textH = this.titleText.height + 6 + this.descText.height;
      return btnTop - 10 - textH - (this.dotsY + 14) >= minArt;
    };
    if (!fits()) this.descText.setFontSize('13px');
    if (!fits()) this.descText.setFontSize('12px');

    const descTop = btnTop - 10 - this.descText.height;
    this.descText.setPosition(0, descTop);
    this.titleText.setPosition(0, descTop - 6 - this.titleText.height / 2);

    const artTop = this.dotsY + 14;
    const artBottom = descTop - 6 - this.titleText.height - 8;
    const artH = Math.max(minArt, artBottom - artTop);
    this.illusContainer.setPosition(0, artTop + artH / 2);

    this.stopIllustration();
    this.illusContainer.removeAll(true);
    this.illustration = new TutorialIllustration(scene, this.illusContainer, stepCfg.art, { pw, ph, artH });

    this.nextBtn.setText(this.step < last ? t('common.next') : t('tutorial.gotIt'));
  }

  advanceStep() {
    AudioManager.playSfx('sfx.click');
    if (this.step < this.steps.length - 1) {
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
