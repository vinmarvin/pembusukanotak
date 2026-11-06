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
import { getAchievementProgress, visibleAchievements, countUnlockedAchievements } from '../core/unlocks/achievements.js';
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
      }
    });
  }

  applyLayout(layout) {
    const { width, height, topBar, uiScale } = layout;
    const topBarH = topBar.height;
    this.topBar.updateLayout(width, topBarH);

    this.container.removeAll(true);
    this.cardsContainer = this.add.container(0, 0);
    this.container.add(this.cardsContainer);

    const save = SaveManager.data;

    // Hidden achievements (Detox Complete, decision 39) appear only once unlocked and then count
    // on top of the total: 6/5 with a gold pill.
    this.achievements = visibleAchievements(save);
    const total = ACHIEVEMENTS_CONFIG.total;
    const unlockedCount = countUnlockedAchievements(save);
    const overTotal = unlockedCount > total;

    // Short screens (phones sideways) get a compact header and a 2-column card grid.
    const short = height < 560;

    // ── Header ──────────────────────────────────────────────────────────────
    const titleSize = short ? 26 : 34;
    const pillW = short ? 84 : 100;
    const pillH = short ? 28 : 34;
    const title = new LocalizedText(this, 0, 0, 'achievements.title', {}, {
      fontSize: `${titleSize}px`,
      color: THEME.colors.arcadeYellowHex,
      isTitle: true
    });
    const pillPanel = new Panel(this, 0, 0, pillW, pillH, {
      bgColor: THEME.colors.cardBg,
      outlineColor: overTotal ? THEME.colors.arcadeYellow : THEME.colors.slimeGreen,
      outlineWidth: overTotal ? 4 : undefined,
      radius: 14
    });
    const pillText = new LocalizedText(
      this, 0, 0,
      'achievements.progress',
      { count: unlockedCount, total },
      {
        fontSize: short ? '13px' : '15px',
        color: overTotal ? THEME.colors.arcadeYellowHex : THEME.colors.slimeGreenHex,
        isHud: true
      }
    );

    let headerBottom;
    if (short) {
      // Title and pill side by side on one row
      const rowY = topBarH + 8 + Math.max(title.height, pillH) / 2;
      const gapX = 14;
      const rowW = title.width + gapX + pillW;
      const titleX = width / 2 - rowW / 2 + title.width / 2;
      const pillX = width / 2 + rowW / 2 - pillW / 2;
      title.setPosition(titleX, rowY);
      pillPanel.setPosition(pillX, rowY);
      pillText.setPosition(pillX, rowY);
      headerBottom = rowY + Math.max(title.height, pillH) / 2;
    } else {
      const titleY = topBarH + 16 + 22;
      const pillY = titleY + 42;
      title.setPosition(width / 2, titleY);
      pillPanel.setPosition(width / 2, pillY);
      pillText.setPosition(width / 2, pillY);
      headerBottom = pillY + pillH / 2;
    }
    this.container.add([title, pillPanel, pillText]);

    // ── Back button ─────────────────────────────────────────────────────────
    const backBtnH = short ? 44 : 52;
    const backBtnMargin = short ? 8 : 18;
    const backBtnY = height - backBtnMargin - backBtnH / 2;

    // ── Card grid ───────────────────────────────────────────────────────────
    const cardsTop = headerBottom + (short ? 8 : 12);
    const cardsBottom = backBtnY - backBtnH / 2 - (short ? 8 : 12);
    const totalCardsH = cardsBottom - cardsTop;
    const n = this.achievements.length; // 5, or 6 with the hidden one
    const gap = short ? 8 : 10;
    const gridW = Math.min(width - 32, short ? 1000 : 820);
    const minCardH = 64;
    const oneColH = Math.floor((totalCardsH - gap * (n - 1)) / n);
    const cols = oneColH < minCardH && gridW >= 560 ? 2 : 1;
    const rows = Math.ceil(n / cols);
    const cardW = Math.floor((gridW - gap * (cols - 1)) / cols);
    const cardH = Math.floor((totalCardsH - gap * (rows - 1)) / rows);

    // If any card needs the compact status badge to fit its text, every card uses it so the grid
    // looks consistent.
    const buildAll = (forceCompact) => {
      let anyCompact = false;
      this.achievements.forEach((ach, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        const inRow = Math.min(cols, n - row * cols); // the last row may hold fewer cards: centre it
        const rowW = inRow * cardW + (inRow - 1) * gap;
        const cx = width / 2 - rowW / 2 + cardW / 2 + col * (cardW + gap);
        const cy = cardsTop + row * (cardH + gap) + cardH / 2;
        const card = this.buildCard(ach, save, cx, cy, cardW, cardH, forceCompact);
        anyCompact = anyCompact || card.compactStatus;
        this.cardsContainer.add(card);
      });
      return anyCompact;
    };
    if (buildAll(false)) {
      this.cardsContainer.removeAll(true);
      buildAll(true);
    }

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

  // One achievement card. Every size comes from the card size, and the title / description are
  // measured and stacked, so they never overlap whatever the screen.
  buildCard(ach, save, cx, cy, cardW, cardH, forceCompact = false) {
    const isUnlocked = Boolean(save?.achievements && save.achievements[ach.id]);
    const progress = getAchievementProgress(save, ach.id);
    const card = this.add.container(cx, cy);
    // Hidden bonus achievement: gold SECRET look
    const gold = Boolean(ach.hidden && isUnlocked);
    const unlockColor = gold ? THEME.colors.arcadeYellow : THEME.colors.slimeGreen;

    const panel = new Panel(this, 0, 0, cardW, cardH, {
      bgColor: THEME.colors.cardBg,
      outlineColor: isUnlocked ? unlockColor : THEME.colors.ink,
      outlineWidth: gold ? 4 : (isUnlocked ? 3 : 2),
      radius: 16
    });

    // Emblem icon square (left)
    const padX = 12;
    const iconSize = Math.max(28, Math.min(cardH - 16, 58));
    const iconX = -cardW / 2 + padX + iconSize / 2;
    const iconBg = this.add.graphics();
    iconBg.fillStyle(isUnlocked ? unlockColor : THEME.colors.playfieldTray, 1);
    iconBg.fillRoundedRect(iconX - iconSize / 2, -iconSize / 2, iconSize, iconSize, 10);
    iconBg.lineStyle(2, THEME.colors.ink, 1);
    iconBg.strokeRoundedRect(iconX - iconSize / 2, -iconSize / 2, iconSize, iconSize, 10);

    const isSecretLocked = ach.secret && !isUnlocked;
    const iconText = this.add.text(iconX, 1, isSecretLocked ? '❓' : ach.icon, {
      fontSize: `${Math.round(iconSize * 0.52)}px`
    }).setOrigin(0.5);

    // Right status area: a full "Unlocked" badge, or a compact square badge when the text needs
    // the room (long descriptions on short screens, e.g. phones sideways). Progress bars keep it full.
    const hasBar = !isUnlocked && (ach.id === 'scoreHunter' || ach.id === 'memeCurator');
    const compactW = Math.max(36, Math.min(44, cardH - 14));
    let compact = forceCompact && !hasBar;
    let rightW = compact ? compactW : Math.min(150, Math.max(96, cardW * 0.28));
    const rightX = () => cardW / 2 - padX - rightW / 2;

    // Title + description, stacked and vertically centred
    const textX = iconX + iconSize / 2 + 12;
    const maxTextW = () => Math.max(80, rightX() - rightW / 2 - 10 - textX);
    let titleFs = Math.round(Math.max(13, Math.min(17, cardH * 0.24)));
    const descStartFs = Math.round(Math.max(12, Math.min(14, cardH * 0.18)));
    let descFs = descStartFs;

    let cardTitle;
    let cardDesc;
    if (isSecretLocked) {
      cardTitle = new InkText(this, textX, 0, '???', { fontSize: `${titleFs}px`, color: '#888888', originX: 0, isHud: true });
      cardDesc = new InkText(this, textX, 0, '???', { fontSize: `${descFs}px`, color: '#666666', originX: 0 });
    } else {
      cardTitle = new LocalizedText(this, textX, 0, ach.titleKey, {}, {
        fontSize: `${titleFs}px`,
        color: isUnlocked ? THEME.colors.arcadeYellowHex : '#DDDDDD',
        originX: 0,
        isHud: true
      });
      cardDesc = new LocalizedText(
        this, textX, 0, ach.descKey,
        { current: progress.current, target: progress.target },
        { fontSize: `${descFs}px`, color: '#AAAAAA', originX: 0 }
      );
    }
    const wrap = () => {
      cardTitle.setWordWrapWidth(maxTextW()).setAlign('left');
      cardDesc.setWordWrapWidth(maxTextW()).setAlign('left');
    };
    wrap();

    const lineGap = 3;
    const fits = () => cardTitle.height + lineGap + cardDesc.height <= cardH - 10;
    const shrinkDesc = () => {
      while (!fits() && descFs > 12) {
        descFs -= 1;
        cardDesc.setFontSize(`${descFs}px`);
      }
    };
    // 1) Shrink the description to the label minimum
    shrinkDesc();
    // 2) Still too tall: give the text the status area's room (compact badge) and try again
    if (!fits() && !hasBar) {
      compact = true;
      rightW = compactW;
      descFs = descStartFs;
      cardDesc.setFontSize(`${descFs}px`);
      wrap();
      shrinkDesc();
    }
    // 3) Last resort: shrink the title to the label minimum
    while (!fits() && titleFs > 12) {
      titleFs -= 1;
      cardTitle.setFontSize(`${titleFs}px`);
    }
    const blockH = cardTitle.height + lineGap + cardDesc.height;
    cardTitle.setOrigin(0, 0).setPosition(textX, -blockH / 2);
    cardDesc.setOrigin(0, 0).setPosition(textX, -blockH / 2 + cardTitle.height + lineGap);

    card.add([panel, iconBg, iconText, cardTitle, cardDesc]);

    const rx = rightX();
    if (isUnlocked) {
      const badgeW = compact ? compactW : Math.min(110, rightW);
      const badgeH = compact ? compactW : Math.min(36, cardH - 14);
      const badgeBg = this.add.graphics();
      badgeBg.fillStyle(unlockColor, 1);
      badgeBg.fillRoundedRect(rx - badgeW / 2, -badgeH / 2, badgeW, badgeH, 10);
      badgeBg.lineStyle(2, THEME.colors.ink, 1);
      badgeBg.strokeRoundedRect(rx - badgeW / 2, -badgeH / 2, badgeW, badgeH, 10);
      const badgeLabel = compact
        ? new InkText(this, rx, 0, gold ? '★' : '✓', { fontSize: `${Math.round(compactW * 0.5)}px`, color: THEME.colors.inkHex, isHud: true })
        : new LocalizedText(this, rx, 0, gold ? 'achievements.secret' : 'achievements.unlocked', {}, {
          fontSize: '14px',
          color: THEME.colors.inkHex,
          isHud: true
        });
      card.add([badgeBg, badgeLabel]);
    } else if (hasBar) {
      const barW = rightW - 8;
      const barH = 14;
      const barLabel = new InkText(this, rx, 0, `${progress.current}/${progress.target}`, {
        fontSize: '12px',
        color: '#DDDDDD'
      });
      const stackH = barLabel.height + 4 + barH;
      barLabel.setPosition(rx, -stackH / 2 + barLabel.height / 2);
      const barY = stackH / 2 - barH / 2;
      const barG = this.add.graphics();
      barG.fillStyle(THEME.colors.playfieldTray, 1);
      barG.fillRoundedRect(rx - barW / 2, barY - barH / 2, barW, barH, 5);
      barG.lineStyle(2, THEME.colors.ink, 1);
      barG.strokeRoundedRect(rx - barW / 2, barY - barH / 2, barW, barH, 5);
      const pct = Math.min(1, progress.current / progress.target);
      if (pct > 0) {
        barG.fillStyle(THEME.colors.arcadeYellow, 1);
        barG.fillRoundedRect(rx - barW / 2, barY - barH / 2, Math.max(barH, barW * pct), barH, 5);
      }
      card.add([barG, barLabel]);
    } else {
      const lockText = new InkText(this, rx, 0, '🔒', {
        fontSize: `${Math.round(Math.max(18, Math.min(24, cardH * 0.34)))}px`,
        color: '#888888'
      });
      card.add(lockText);
    }

    card.compactStatus = compact;
    return card;
  }

}

