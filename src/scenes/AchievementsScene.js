// src/scenes/AchievementsScene.js
// Achievements scene matching Achievement.png with section 6 corrections.
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';
import { ACHIEVEMENTS_CONFIG } from '../config/achievements.config.js';
import { TopBar } from '../ui/TopBar.js';
import { Panel } from '../ui/Panel.js';
import { Button } from '../ui/Button.js';
import { InkText } from '../ui/InkText.js';
import { LocalizedText } from '../ui/LocalizedText.js';
import { SettingsPopup } from '../ui/SettingsPopup.js';
import { LayoutManager } from '../systems/LayoutManager.js';
import { AudioManager } from '../systems/AudioManager.js';
import { SaveManager } from '../systems/SaveManager.js';
import { EventBus } from '../systems/EventBus.js';
import { getAchievementProgress } from '../core/unlocks/achievements.js';
import { t } from '../i18n/index.js';

export class AchievementsScene extends Phaser.Scene {
  constructor() {
    super('Achievements');
    this.achievements = ACHIEVEMENTS_CONFIG.list;
  }

  create() {
    AudioManager.playBgm('bgm.menu');

    this.topBar = new TopBar(this, {
      showMenuBtn: true,
      onMenuClick: () => this.scene.start('MainMenu'),
      onSettingsClick: () => this.openSettingsPopup()
    });

    this.container = this.add.container(0, 0);
    this.cardsContainer = this.add.container(0, 0);
    this.container.add(this.cardsContainer);

    this.unsubLayout = EventBus.on('layout:changed', (layout) => {
      this.applyLayout(layout);
    });

    this.unsubLang = EventBus.on('language:changed', () => {
      this.applyLayout(LayoutManager.getLayout());
    });

    this.unsubSettings = EventBus.on('ui:openSettings', () => {
      this.openSettingsPopup();
    });

    this.applyLayout(LayoutManager.getLayout());

    this.events.once('shutdown', () => {
      if (this.unsubLayout) this.unsubLayout();
      if (this.unsubLang) this.unsubLang();
      if (this.unsubSettings) this.unsubSettings();
      if (this.currentPopup) {
        this.currentPopup.destroy();
        this.currentPopup = null;
      }
    });
  }

  openSettingsPopup() {
    if (this.currentPopup) return;
    this.currentPopup = new SettingsPopup(this, {
      onClose: () => {
        this.currentPopup = null;
      },
      onHowToPlay: () => {
        this.currentPopup = null;
        this.scene.start('Tutorial', { fromSettings: true });
      }
    });
  }

