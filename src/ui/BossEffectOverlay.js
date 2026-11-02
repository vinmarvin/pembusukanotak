// src/ui/BossEffectOverlay.js
// Visual banner and freeze overlay for boss attacks.
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';
import { InkText } from './InkText.js';
import { Panel } from './Panel.js';

export class BossEffectOverlay extends Phaser.GameObjects.Container {
  constructor(scene) {
    super(scene, 0, 0);

    // Freeze overlay (cyan icy tint)
    this.freezeBackdrop = scene.add.rectangle(0, 0, 100, 100, THEME.colors.electricCyan, 0.25);
    this.freezeBackdrop.setAlpha(0);
    this.freezeLabel = new InkText(scene, 0, 0, '', {
      fontSize: '26px',
      color: THEME.colors.electricCyanHex,
      isTitle: true
    }).setAlpha(0);

    // Effect Announcement Banner
    this.banner = scene.add.container(0, 0);
    this.bannerPanel = new Panel(scene, 0, 0, 360, 60, {
      bgColor: THEME.colors.cardBg,
      outlineColor: THEME.colors.punchMagenta,
      outlineWidth: 4,
      radius: 16
    });
    this.bannerTitle = new InkText(scene, 0, -10, 'BOSS EFFECT!', {
      fontSize: '14px',
      color: THEME.colors.punchMagentaHex,
      isHud: true
    });
    this.bannerDesc = new InkText(scene, 0, 12, '', {
      fontSize: '18px',
      color: THEME.colors.arcadeYellowHex,
      isTitle: true
    });
    this.banner.add([this.bannerPanel, this.bannerTitle, this.bannerDesc]);
    this.banner.setAlpha(0);

    this.add([this.freezeBackdrop, this.freezeLabel, this.banner]);
    this.setDepth(80);
    scene.add.existing(this);
  }

  showBanner(bossName, effectType, onComplete) {
    let effectName = 'SPECIAL ATTACK';
    if (effectType === 'shuffle') effectName = 'CANDY SHUFFLE!';
    if (effectType === 'remove10') effectName = 'DEVOURED 10 CANDIES!';
    if (effectType === 'freeze') effectName = 'BRAIN FREEZE (5s)!';

    const screenW = this.scene.scale.width;
    const bannerW = Math.min(screenW - 32, 480);
    const padX = 24;

    this.bannerTitle.setWordWrapWidth(bannerW - padX * 2, true);
    this.bannerTitle.setAlign('center');
    this.bannerTitle.setText(`${bossName.toUpperCase()} CASTS:`);
    this.bannerDesc.setText(effectName);

    const titleH = this.bannerTitle.height;
    const descH = this.bannerDesc.height || 22;
    const gap = 8;
    const padY = 16;
    const bannerH = Math.max(68, titleH + descH + gap + padY * 2);

    this.bannerPanel.resize(bannerW, bannerH);
    this.bannerTitle.setPosition(0, -bannerH / 2 + padY + titleH / 2);
    this.bannerDesc.setPosition(0, bannerH / 2 - padY - descH / 2);

    this.banner.setScale(0.5);
    this.banner.setAlpha(1);

    this.scene.tweens.add({
      targets: this.banner,
      scaleX: 1,
      scaleY: 1,
      duration: 220,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.time.delayedCall(1200, () => {
          this.scene.tweens.add({
            targets: this.banner,
            alpha: 0,
            scaleY: 0.6,
            duration: 180,
            onComplete: () => {
              if (onComplete) onComplete();
            }
          });
        });
      }
    });
  }

  setFreeze(active, remainingSec = 0) {
    if (active) {
      this.freezeBackdrop.setAlpha(1);
      this.freezeLabel.setAlpha(1);
      this.freezeLabel.setText(`FROZEN! ${remainingSec.toFixed(1)}s`);
    } else {
      this.freezeBackdrop.setAlpha(0);
      this.freezeLabel.setAlpha(0);
    }
  }

  updateLayout(w, h, boardZone) {
    this.freezeBackdrop.setPosition(boardZone.x + boardZone.width / 2, boardZone.y + boardZone.height / 2);
    this.freezeBackdrop.setSize(boardZone.width + 10, boardZone.height + 10);
    this.freezeLabel.setPosition(boardZone.x + boardZone.width / 2, boardZone.y + boardZone.height / 2);

    this.banner.setPosition(w / 2, h / 2 - 20);
  }
}

