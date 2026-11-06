// src/scenes/MainMenuScene.js
// Main Menu matching Main_Menu.png with section 6 corrections.
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';
import { TopBar } from '../ui/TopBar.js';
import { Panel } from '../ui/Panel.js';
import { Button } from '../ui/Button.js';
import { InkText } from '../ui/InkText.js';
import { LocalizedText } from '../ui/LocalizedText.js';
import { Popup } from '../ui/Popup.js';
import { Slider } from '../ui/Slider.js';
import { Toggle } from '../ui/Toggle.js';
import { SettingsPopup } from '../ui/SettingsPopup.js';
import { LayoutManager } from '../systems/LayoutManager.js';
import { AudioManager } from '../systems/AudioManager.js';
import { SaveManager } from '../systems/SaveManager.js';
import { AssetResolver } from '../systems/AssetResolver.js';
import { EventBus } from '../systems/EventBus.js';
import { ACHIEVEMENTS_CONFIG } from '../config/achievements.config.js';
import { MenuListenTracker } from '../systems/MenuListenTracker.js';
import { showAchievementToast } from '../ui/AchievementToast.js';
import { EasterEggPlayer } from '../systems/EasterEggPlayer.js';
import { EASTER_EGGS_CONFIG } from '../config/eastereggs.config.js';
import { createEggCounts, registerEggClick } from '../core/eastereggs.js';
import { SpriteFit } from '../ui/SpriteFit.js';
import { CREDITS_CONFIG } from '../config/credits.config.js';
import { countUnlockedAchievements } from '../core/unlocks/achievements.js';

