// src/ui/TopBar.js
// Universal top bar showing title, sound toggle, settings, and optional back-to-menu button.
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';
import { InkText } from './InkText.js';
import { LocalizedText } from './LocalizedText.js';
import { Button } from './Button.js';
import { AudioManager } from '../systems/AudioManager.js';
import { EventBus } from '../systems/EventBus.js';

export class TopBar extends Phaser.GameObjects.Container {
  constructor(scene, options = {}) {
    super(scene, 0, 0);
    this.options = {
      showMenuBtn: options.showMenuBtn ?? false,
      onMenuClick: options.onMenuClick || null,
      onSettingsClick: options.onSettingsClick || null,
      ...options
    };

    this.bgGraphics = scene.add.graphics();
    this.add(this.bgGraphics);

    // Left cluster: Title & Subtitle
    this.leftCluster = scene.add.container(0, 0);
    this.titleText = new InkText(scene, 0, -8, 'PEMBUSUKAN OTAK', {
      fontSize: '20px',
      color: THEME.colors.arcadeYellowHex,
      isTitle: true,
      originX: 0
    });
    this.subText = new LocalizedText(scene, 0, 14, 'game.subtitle', {}, {
      fontSize: '12px',
      color: THEME.colors.slimeGreenHex,
      originX: 0
    });
    this.leftCluster.add(this.titleText);
    this.leftCluster.add(this.subText);
    this.add(this.leftCluster);

    // Right cluster: Buttons
    this.rightCluster = scene.add.container(0, 0);

    // Mute button
    const isMuted = AudioManager.isMuted();
    this.muteBtn = new Button(scene, 0, 0, 44, 44, {
      text: isMuted ? '🔇' : '🔊',
      bgColor: THEME.colors.playfieldTray,
      fontSize: '20px',
      radius: 12,
      onClick: () => {
        const muted = AudioManager.toggleMute();
        this.muteBtn.setText(muted ? '🔇' : '🔊');
      }
    });
    this.rightCluster.add(this.muteBtn);

    // Settings button
    this.settingsBtn = new Button(scene, 52, 0, 44, 44, {
      text: '⚙️',
      bgColor: THEME.colors.playfieldTray,
      fontSize: '20px',
      radius: 12,
      onClick: () => {
        if (this.options.onSettingsClick) {
          this.options.onSettingsClick();
        } else {
          EventBus.emit('ui:openSettings');
        }
      }
    });
    this.rightCluster.add(this.settingsBtn);

    // Optional menu button
    if (this.options.showMenuBtn) {
      this.menuBtn = new Button(scene, -80, 0, 100, 44, {
        text: 'Menu',
        bgColor: THEME.colors.punchMagenta,
        fontSize: '14px',
        radius: 12,
        onClick: () => {
          if (this.options.onMenuClick) {
            this.options.onMenuClick();
          } else {
            EventBus.emit('ui:pauseAndLeave');
          }
        }
      });
      this.rightCluster.add(this.menuBtn);
    }

    this.add(this.rightCluster);

    this.setDepth(50);
    this.updateLayout(scene.scale.width, 64);
    scene.add.existing(this);
  }

  updateLayout(width, rawHeight) {
    const height = Math.max(rawHeight || 60, 56);
    this.bgGraphics.clear();
    this.bgGraphics.fillStyle(THEME.colors.playfieldTray, 0.96);
    this.bgGraphics.fillRect(0, 0, width, height);
    this.bgGraphics.lineStyle(3, THEME.colors.ink, 1);
    this.bgGraphics.beginPath();
    this.bgGraphics.moveTo(0, height);
    this.bgGraphics.lineTo(width, height);
    this.bgGraphics.strokePath();

    this.leftCluster.setPosition(18, height / 2);

    const isSmall = width < 420;
    if (isSmall) {
      this.titleText.setFontSize('18px');
      this.subText.setFontSize('11px');
    } else {
      this.titleText.setFontSize('22px');
      this.subText.setFontSize('13px');
    }

    const rightOffset = width - 36;
    this.settingsBtn.setPosition(0, 0);
    this.muteBtn.setPosition(-52, 0);

    if (this.menuBtn) {
      this.menuBtn.setPosition(-140, 0);
    }

    this.rightCluster.setPosition(rightOffset, height / 2);
  }
}

