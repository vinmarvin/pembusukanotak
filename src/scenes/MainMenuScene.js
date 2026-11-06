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
      subParams: { unlocked: achCount, total: 5 },
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
    const achCount = ACHIEVEMENTS_CONFIG.list.filter((ach) => Boolean(save?.achievements && save.achievements[ach.id])).length;
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

    const pw = Math.min(this.scale.width * 0.88, 440);
    const ph = Math.min(this.scale.height * 0.88, 420);

    const popup = new Popup(this, pw, ph, {
      title: t('credits.title'),
      onClose: () => {
        this.currentPopup = null;
      }
    });

    const d = popup.dialog;

    // Main credits text
    const content = new LocalizedText(this, 0, -ph * 0.32, 'credits.content', {}, {
      fontSize: '14px',
      color: '#FFFFFF'
    });
    content.setWordWrapWidth(pw - 50);
    d.add(content);

    // ── Clickable credit links ───────────────────────────────────────────
    // "Music & SFX: Pixabay" → opens Pixabay
    const pixabayLabel = new InkText(this, 0, -ph * 0.11, t('credits.musicCredit'), {
      fontSize: '13px',
      color: THEME.colors.electricCyanHex
    });
    pixabayLabel.setInteractive({ useHandCursor: true });
    pixabayLabel.on('pointerup', () => {
      window.open('https://pixabay.com', '_blank');
    });
    pixabayLabel.on('pointerover', () => pixabayLabel.setAlpha(0.75));
    pixabayLabel.on('pointerout',  () => pixabayLabel.setAlpha(1));
    d.add(pixabayLabel);

    // "Sound Effects: VP Masti" → opens YouTube channel
    const vpLabel = new InkText(this, 0, -ph * 0.11 + 22, t('credits.sfxCredit'), {
      fontSize: '13px',
      color: THEME.colors.electricCyanHex
    });
    vpLabel.setInteractive({ useHandCursor: true });
    vpLabel.on('pointerup', () => {
      window.open('https://youtube.com/@vpmasti-098?si=yq0uFxD8w9eRc6MB', '_blank');
    });
    vpLabel.on('pointerover', () => vpLabel.setAlpha(0.75));
    vpLabel.on('pointerout',  () => vpLabel.setAlpha(1));
    d.add(vpLabel);

    // Support button
    const supportBtn = new Button(this, 0, ph * 0.28, 220, 48, {
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

