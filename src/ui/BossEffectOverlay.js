// src/ui/BossEffectOverlay.js
// Boss effect banner and the freeze overlay (ice sheet, frost crystals, countdown, thaw shatter).
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';
import { GAMEPLAY } from '../config/gameplay.config.js';
import { InkText } from './InkText.js';
import { Panel } from './Panel.js';
import { SpriteFit } from './SpriteFit.js';
import { BOSS_EFFECT_UI } from '../config/effects.config.js';
import { prefersReducedMotion } from '../core/reducedMotion.js';
import { t } from '../i18n/index.js';
const CRYSTALS = 9;

export class BossEffectOverlay extends Phaser.GameObjects.Container {
  constructor(scene) {
    super(scene, 0, 0);
    this.boardZone = { x: 0, y: 0, width: 100, height: 100 };
    this.frozen = false;

    // Freeze layer
    this.freezeLayer = scene.add.container(0, 0).setAlpha(0);
    this.iceSheet = scene.add.graphics();
    this.crystals = [];
    for (let i = 0; i < CRYSTALS; i++) {
      const c = scene.add.text(0, 0, '❄', {
        fontSize: '26px',
        color: '#E6FBFF',
        stroke: THEME.colors.electricCyanHex,
        strokeThickness: 2
      }).setOrigin(0.5);
      this.crystals.push(c);
    }
    this.freezeLabel = new InkText(scene, 0, 0, '', {
      fontSize: '28px',
      color: '#E6FBFF',
      isTitle: true,
      stroke: '#00718A',
      strokeThickness: 6
    });
    this.freezeLayer.add([this.iceSheet, ...this.crystals, this.freezeLabel]);

    // Effect announcement banner
    this.banner = scene.add.container(0, 0);
    this.bannerPanel = new Panel(scene, 0, 0, 360, 60, {
      bgColor: THEME.colors.cardBg,
      outlineColor: THEME.colors.punchMagenta,
      outlineWidth: 4,
      radius: 16
    });
    // Square icon badge: holds a custom image (fx.* texture) or an emoji, always fitted inside.
    this.iconBadge = scene.add.container(0, 0);
    this.iconBg = scene.add.graphics();
    this.iconBadge.add(this.iconBg);
    this.iconContent = null;
    this.bannerTitle = new InkText(scene, 0, -10, '', {
      fontSize: '14px',
      color: THEME.colors.punchMagentaHex,
      isHud: true
    });
    this.bannerDesc = new InkText(scene, 0, 12, '', {
      fontSize: '20px',
      color: THEME.colors.arcadeYellowHex,
      isTitle: true
    });
    this.banner.add([this.bannerPanel, this.iconBadge, this.bannerTitle, this.bannerDesc]);
    this.banner.setAlpha(0);

    this.add([this.freezeLayer, this.banner]);
    this.setDepth(80);
    scene.add.existing(this);
  }

  effectLabel(effectType) {
    if (effectType === 'shuffle') return t('battle.effectName.shuffle');
    if (effectType === 'remove10') return t('battle.effectName.remove', { count: GAMEPLAY.bossEffects.removeCount });
    if (effectType === 'freeze') return t('battle.effectName.freeze', { sec: GAMEPLAY.bossEffects.freezeSec });
    return '';
  }

  // Draw the badge and put the icon inside it, scaled so it can never be bigger than the square.
  setBadgeIcon(effectType, slot) {
    const { scene } = this;
    const ui = BOSS_EFFECT_UI.effects[effectType] || BOSS_EFFECT_UI.fallback;
    const r = Math.min(12, slot * 0.22);

    const g = this.iconBg;
    g.clear();
    g.fillStyle(THEME.colors.hardShadow, 1);
    g.fillRoundedRect(-slot / 2, -slot / 2 + 3, slot, slot, r);
    g.fillStyle(THEME.colors.playfieldTray, 1);
    g.fillRoundedRect(-slot / 2, -slot / 2, slot, slot, r);
    g.fillStyle(ui.color, 0.22);
    g.fillRoundedRect(-slot / 2, -slot / 2, slot, slot, r);
    g.lineStyle(3, ui.color, 1);
    g.strokeRoundedRect(-slot / 2, -slot / 2, slot, slot, r);

    if (this.iconContent) {
      scene.tweens.killTweensOf(this.iconContent);
      this.iconContent.destroy();
      this.iconContent = null;
    }

    const inner = slot * BOSS_EFFECT_UI.iconFill;
    let icon;
    if (ui.textureKey && scene.textures.exists(ui.textureKey)) {
      icon = scene.add.image(0, 0, ui.textureKey);
      SpriteFit.fitContain(icon, inner, inner);
    } else {
      // Emoji glyph boxes are taller than the font size, so measure and scale down to fit.
      icon = scene.add.text(0, 0, ui.emoji, { fontSize: `${Math.round(inner)}px`, padding: { x: 2, y: 4 } }).setOrigin(0.5);
      icon.setScale(Math.min(inner / icon.width, inner / icon.height));
    }
    icon.baseScale = icon.scaleX;
    this.iconBadge.add(icon);
    this.iconContent = icon;
    return ui;
  }

