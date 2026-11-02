// src/scenes/MemeBookScene.js
// Meme Book scene matching Meme_Book.png with section 6 corrections.
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';
import { MEMEBOOK_CONFIG } from '../config/memebook.config.js';
import { TopBar } from '../ui/TopBar.js';
import { Panel } from '../ui/Panel.js';
import { Button } from '../ui/Button.js';
import { InkText } from '../ui/InkText.js';
import { LocalizedText } from '../ui/LocalizedText.js';
import { SettingsPopup } from '../ui/SettingsPopup.js';
import { TutorialPopup } from '../ui/TutorialPopup.js';
import { LayoutManager } from '../systems/LayoutManager.js';
import { AudioManager } from '../systems/AudioManager.js';
import { AssetResolver } from '../systems/AssetResolver.js';
import { SaveManager } from '../systems/SaveManager.js';
import { EventBus } from '../systems/EventBus.js';
import {
  isEntryUnlocked,
  getEntryProgress,
  countUnlockedEntries
} from '../core/unlocks/memebook.js';
import { t } from '../i18n/index.js';

export class MemeBookScene extends Phaser.Scene {
  constructor() {
    super('MemeBook');
    this.entries = MEMEBOOK_CONFIG.entries;
    this.currentIndex = 0;
  }

  create() {
    AudioManager.playBgm('bgm.menu');

    this.topBar = new TopBar(this, {
      showMenuBtn: true,
      onMenuClick: () => this.scene.start('MainMenu'),
      onSettingsClick: () => this.openSettingsPopup()
    });

    this.mainContainer = this.add.container(0, 0);

    // Spread containers
    this.leftPage = this.add.container(0, 0);
    this.rightPage = this.add.container(0, 0);
    this.spineGraphics = this.add.graphics();
    this.bottomBar = this.add.container(0, 0);
    this.bottomBar.setDepth(20);

    this.mainContainer.add([this.spineGraphics, this.leftPage, this.rightPage, this.bottomBar]);

    // Navigation arrows
    this.prevBtn = new Button(this, 30, this.scale.height / 2, 48, 56, {
      text: '◀',
      bgColor: THEME.colors.arcadeYellow,
      textColor: '#FFFFFF',
      fontSize: '22px',
      radius: 12,
      onClick: () => this.navigate(-1)
    });
    this.prevBtn.setDepth(25);

    this.nextBtn = new Button(this, this.scale.width - 30, this.scale.height / 2, 48, 56, {
      text: '▶',
      bgColor: THEME.colors.arcadeYellow,
      textColor: '#FFFFFF',
      fontSize: '22px',
      radius: 12,
      onClick: () => this.navigate(1)
    });
    this.nextBtn.setDepth(25);

    // Bottom Bar components (created once)
    this.backBtn = new Button(this, -100, 0, 140, 44, {
      text: t('common.menu'),
      bgColor: THEME.colors.punchMagenta,
      textColor: '#FFFFFF',
      fontSize: '15px',
      radius: 12,
      onClick: () => {
        AudioManager.playSfx('sfx.click');
        this.scene.start('MainMenu');
      }
    });

    const totalCollected = countUnlockedEntries(SaveManager.data);
    this.pillPanel = new Panel(this, 100, 0, 190, 42, {
      bgColor: THEME.colors.cardBg,
      outlineColor: THEME.colors.electricCyan,
      radius: 12
    });
    this.pillText = new LocalizedText(
      this,
      100,
      0,
      'memebook.progress',
      { count: totalCollected, total: this.entries.length },
      { fontSize: '13px', color: THEME.colors.arcadeYellowHex, isHud: true }
    );

    this.bottomBar.add([this.backBtn, this.pillPanel, this.pillText]);

    // Input swipe support
    this.setupSwipeInput();

    // Event listeners
    this.unsubLayout = EventBus.on('layout:changed', (layout) => {
      this.applyLayout(layout);
    });

    this.unsubLang = EventBus.on('language:changed', () => {
      this.backBtn.setText(t('common.menu'));
      this.renderEntry();
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

  setupSwipeInput() {
    let startX = 0;
    let startY = 0;

    this.input.on('pointerdown', (pointer) => {
      startX = pointer.x;
      startY = pointer.y;
    });

    this.input.on('pointerup', (pointer) => {
      const dx = pointer.x - startX;
      const dy = pointer.y - startY;
      if (Math.abs(dx) > 60 && Math.abs(dy) < 50) {
        if (dx > 0) {
          this.navigate(-1);
        } else {
          this.navigate(1);
        }
      }
    });
  }

  navigate(direction) {
    const nextIndex = this.currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= this.entries.length) {
      return;
    }
    this.currentIndex = nextIndex;
    AudioManager.playSfx('sfx.click');
    this.renderEntry();
  }

  playEntrySfx(entry) {
    if (!entry) return;
    const save = SaveManager.data;
    if (!isEntryUnlocked(save, entry.id)) {
      return; // Do not play SFX if entry/boss is not defeated/unlocked
    }
    if (entry.kind === 'boss') {
      const stage = entry.stage || parseInt(entry.id.replace('b', ''), 10) || 1;
      AudioManager.playBossSfx(stage);
    } else {
      const candySfxKey = `sfx.candy.${entry.id}`;
      if (AudioManager.hasAudio(candySfxKey)) {
        AudioManager.playSfx(candySfxKey);
      } else {
        AudioManager.playSfx('sfx.hit');
      }
    }
  }

  applyLayout(layout) {
    const { width, height, orientation } = layout;

    this.topBar.updateLayout(width, 64);

    const isLand = orientation === 'landscape';
    const topOffset = 70;
    const bottomBarH = 60;
    const contentH = height - topOffset - bottomBarH;

    // Arrow buttons
    this.prevBtn.setPosition(28, topOffset + contentH / 2);
    this.nextBtn.setPosition(width - 28, topOffset + contentH / 2);

    this.spineGraphics.clear();

    if (isLand) {
      // Landscape: 2-page spread side by side
      const pageW = Math.min((width - 120) / 2, 440);
      const pageH = Math.min(contentH - 20, 480);
      const centerX = width / 2;
      const centerY = topOffset + contentH / 2;

      this.leftPage.setPosition(centerX - pageW / 2 - 10, centerY);
      this.rightPage.setPosition(centerX + pageW / 2 + 10, centerY);

      // Spine
      this.spineGraphics.lineStyle(3, THEME.colors.ink, 0.4);
      this.spineGraphics.lineBetween(centerX, centerY - pageH / 2 + 10, centerX, centerY + pageH / 2 - 10);
    } else {
      // Portrait: stacked
      const pageW = Math.min(width - 70, 400);
      const pageH = (contentH - 20) / 2;
      const centerX = width / 2;

      this.leftPage.setPosition(centerX, topOffset + pageH / 2);
      this.rightPage.setPosition(centerX, topOffset + pageH + 10 + pageH / 2);
    }

    // Bottom Bar
    const bY = height - bottomBarH / 2 - 5;
    this.bottomBar.setPosition(width / 2, bY);

    if (this.currentPopup) {
      this.currentPopup.reposition(width, height);
    }

    this.renderEntry();
  }

  openSettingsPopup() {
    if (this.currentPopup) return;
    this.currentPopup = new SettingsPopup(this, {
      onClose: () => {
        this.currentPopup = null;
      },
      onHowToPlay: () => {
        this.currentPopup = null;
        this.openTutorialPopup();
      }
    });
  }

  openTutorialPopup() {
    if (this.currentPopup) return;
    this.currentPopup = new TutorialPopup(this, {
      onClose: () => {
        this.currentPopup = null;
      }
    });
  }

  renderEntry() {
    const entry = this.entries[this.currentIndex];
    const save = SaveManager.data;
    const unlocked = isEntryUnlocked(save, entry.id);
    const progress = getEntryProgress(save, entry.id);

    // Update arrows enabled/disabled visual
    this.prevBtn.setAlpha(this.currentIndex === 0 ? 0.3 : 1);
    this.nextBtn.setAlpha(this.currentIndex === this.entries.length - 1 ? 0.3 : 1);

    // Update progress pill count
    const totalCollected = countUnlockedEntries(save);
    this.pillText.setParams({ count: totalCollected, total: this.entries.length });

    this.renderLeftPage(entry, unlocked);
    this.renderRightPage(entry, unlocked, progress);
  }

  renderLeftPage(entry, unlocked) {
    this.leftPage.removeAll(true);
    const isLand = LayoutManager.isLandscape();
    const pw = isLand ? Math.min((this.scale.width - 120) / 2, 440) : Math.min(this.scale.width - 70, 400);
    const ph = isLand ? Math.min(this.scale.height - 150, 480) : Math.max(160, (this.scale.height - 150) / 2);

    // Dark left page tray
    const tray = new Panel(this, 0, 0, pw, ph, {
      bgColor: THEME.colors.cardBg,
      outlineColor: THEME.colors.ink,
      radius: THEME.depth.panelRadius
    });
    this.leftPage.add(tray);

    // Polaroid card (white/cream paper, slightly tilted)
    const polW = Math.min(pw * 0.82, 280);
    const polH = Math.min(ph * 0.88, 360);
    const polaroid = this.add.container(0, 0);

    const polPaper = new Panel(this, 0, 0, polW, polH, {
      bgColor: 0xFAF6EE,
      outlineColor: THEME.colors.ink,
      radius: 12
    });

    // Photo frame area (square-ish dark box inside polaroid)
    const photoSize = Math.min(polW * 0.84, polH * 0.62);
    const photoY = -polH * 0.15;
    const photoBg = this.add.graphics();
    photoBg.fillStyle(THEME.colors.playfieldTray, 1);
    photoBg.fillRoundedRect(-photoSize / 2, photoY - photoSize / 2, photoSize, photoSize, 8);
    photoBg.lineStyle(2, THEME.colors.ink, 1);
    photoBg.strokeRoundedRect(-photoSize / 2, photoY - photoSize / 2, photoSize, photoSize, 8);

    polaroid.add([polPaper, photoBg]);

    // Sprite image
    let texKey = null;
    if (entry.kind === 'boss') {
      texKey = AssetResolver.getBossKey(this, entry.assetKey);
    } else {
      texKey = AssetResolver.getCandyKey(this, entry.assetKey);
    }

    const sprite = this.add.sprite(0, photoY, texKey);
    const maxBound = photoSize * 0.85;
    const sw = sprite.width || maxBound;
    const sh = sprite.height || maxBound;
    const aspect = sw / sh;
    if (aspect > 1) {
      sprite.setDisplaySize(maxBound, maxBound / aspect);
    } else {
      sprite.setDisplaySize(maxBound * aspect, maxBound);
    }

    if (unlocked) {
      polaroid.add(sprite);
      sprite.setInteractive({ useHandCursor: true });
      sprite.on('pointerup', () => this.playEntrySfx(entry));
    } else {
      // Silhouette (tinted pure black) - not interactive while locked
      sprite.setTint(0x000000);
      polaroid.add(sprite);

      // Red/Magenta "LOCKED" stamp tilted over photo
      const stamp = new InkText(this, 0, photoY, t('memebook.locked'), {
        fontSize: '24px',
        color: THEME.colors.punchMagentaHex,
        isTitle: true
      });
      stamp.setAngle(-18);
      polaroid.add(stamp);
    }

    // Paperclip on top-left of polaroid
    const clip = this.add.graphics();
    clip.lineStyle(4, 0x888888, 1);
    clip.strokeRoundedRect(-polW / 2 + 15, -polH / 2 - 8, 14, 28, 6);
    polaroid.add(clip);

    // Polaroid title below photo
    const titleText = unlocked ? entry.name : '???';
    const polTitle = new InkText(this, 0, polH * 0.30, titleText, {
      fontSize: '15px',
      color: THEME.colors.loreInkHex,
      isHud: true
    });
    polTitle.setWordWrapWidth(polW - 20);

    // Code bottom-right (e.g. #01) in crisp dark ink color for contrast
    const polCode = new InkText(this, polW / 2 - 30, polH / 2 - 20, entry.code, {
      fontSize: '15px',
      color: THEME.colors.inkHex,
      stroke: null,
      strokeThickness: 0,
      shadow: null,
      isHud: true
    });

    polaroid.add([polTitle, polCode]);
    polaroid.setAngle(-2);
    this.leftPage.add(polaroid);
  }

  renderRightPage(entry, unlocked, progress) {
    this.rightPage.removeAll(true);
    const isLand = LayoutManager.isLandscape();
    const pw = isLand ? Math.min((this.scale.width - 120) / 2, 440) : Math.min(this.scale.width - 70, 400);
    const ph = isLand ? Math.min(this.scale.height - 150, 480) : Math.max(160, (this.scale.height - 150) / 2);

    // Parchment / dossier background
    const dossier = new Panel(this, 0, 0, pw, ph, {
      bgColor: THEME.colors.parchment,
      outlineColor: THEME.colors.ink,
      radius: THEME.depth.panelRadius
    });
    this.rightPage.add(dossier);

    // Entry number "Entry n / 11" at top right
    const entryNum = new InkText(
      this,
      pw / 2 - 25,
      -ph / 2 + 24,
      t('memebook.entry', { n: this.currentIndex + 1, total: this.entries.length }),
      {
        fontSize: '14px',
        color: THEME.colors.loreInkHex,
        stroke: null,
        strokeThickness: 0,
        shadow: null,
        originX: 1,
        originY: 0,
        isHud: true
      }
    );

    this.rightPage.add([entryNum]);

    if (unlocked) {
      // SFX button positioned in bottom-right corner - ONLY unlocked when boss is defeated!
      const sfxBtnW = 120;
      const sfxBtnH = 38;
      const sfxX = pw / 2 - sfxBtnW / 2 - 20;
      const sfxY = ph / 2 - sfxBtnH / 2 - 18;
      const sfxBtn = new Button(this, sfxX, sfxY, sfxBtnW, sfxBtnH, {
        text: '🔊 SFX',
        bgColor: THEME.colors.slimeGreen,
        textColor: '#FFFFFF',
        fontSize: '14px',
        radius: 10,
        onClick: () => this.playEntrySfx(entry)
      });
      this.rightPage.add(sfxBtn);

      const isLongName = entry.name.length > 25 || entry.id === 'b5';
      const titleFontSize = isLongName ? (ph < 320 ? '13px' : '15px') : '22px';
      const titleY = -ph / 2 + 24;

      // Title with padding and proper anchor so it doesn't touch borders
      const title = new InkText(this, -pw / 2 + 25, titleY, entry.name, {
        fontSize: titleFontSize,
        color: THEME.colors.loreInkHex,
        stroke: null,
        strokeThickness: 0,
        shadow: null,
        originX: 0,
        originY: 0,
        isTitle: true
      });
      title.setWordWrapWidth(pw - 130);

      // Two Lore Paragraphs from CONTENT_LORE.md
      const p1Text = t(`lore.${entry.id}.p1`);
      const p2Text = t(`lore.${entry.id}.p2`);

      const wrapWidth = pw - 50;
      const fontSize = (ph < 320 || pw < 360) ? '11px' : (isLongName ? '12px' : '13px');
      const lineSpacing = ph < 320 ? 2 : (isLongName ? 3 : 4);
      // Dynamic startY with breathing room so paragraphs never collide with long titles
      const startY = Math.max(-ph / 2 + 75, titleY + title.height + (isLongName ? 14 : 16));

      const p1 = this.add.text(-pw / 2 + 25, startY, p1Text, {
        fontFamily: THEME.fonts.lore,
        fontSize,
        color: THEME.colors.loreInkHex,
        wordWrap: { width: wrapWidth },
        lineSpacing
      });

      const p1H = p1.height;
      const p2 = this.add.text(-pw / 2 + 25, startY + (isLongName ? 8 : 10) + p1H, p2Text, {
        fontFamily: THEME.fonts.lore,
        fontSize,
        color: THEME.colors.loreInkHex,
        wordWrap: { width: wrapWidth },
        lineSpacing
      });

      this.rightPage.add([title, p1, p2]);
    } else {
      // Locked state: show unlock hint and progress, NOT the lore
      const title = new InkText(this, 0, -ph * 0.22, t('memebook.locked'), {
        fontSize: '22px',
        color: THEME.colors.punchMagentaHex,
        isTitle: true
      });

      let hintMsg = '';
      if (entry.kind === 'boss') {
        hintMsg = t('memebook.hint.boss');
      } else {
        hintMsg = t('memebook.hint.candy', {
          current: progress.current,
          target: progress.target
        });
      }

      const hintText = this.add.text(0, -ph * 0.05, hintMsg, {
        fontFamily: THEME.fonts.lore,
        fontSize: '15px',
        color: THEME.colors.loreInkHex,
        align: 'center',
        wordWrap: { width: pw - 50 }
      });
      hintText.setOrigin(0.5);

      // Progress bar
      const barW = pw * 0.7;
      const barH = 18;
      const barY = ph * 0.15;
      const barG = this.add.graphics();
      barG.fillStyle(0xDDD3C0, 1);
      barG.fillRoundedRect(-barW / 2, barY - barH / 2, barW, barH, 6);
      barG.lineStyle(2, THEME.colors.ink, 1);
      barG.strokeRoundedRect(-barW / 2, barY - barH / 2, barW, barH, 6);

      const fillPct = Math.min(1, progress.current / progress.target);
      if (fillPct > 0) {
        barG.fillStyle(THEME.colors.slimeGreen, 1);
        barG.fillRoundedRect(-barW / 2, barY - barH / 2, barW * fillPct, barH, 6);
      }

      const barLabel = new InkText(this, 0, barY, `${progress.current} / ${progress.target}`, {
        fontSize: '11px',
        color: THEME.colors.inkHex,
        isHud: true
      });

      this.rightPage.add([title, hintText, barG, barLabel]);
    }
  }
}
