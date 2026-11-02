// src/ui/Popup.js
// Modal popup dialog with dimmed backdrop and animated entrance.
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';
import { Panel } from './Panel.js';
import { InkText } from './InkText.js';
import { Button } from './Button.js';
import { AudioManager } from '../systems/AudioManager.js';

export class Popup extends Phaser.GameObjects.Container {
  constructor(scene, width, height, options = {}) {
    const sw = scene.scale.width;
    const sh = scene.scale.height;
    super(scene, 0, 0);

    this.options = {
      title: options.title || '',
      showCloseBtn: options.showCloseBtn ?? true,
      onClose: options.onClose || null,
      ...options
    };

    // Dimmed backdrop
    this.backdrop = scene.add.rectangle(sw / 2, sh / 2, sw, sh, 0x000000, 0.65);
    this.backdrop.setInteractive(); // Blocks input behind popup
    this.add(this.backdrop);

    // Modal dialog container
    this.dialog = scene.add.container(sw / 2, sh / 2);
    this.panel = new Panel(scene, 0, 0, width, height, {
      bgColor: THEME.colors.cardBg,
      radius: THEME.depth.panelRadius
    });
    this.dialog.add(this.panel);

    // Title
    if (this.options.title) {
      this.titleText = new InkText(scene, 0, -height / 2 + 36, this.options.title, {
        fontSize: '24px',
        color: THEME.colors.arcadeYellowHex,
        isTitle: true
      });
      this.dialog.add(this.titleText);
    }

    // Close button (X) top right
    if (this.options.showCloseBtn) {
      this.closeBtn = new Button(scene, width / 2 - 28, -height / 2 + 28, 44, 44, {
        text: '✕',
        bgColor: THEME.colors.punchMagenta,
        fontSize: '20px',
        radius: 22,
        onClick: () => this.close()
      });
      this.dialog.add(this.closeBtn);
    }

    this.add(this.dialog);

    this.setDepth(100);
    this.animateOpen();
    scene.add.existing(this);
  }

  animateOpen() {
    this.dialog.setScale(0.85);
    this.dialog.setAlpha(0);
    this.scene.tweens.add({
      targets: this.dialog,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 180,
      ease: 'Back.easeOut'
    });
  }

  close() {
    AudioManager.playSfx('sfx.click');
    this.scene.tweens.add({
      targets: this.dialog,
      scaleX: 0.85,
      scaleY: 0.85,
      alpha: 0,
      duration: 140,
      ease: 'Sine.easeIn',
      onComplete: () => {
        if (this.options.onClose) {
          this.options.onClose();
        }
        this.destroy();
      }
    });
  }

  reposition(sw, sh) {
    this.backdrop.setPosition(sw / 2, sh / 2);
    this.backdrop.setSize(sw, sh);
    this.dialog.setPosition(sw / 2, sh / 2);
  }
}