  showBanner(bossName, effectType, onComplete) {
    const { scene } = this;
    const screenW = scene.scale.width;
    const bannerW = Math.min(screenW - 32, 480);
    const padX = 16;
    const padY = 14;
    const gap = 6;
    const iconSlotMax = BOSS_EFFECT_UI.iconSlot;
    const textW = bannerW - iconSlotMax - padX * 3;

    this.bannerTitle.setWordWrapWidth(textW, true);
    this.bannerTitle.setAlign('center');
    this.bannerTitle.setText(t('battle.casts', { boss: bossName.toUpperCase() }));
    this.bannerDesc.setWordWrapWidth(textW, true);
    this.bannerDesc.setAlign('center');
    this.bannerDesc.setText(this.effectLabel(effectType));

    const titleH = this.bannerTitle.height;
    const descH = this.bannerDesc.height || 24;
    const bannerH = Math.max(76, titleH + descH + gap + padY * 2);
    const slot = Math.min(iconSlotMax, bannerH - padY * 2 + 6);

    const ui = this.setBadgeIcon(effectType, slot);
    const color = ui.color;

    this.bannerPanel.options.outlineColor = color;
    this.bannerPanel.resize(bannerW, bannerH);
    const textX = -bannerW / 2 + padX * 2 + iconSlotMax + textW / 2;
    this.iconBadge.setPosition(-bannerW / 2 + padX + iconSlotMax / 2, 0);
    this.bannerTitle.setPosition(textX, -bannerH / 2 + padY + titleH / 2);
    this.bannerDesc.setPosition(textX, bannerH / 2 - padY - descH / 2);

    scene.tweens.killTweensOf(this.banner);
    this.banner.setAlpha(1).setScale(0.4).setAngle(-4);

    const icon = this.iconContent;
    if (!prefersReducedMotion()) {
      try {
        scene.cameras.main.shake(220, 0.006);
      } catch (e) {}
      this.softFlash(color, 0.3, 260);
      // Pop in, then a small wobble. Scale never exceeds the fitted size, so it stays inside the badge.
      icon.setScale(0).setAngle(0);
      scene.tweens.add({ targets: icon, scale: icon.baseScale, duration: 320, delay: 120, ease: 'Back.easeOut' });
      scene.tweens.add({ targets: icon, angle: { from: -10, to: 10 }, duration: 160, delay: 440, yoyo: true, repeat: 2, onComplete: () => icon.setAngle(0) });
    }

    scene.tweens.add({
      targets: this.banner,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      duration: 260,
      ease: 'Back.easeOut',
      onComplete: () => {
        scene.time.delayedCall(THEME.fx.bannerHoldMs, () => {
          scene.tweens.add({
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

  // Gentle full-screen colour wash (a camera flash is too harsh at full opacity).
  softFlash(color, alpha, duration) {
    const { scene } = this;
    const { width, height } = scene.scale;
    const wash = scene.add.rectangle(width / 2, height / 2, width, height, color, alpha).setDepth(this.depth - 1);
    scene.tweens.add({ targets: wash, alpha: 0, duration, ease: 'Cubic.easeOut', onComplete: () => wash.destroy() });
  }

  drawIce() {
    const { width, height } = this.boardZone;
    const w = width + 14;
    const h = height + 14;
    const g = this.iceSheet;
    g.clear();
    g.fillStyle(THEME.colors.electricCyan, 0.2);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
    g.fillStyle(0xffffff, 0.08);
    g.fillRoundedRect(-w / 2 + 8, -h / 2 + 8, w - 16, h * 0.28, 14);
    g.lineStyle(4, 0xe6fbff, 0.9);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 20);
    // Frost cracks from the corners
    g.lineStyle(2, 0xe6fbff, 0.55);
    const corners = [
      [-w / 2, -h / 2, 1, 1],
      [w / 2, -h / 2, -1, 1],
      [-w / 2, h / 2, 1, -1],
      [w / 2, h / 2, -1, -1]
    ];
    for (const [cx, cy, dx, dy] of corners) {
      const len = Math.min(w, h) * 0.22;
      g.lineBetween(cx, cy, cx + dx * len, cy + dy * len * 0.6);
      g.lineBetween(cx + dx * len * 0.5, cy + dy * len * 0.3, cx + dx * len * 0.55, cy + dy * len * 0.75);
      g.lineBetween(cx + dx * len * 0.5, cy + dy * len * 0.3, cx + dx * len * 0.9, cy + dy * len * 0.25);
    }
  }

  placeCrystals() {
    const { width, height } = this.boardZone;
    this.crystals.forEach((c, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      c.setPosition(
        (col - 1) * width * 0.33 + (Math.random() - 0.5) * width * 0.15,
        (row - 1) * height * 0.33 + (Math.random() - 0.5) * height * 0.15
      );
      c.setFontSize(`${Math.round(18 + Math.random() * 16)}px`);
    });
  }

  startFreezeFx() {
    const { scene } = this;
    this.drawIce();
    this.placeCrystals();
    scene.tweens.killTweensOf([this.freezeLayer, ...this.crystals, this.freezeLabel]);
    if (prefersReducedMotion()) {
      this.freezeLayer.setAlpha(1).setScale(1);
      this.crystals.forEach((c) => c.setAlpha(0.9).setScale(1));
      return;
    }
    this.softFlash(0xbff6ff, 0.35, 320);
    this.freezeLayer.setAlpha(0).setScale(1.06);
    scene.tweens.add({ targets: this.freezeLayer, alpha: 1, scale: 1, duration: THEME.fx.freezeInMs, ease: 'Cubic.easeOut' });
    this.crystals.forEach((c, i) => {
      c.setAlpha(0).setScale(0).setAngle(0);
      scene.tweens.add({ targets: c, alpha: 0.9, scale: 1, delay: i * 35, duration: 260, ease: 'Back.easeOut' });
      scene.tweens.add({ targets: c, angle: 360, duration: 6000 + i * 400, repeat: -1 });
    });
    scene.tweens.add({ targets: this.freezeLabel, scale: 1.08, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  endFreezeFx() {
    const { scene } = this;
    scene.tweens.killTweensOf([this.freezeLayer, ...this.crystals, this.freezeLabel]);
    if (prefersReducedMotion()) {
      this.freezeLayer.setAlpha(0);
      return;
    }
    // Shatter: shards fly out from across the board
    const { width, height } = this.boardZone;
    for (let i = 0; i < 18; i++) {
      const sx = this.freezeLayer.x + (Math.random() - 0.5) * width;
      const sy = this.freezeLayer.y + (Math.random() - 0.5) * height;
      const shard = scene.add.triangle(sx, sy, 0, 0, 10 + Math.random() * 10, 4, 4, 14 + Math.random() * 8, 0xe6fbff, 0.9);
      shard.setDepth(this.depth + 1).setAngle(Math.random() * 360);
      const a = Math.atan2(sy - this.freezeLayer.y, sx - this.freezeLayer.x) + (Math.random() - 0.5);
      scene.tweens.add({
        targets: shard,
        x: sx + Math.cos(a) * 70,
        y: sy + Math.sin(a) * 70 + 30,
        angle: shard.angle + 180,
        alpha: 0,
        duration: THEME.fx.thawMs,
        ease: 'Cubic.easeOut',
        onComplete: () => shard.destroy()
      });
    }
    scene.tweens.add({ targets: this.freezeLayer, alpha: 0, scale: 1.04, duration: THEME.fx.thawMs * 0.6 });
  }

  setFreeze(active, remainingSec = 0) {
    if (active && !this.frozen) this.startFreezeFx();
    if (!active && this.frozen) this.endFreezeFx();
    this.frozen = active;
    if (active) {
      this.freezeLabel.setText(`❄ ${t('battle.freezeCountdown', { sec: remainingSec.toFixed(1) })}`);
    }
  }

  updateLayout(w, h, boardZone) {
    this.boardZone = boardZone;
    this.freezeLayer.setPosition(boardZone.x + boardZone.width / 2, boardZone.y + boardZone.height / 2);
    if (this.frozen) {
      this.drawIce();
      this.placeCrystals();
    }
    this.banner.setPosition(w / 2, h / 2 - 20);
  }
}