  applyLayout(layout) {
    const { width, height } = layout;
    this.topBar.updateLayout(width, 64);

    this.container.removeAll(true);
    this.cardsContainer = this.add.container(0, 0);
    this.container.add(this.cardsContainer);

    const save = SaveManager.data;

    // Count unlocked achievements
    let unlockedCount = 0;
    for (const ach of this.achievements) {
      if (save?.achievements && save.achievements[ach.id]) {
        unlockedCount++;
      }
    }

    // ── Header ──────────────────────────────────────────────────────────────
    const topBarH = 64;
    const headerPad = 16;
    const titleY = topBarH + headerPad + 22; // vertically place title

    // Big "Pencapaian" title, centered
    const title = new LocalizedText(this, width / 2, titleY, 'achievements.title', {}, {
      fontSize: '34px',
      color: THEME.colors.arcadeYellowHex,
      isTitle: true
    });

    // Progress pill centered below title
    const pillY = titleY + 42;
    const pillPanel = new Panel(this, width / 2, pillY, 100, 34, {
      bgColor: THEME.colors.cardBg,
      outlineColor: THEME.colors.slimeGreen,
      radius: 14
    });
    const pillText = new LocalizedText(
      this, width / 2, pillY,
      'achievements.progress',
      { count: unlockedCount, total: 5 },
      { fontSize: '15px', color: THEME.colors.slimeGreenHex, isHud: true }
    );

    this.container.add([title, pillPanel, pillText]);

    // ── Cards ────────────────────────────────────────────────────────────────
    // Back button at the bottom
    const backBtnH = 52;
    const backBtnMargin = 18;
    const backBtnY = height - backBtnMargin - backBtnH / 2;

    // Cards fill remaining space
    const cardsTop = pillY + 28;
    const cardsBottom = backBtnY - backBtnH / 2 - 12;
    const totalCardsH = cardsBottom - cardsTop;
    const n = this.achievements.length; // 5
    const gap = 10;
    const cardH = Math.floor((totalCardsH - gap * (n - 1)) / n);
    const cardW = Math.min(width - 32, 820);

    this.achievements.forEach((ach, index) => {
      const cy = cardsTop + index * (cardH + gap) + cardH / 2;
      const isUnlocked = Boolean(save?.achievements && save.achievements[ach.id]);
      const progress = getAchievementProgress(save, ach.id);

      const card = this.add.container(width / 2, cy);

      // Card panel
      const panel = new Panel(this, 0, 0, cardW, cardH, {
        bgColor: THEME.colors.cardBg,
        outlineColor: isUnlocked ? THEME.colors.slimeGreen : THEME.colors.ink,
        outlineWidth: isUnlocked ? 3 : 2,
        radius: 16
      });

      // Emblem icon square (left side)
      const iconSize = Math.min(cardH - 14, 58);
      const iconX = -cardW / 2 + iconSize / 2 + 14;
      const iconBg = this.add.graphics();
      iconBg.fillStyle(isUnlocked ? THEME.colors.slimeGreen : THEME.colors.playfieldTray, 1);
      iconBg.fillRoundedRect(iconX - iconSize / 2, -iconSize / 2, iconSize, iconSize, 10);
      iconBg.lineStyle(2, THEME.colors.ink, 1);
      iconBg.strokeRoundedRect(iconX - iconSize / 2, -iconSize / 2, iconSize, iconSize, 10);

      const isSecretLocked = ach.secret && !isUnlocked;
      const displayIcon = isSecretLocked ? '❓' : ach.icon;

      const iconText = this.add.text(iconX, 1, displayIcon, {
        fontSize: `${Math.round(iconSize * 0.52)}px`
      });
      iconText.setOrigin(0.5);

      // Title + Description (left-aligned, next to icon)
      const textX = iconX + iconSize / 2 + 18;
      const rightReserved = 180; // space for badge/progress on the right
      const maxTextW = cardW - (textX + cardW / 2) - rightReserved;

      const titleFontSize = cardH >= 72 ? '17px' : '15px';
      const descFontSize  = cardH >= 72 ? '13px' : '11px';
      const titleYOff = cardH >= 60 ? -cardH * 0.20 : -cardH * 0.18;
      const descYOff  = cardH >= 60 ?  cardH * 0.20 :  cardH * 0.18;

      let cardTitle;
      let cardDesc;

      if (isSecretLocked) {
        cardTitle = new InkText(this, textX, titleYOff, '???', {
          fontSize: titleFontSize,
          color: '#888888',
          originX: 0,
          isHud: true
        });
        cardDesc = new InkText(this, textX, descYOff, '???', {
          fontSize: descFontSize,
          color: '#666666',
          originX: 0
        });
      } else {
        cardTitle = new LocalizedText(this, textX, titleYOff, ach.titleKey, {}, {
          fontSize: titleFontSize,
          color: isUnlocked ? THEME.colors.arcadeYellowHex : '#DDDDDD',
          originX: 0,
          isHud: true
        });
        cardDesc = new LocalizedText(
          this, textX, descYOff, ach.descKey,
          { current: progress.current, target: progress.target },
          { fontSize: descFontSize, color: '#AAAAAA', originX: 0 }
        );
      }
      cardDesc.setWordWrapWidth(Math.max(80, maxTextW));

      card.add([panel, iconBg, iconText, cardTitle, cardDesc]);

      // ── Right-side Status / Progress ────────────────────────────────────
      const rightX = cardW / 2 - 80;

      if (isUnlocked) {
        // Green "Terbuka" badge
        const badgeW = 110;
        const badgeH = 36;
        const badgeBg = this.add.graphics();
        badgeBg.fillStyle(THEME.colors.slimeGreen, 1);
        badgeBg.fillRoundedRect(rightX - badgeW / 2, -badgeH / 2, badgeW, badgeH, 10);
        badgeBg.lineStyle(2, THEME.colors.ink, 1);
        badgeBg.strokeRoundedRect(rightX - badgeW / 2, -badgeH / 2, badgeW, badgeH, 10);

        const badgeLabel = new LocalizedText(this, rightX, 0, 'achievements.unlocked', {}, {
          fontSize: '14px',
          color: THEME.colors.inkHex,
          isHud: true
        });
        card.add([badgeBg, badgeLabel]);
      } else if (ach.id === 'scoreHunter' || ach.id === 'memeCurator') {
        // Progress bar + label
        const barW = 120;
        const barH = 14;
        const barG = this.add.graphics();
        barG.fillStyle(THEME.colors.playfieldTray, 1);
        barG.fillRoundedRect(rightX - barW / 2, -barH / 2, barW, barH, 5);
        barG.lineStyle(2, THEME.colors.ink, 1);
        barG.strokeRoundedRect(rightX - barW / 2, -barH / 2, barW, barH, 5);

        const pct = Math.min(1, progress.current / progress.target);
        if (pct > 0) {
          barG.fillStyle(THEME.colors.arcadeYellow, 1);
          barG.fillRoundedRect(rightX - barW / 2, -barH / 2, barW * pct, barH, 5);
        }

        const barLabel = new InkText(this, rightX, -barH / 2 - 10, `${progress.current}/${progress.target}`, {
          fontSize: '12px',
          color: '#DDDDDD'
        });
        card.add([barG, barLabel]);
      } else {
        // Lock icon
        const lockText = new InkText(this, rightX, 0, '🔒', {
          fontSize: '24px',
          color: '#888888'
        });
        card.add(lockText);
      }

      this.cardsContainer.add(card);
    });

    // ── Back to Menu Button ──────────────────────────────────────────────────
    const backBtn = new Button(this, width / 2, backBtnY, 200, backBtnH, {
      text: t('common.menu'),
      bgColor: THEME.colors.punchMagenta,
      textColor: '#FFFFFF',
      fontSize: '18px',
      radius: 14,
      onClick: () => {
        AudioManager.playSfx('sfx.click');
        this.scene.start('MainMenu');
      }
    });
    this.container.add(backBtn);

    if (this.currentPopup) {
      this.currentPopup.reposition(width, height);
    }
  }


}