// Click counts live for the whole browser session, so leaving the menu does not lose progress.
const eggCounts = createEggCounts();
import { getLanguage, setLanguage, t } from '../i18n/index.js';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create() {
    // Play menu BGM
    AudioManager.playBgm('bgm.menu');

    // Easter egg: 15 minutes of menu music in one sitting
    this.listenTracker = new MenuListenTracker({ onUnlock: () => this.onFullyBrainRotUnlocked() });
    this.listenTracker.start();

    // Top Bar
    this.topBar = new TopBar(this, {
      showMenuBtn: false,
      onSettingsClick: () => this.openSettingsPopup()
    });

    // Visual background decor (slime sparkles and floating candies/minions)
    this.decorGraphics = this.add.graphics();
    this.decorContainer = this.add.container(0, 0);

    // Decorative floating candies & minions (Bug 5: replaces grey circles)
    this.decorItems = [];
    const decors = [
      { key: AssetResolver.getCandyKey(this, 'c67'), egg: 'c67', size: 60, angle: -12, dx: 0, dy: 10, dur: 2200 },
      { key: AssetResolver.getCandyKey(this, 'bluberini'), egg: null, size: 64, angle: 15, dx: 0, dy: -12, dur: 2600 },
      { key: AssetResolver.getMinionKey(this, 'small'), egg: 'small', size: 68, angle: 8, dx: 6, dy: 8, dur: 2400 },
      { key: AssetResolver.getCandyKey(this, 'skibidi'), egg: 'skibidi', size: 58, angle: -10, dx: -8, dy: 10, dur: 2000 }
    ];

    // Easter eggs: some decor icons are silent buttons (no hand cursor, no hover, no bounce)
    this.eggPlayer = new EasterEggPlayer(this);

    decors.forEach((d) => {
      const spr = this.add.sprite(0, 0, d.key);
      SpriteFit.fitContain(spr, d.size, d.size);
      spr.setAngle(d.angle);
      this.decorContainer.add(spr);
      this.decorItems.push({ spr, ...d });
      if (d.egg) {
        spr.setInteractive();
        spr.on('pointerdown', () => this.onEggIconClick(d.egg));
      }

      this.tweens.add({
        targets: spr,
        y: `+=${d.dy}`,
        x: `+=${d.dx}`,
        angle: d.angle + (d.angle > 0 ? 8 : -8),
        yoyo: true,
        repeat: -1,
        duration: d.dur,
        ease: 'Sine.easeInOut'
      });
    });

    // Mode Buttons
    const { clearedCount, achCount, memeCount } = this.getCardCounts();

    // 1. Story Mode (Green)
    this.storyBtn = this.createModeCard({
      titleKey: 'menu.story.title',
      subKey: 'menu.story.subtitle',
      subParams: { cleared: clearedCount, total: 5 },
      color: THEME.colors.slimeGreen,
      icon: '⚔️',
      onClick: () => this.scene.start('StageSelect')
    });

    // 2. Time Kill (Cyan)
    this.timeKillBtn = this.createModeCard({
      titleKey: 'menu.timekill.title',
      subKey: 'menu.timekill.subtitle',
      color: THEME.colors.electricCyan,
      icon: '⏱️',
      onClick: () => this.scene.start('TimeKill')
    });

    // 3. Achievements (Yellow)
    this.achBtn = this.createModeCard({
      titleKey: 'menu.achievements.title',
      subKey: 'menu.achievements.subtitle',
      subParams: { unlocked: achCount, total: ACHIEVEMENTS_CONFIG.total },
      color: THEME.colors.arcadeYellow,
      icon: '🏆',
      onClick: () => this.scene.start('Achievements')
    });

    // 4. Journal of Meme Card (Tilted bottom-left, Bug 8: full Button interaction)
    this.journalBtn = new Button(this, 0, 0, 205, 84, {
      bgColor: THEME.colors.cardBg,
      outlineColor: THEME.colors.electricCyan,
      radius: 16,
      onClick: () => this.scene.start('MemeBook')
    });
    this.journalTitle = new LocalizedText(this, 0, -14, 'menu.memebook.title', {}, {
      fontSize: '17px',
      color: THEME.colors.arcadeYellowHex,
      isHud: true
    });
    this.journalSub = new LocalizedText(this, 0, 14, 'menu.memebook.subtitle', { discovered: memeCount, total: 11 }, {
      fontSize: '13px',
      color: '#FFFFFF',
      isHud: true
    });
    this.journalBtn.contentContainer.add([this.journalTitle, this.journalSub]);
    this.journalBtn.setAngle(-6);

    // 5. Credits Button (Tilted bottom-right)
    this.creditsBtn = new Button(this, 0, 0, 150, 52, {
      text: t('menu.credits'),
      bgColor: THEME.colors.punchMagenta,
      textColor: '#FFFFFF',
      fontSize: '18px',
      radius: 14,
      onClick: () => this.openCreditsPopup()
    });
    this.creditsBtn.setAngle(5);

    this.unsubLayout = EventBus.on('layout:changed', (layout) => {
      this.applyLayout(layout);
    });

    this.unsubSettings = EventBus.on('ui:openSettings', () => {
      this.openSettingsPopup();
    });

    // Any progress saved while the menu is open (e.g. Support Creator from the donate button,
    // the listen easter egg) updates the card counters right away.
    this.unsubSave = EventBus.on('save:changed', () => this.refreshCardCounts());

    this.applyLayout(LayoutManager.getLayout());

    this.events.once('shutdown', () => {
      if (this.unsubSave) this.unsubSave();
      if (this.unsubLayout) this.unsubLayout();
      if (this.unsubSettings) this.unsubSettings();
      if (this.listenTracker) this.listenTracker.stop();
    });
  }

  onEggIconClick(id) {
    if (this.currentPopup || this.eggPlayer.isPlaying()) return;
    const egg = registerEggClick(eggCounts, id, EASTER_EGGS_CONFIG.eggs);
    if (egg) this.eggPlayer.play(egg);
  }

  onFullyBrainRotUnlocked() {
    const ach = ACHIEVEMENTS_CONFIG.list.find((a) => a.id === 'fullyBrainRot');
    AudioManager.playSfx('sfx.win');
    showAchievementToast(this, { icon: ach.icon, titleKey: ach.titleKey });
    this.refreshCardCounts();
  }

  getCardCounts(save = SaveManager.data) {
    const clearedCount = save.stageCleared || 0;
    // Hidden Detox Complete counts on top of the total (6/5, decision 39)
    const achCount = countUnlockedAchievements(save);
    const memeCount = (Object.values(save.bossDefeated || {}).filter(Boolean).length) +
      (Object.values(save.candyDestroyed || {}).filter((v) => v >= 100).length);
    return { clearedCount, achCount, memeCount };
  }

  refreshCardCounts() {
    const { clearedCount, achCount, memeCount } = this.getCardCounts();
    if (this.storyBtn?.subText) this.storyBtn.subText.setParams({ cleared: clearedCount });
    if (this.achBtn?.subText) this.achBtn.subText.setParams({ unlocked: achCount });
    if (this.journalSub) this.journalSub.setParams({ discovered: memeCount });
  }

  createModeCard({ titleKey, subKey, subParams = {}, color, icon, onClick }) {
    const btn = new Button(this, 0, 0, 360, 78, {
      bgColor: color,
      radius: 18,
      onClick
    });

    const iconTxt = this.add.text(-130, 0, icon, {
      fontSize: '32px'
    }).setOrigin(0.5);

    const title = new LocalizedText(this, 15, -14, titleKey, {}, {
      fontSize: '22px',
      color: '#FFFFFF',
      stroke: THEME.colors.inkHex,
      strokeThickness: 4,
      isTitle: true
    });

    const sub = new LocalizedText(this, 15, 14, subKey, subParams, {
      fontSize: '13px',
      color: '#FFFFFF',
      stroke: THEME.colors.inkHex,
      strokeThickness: 3,
      isHud: true
    });

    btn.contentContainer.add([iconTxt, title, sub]);
    btn.subText = sub;
    return btn;
  }

  applyLayout(layout) {
    const { width, height, isLandscape, uiScale, topBar } = layout;
    this.topBar.updateLayout(width, topBar.height);

    // Decorative sparkles & stars (Bug 5)
    this.decorGraphics.clear();
    this.decorGraphics.fillStyle(THEME.colors.arcadeYellow, 0.4);
    // Draw 4-point sparkle stars
    const drawSparkle = (gx, gy, r) => {
      this.decorGraphics.beginPath();
      this.decorGraphics.moveTo(gx, gy - r);
      this.decorGraphics.lineTo(gx + r * 0.3, gy - r * 0.3);
      this.decorGraphics.lineTo(gx + r, gy);
      this.decorGraphics.lineTo(gx + r * 0.3, gy + r * 0.3);
      this.decorGraphics.lineTo(gx, gy + r);
      this.decorGraphics.lineTo(gx - r * 0.3, gy + r * 0.3);
      this.decorGraphics.lineTo(gx - r, gy);
      this.decorGraphics.lineTo(gx - r * 0.3, gy - r * 0.3);
      this.decorGraphics.closePath();
      this.decorGraphics.fillPath();
    };

    drawSparkle(width * 0.22, height * 0.22, 14);
    drawSparkle(width * 0.78, height * 0.24, 18);
    drawSparkle(width * 0.26, height * 0.76, 12);
    drawSparkle(width * 0.75, height * 0.78, 16);

    // Position floating candy & minion decor
    if (this.decorItems && this.decorItems.length >= 4) {
      if (isLandscape) {
        this.decorItems[0].spr.setPosition(width * 0.12, height * 0.36); // c67
        this.decorItems[1].spr.setPosition(width * 0.88, height * 0.32); // bluberini
        this.decorItems[2].spr.setPosition(width * 0.14, height * 0.62); // small minion
        this.decorItems[3].spr.setPosition(width * 0.86, height * 0.64); // skibidi
      } else {
        this.decorItems[0].spr.setPosition(width * 0.12, height * 0.22);
        this.decorItems[1].spr.setPosition(width * 0.88, height * 0.22);
        this.decorItems[2].spr.setPosition(width * 0.12, height * 0.78);
        this.decorItems[3].spr.setPosition(width * 0.88, height * 0.78);
      }
    }

    const centerX = width / 2;
    const startY = topBar.height + (height - topBar.height) * 0.16;

    if (isLandscape) {
      const gap = 90;

      this.storyBtn.setPosition(centerX, startY);
      this.timeKillBtn.setPosition(centerX, startY + gap);
      this.achBtn.setPosition(centerX, startY + gap * 2);

      this.journalBtn.setPosition(width * 0.18, height * 0.84);
      this.creditsBtn.setPosition(width * 0.82, height * 0.84);
    } else {
      // Portrait
      const gap = 84;
      this.storyBtn.setPosition(centerX, startY);
      this.timeKillBtn.setPosition(centerX, startY + gap);
      this.achBtn.setPosition(centerX, startY + gap * 2);

      this.journalBtn.setPosition(centerX, startY + gap * 3.3);
      this.creditsBtn.setPosition(centerX, startY + gap * 4.4);
    }

    if (this.currentPopup) {
      this.currentPopup.reposition(width, height);
    }
  }

  openCreditsPopup() {
    if (this.currentPopup) return;

    const pw = Math.min(this.scale.width * 0.9, 540);
    const ph = Math.min(this.scale.height * 0.92, 560);

    const popup = new Popup(this, pw, ph, {
      title: t('credits.title'),
      onClose: () => {
        this.currentPopup = null;
      }
    });

    const d = popup.dialog;
    const links = CREDITS_CONFIG.links;
    const { name, nrp } = CREDITS_CONFIG.author;

    // Rows from top to bottom. `lines` is how many text lines the row takes.
    const rows = [
      { key: 'credits.content', color: THEME.colors.whiteHex, lines: 2, big: true },
      { key: 'credits.course', color: THEME.colors.arcadeYellowHex, lines: 1 },
      { key: 'credits.techStack', color: THEME.colors.whiteHex, lines: 1 },
      { key: 'credits.engineLink', color: THEME.colors.electricCyanHex, lines: 1, url: links.phaser },
      { key: 'credits.fontsLink', color: THEME.colors.electricCyanHex, lines: 1, url: links.googleFonts },
      { key: 'credits.musicCredit', color: THEME.colors.electricCyanHex, lines: 1, url: links.pixabay },
      { key: 'credits.sfxCredit', color: THEME.colors.electricCyanHex, lines: 1, url: links.vpMasti },
      { key: 'credits.feedback', color: THEME.colors.slimeGreenHex, lines: 1, url: links.whatsapp }
    ];

    // Vertical budget: below the title, above the support button and the author line.
    const authorY = ph / 2 - 22;
    const btnH = Math.min(46, Math.max(38, ph * 0.09));
    const btnY = authorY - 18 - btnH / 2 - 6;
    const top = -ph / 2 + 64;
    const bottom = btnY - btnH / 2 - 8;
    const totalLines = rows.reduce((n, r) => n + r.lines, 0);
    const lineH = (bottom - top) / totalLines;
    const fontPx = Math.round(Phaser.Math.Clamp(lineH * 0.62, 12, 15));

    let y = top;
    for (const row of rows) {
      const rowH = row.lines * lineH;
      const label = new InkText(this, 0, y + rowH / 2, t(row.key), {
        fontSize: `${row.big ? fontPx + 2 : fontPx}px`,
        color: row.color,
        isTitle: !!row.big
      });
      label.setWordWrapWidth(pw - 48);
      if (row.url) {
        label.setInteractive({ useHandCursor: true });
        label.on('pointerup', () => window.open(row.url, '_blank', 'noopener'));
        label.on('pointerover', () => label.setAlpha(0.75));
        label.on('pointerout', () => label.setAlpha(1));
      }
      d.add(label);
      y += rowH;
    }

    // Support button
    const supportBtn = new Button(this, 0, btnY, 220, btnH, {
      text: t('credits.support'),
      bgColor: THEME.colors.punchMagenta,
      textColor: '#FFFFFF',
      fontSize: '15px',
      radius: 14,
      onClick: () => {
        // Unlock achievement: Support Creator per decision 22
        SaveManager.update((s) => {
          if (!s.achievements) s.achievements = {};
          s.achievements.supportCreator = true;
        });
        popup.close();
        this.openDonationQrPopup();
      }
    });
    d.add(supportBtn);

    // Author line at the very bottom
    const author = new InkText(this, 0, authorY, t('credits.author', { name, nrp }), {
      fontSize: `${fontPx}px`,
      color: THEME.colors.arcadeYellowHex,
      isHud: true
    });
    author.setWordWrapWidth(pw - 48);
    d.add(author);

    this.currentPopup = popup;
  }

  openDonationQrPopup() {
    const pw = Math.min(this.scale.width * 0.88, 420);
    const ph = Math.min(this.scale.height * 0.9, 520);

    const popup = new Popup(this, pw, ph, {
      title: t('donation.title'),
      onClose: () => {
        this.currentPopup = null;
      }
    });

    const d = popup.dialog;

    // QR image dimensions maintaining exact 1135:1600 aspect ratio with comfortable margins
    const maxQrW = Math.min(pw - 80, 230);
    const maxQrH = Math.min(ph - 180, 325);
    const aspect = 1135 / 1600;
    let qrW = maxQrW;
    let qrH = qrW / aspect;
    if (qrH > maxQrH) {
      qrH = maxQrH;
      qrW = qrH * aspect;
    }

    // Ample gap below "Dukung Kreator" title (title is at -ph / 2 + 36)
    const topGap = 82;
    const qrY = -ph / 2 + topGap + qrH / 2;
    const qrSprite = this.add.sprite(0, qrY, 'qr');
    qrSprite.setDisplaySize(Math.round(qrW), Math.round(qrH));

    const descY = qrY + qrH / 2 + 22;
    const desc = new LocalizedText(this, 0, descY, 'donation.desc', {}, {
      fontSize: '13px',
      color: THEME.colors.arcadeYellowHex
    });
    desc.setWordWrapWidth(pw - 40);

    const thanksY = descY + 26;
    const thanks = new LocalizedText(this, 0, thanksY, 'donation.thanks', {}, {
      fontSize: '14px',
      color: THEME.colors.slimeGreenHex,
      isHud: true
    });

    d.add([qrSprite, desc, thanks]);
    this.currentPopup = popup;
  }

  openSettingsPopup() {
    if (this.currentPopup) return;
    this.currentPopup = new SettingsPopup(this, {
      onClose: () => {
        this.currentPopup = null;
      }
    });
  }


}

