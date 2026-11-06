// src/scenes/StageSelectScene.js
// Stage Select matching Story_Mode_Map_Selection.png with section 6 corrections.
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';
import { BOSSES_CONFIG } from '../config/bosses.config.js';
import { TopBar } from '../ui/TopBar.js';
import { Panel } from '../ui/Panel.js';
import { Button } from '../ui/Button.js';
import { InkText } from '../ui/InkText.js';
import { LocalizedText } from '../ui/LocalizedText.js';
import { SettingsPopup } from '../ui/SettingsPopup.js';
import { SpriteFit } from '../ui/SpriteFit.js';
import { ScrollableText } from '../ui/ScrollableText.js';
import { BrainMap } from '../ui/BrainMap.js';
import { SCREEN_CONFIG } from '../config/screen.config.js';
import { LayoutManager } from '../systems/LayoutManager.js';
import { AssetResolver } from '../systems/AssetResolver.js';
import { AudioManager } from '../systems/AudioManager.js';
import { SaveManager } from '../systems/SaveManager.js';
import { StoryProgression } from '../core/progression/story.js';
import { EventBus } from '../systems/EventBus.js';
import { t } from '../i18n/index.js';

export class StageSelectScene extends Phaser.Scene {
  constructor() {
    super('StageSelect');
  }

  init(data) {
    // 'normal' or 'hard' (owner: Hard mode unlocks after Story Mode is finished)
    this.mode = data?.mode === 'hard' && StoryProgression.areExtraModesUnlocked() ? 'hard' : 'normal';
  }

  create() {
    // Stage select uses story BGM per ASSETS_SPEC 5
    AudioManager.playBgm('bgm.story');

    this.selectedStage = this.firstOpenStage();

    this.topBar = new TopBar(this, {
      showMenuBtn: true,
      onMenuClick: () => this.scene.start('MainMenu'),
      onSettingsClick: () => this.openSettingsPopup()
    });

    this.unsubSettings = EventBus.on('ui:openSettings', () => {
      this.openSettingsPopup();
    });

    this.mapContainer = this.add.container(0, 0);
    this.sidePanelContainer = this.add.container(0, 0);

    // Brain Map Panel (Left/Center)
    this.mapPanel = new Panel(this, 0, 0, 100, 100, {
      bgColor: THEME.colors.brainSurface,
      outlineColor: THEME.colors.ink,
      radius: THEME.depth.panelRadius
    });
    this.brainMap = new BrainMap(this);
    this.pathGraphics = this.add.graphics();
    this.hardTag = new InkText(this, 0, 0, t('stageselect.hardTag'), {
      fontSize: '16px',
      color: THEME.colors.punchMagentaHex,
      isTitle: true,
      originX: 0
    });
    this.mapContainer.add([this.mapPanel, this.brainMap, this.pathGraphics, this.hardTag]);

    // Create 5 Area Nodes
    this.nodeButtons = [];
    this.buildNodes();

    // Hard mode (yellow) and Boss Rush (red) buttons. Locked until Story Mode is finished.
    const mb = SCREEN_CONFIG.modeButtons;
    this.hardBtn = new Button(this, 0, 0, mb.width, mb.height, {
      text: ' ',
      bgColor: THEME.colors.arcadeYellow,
      textColor: '#FFFFFF',
      fontSize: '15px',
      radius: 12,
      onClick: () => this.toggleHardMode()
    });
    this.bossBtn = new Button(this, 0, 0, mb.width, mb.height, {
      text: ' ',
      bgColor: THEME.colors.bossRed,
      textColor: '#FFFFFF',
      fontSize: '15px',
      radius: 12,
      onClick: () => this.startBossRush()
    });
    this.hardBtn.setDepth(51);
    this.bossBtn.setDepth(51);
    this.refreshModeButtons();

    // Right Side Info Panel
    this.infoPanel = new Panel(this, 0, 0, 320, 500, {
      bgColor: THEME.colors.cardBg,
      outlineColor: THEME.colors.ink,
      radius: THEME.depth.panelRadius
    });
    this.sidePanelContainer.add(this.infoPanel);

    this.stageTitle = new InkText(this, 0, 0, `STAGE ${this.selectedStage}`, {
      fontSize: '28px',
      color: THEME.colors.arcadeYellowHex,
      isTitle: true
    });
    this.areaTitle = new InkText(this, 0, 0, '', {
      fontSize: '18px',
      color: THEME.colors.electricCyanHex,
      isHud: true
    });

    // Boss Portrait Box
    this.bossBox = new Panel(this, 0, 0, 220, 150, {
      bgColor: THEME.colors.playfieldTray,
      outlineColor: THEME.colors.ink,
      outlineWidth: 2,
      radius: 14
    });
    this.bossSprite = this.add.sprite(0, 0, 'placeholder_boss_b1');

    this.bossName = new InkText(this, 0, 0, '', {
      fontSize: '19px',
      color: THEME.colors.punchMagentaHex,
      isHud: true
    });

    // Boss Lore snippet inside scrollable text box
    this.bossDescBox = new ScrollableText(this, 0, 0, 280, 110, {
      fontSize: '13px',
      color: '#FFFFFF',
      bgColor: THEME.colors.playfieldTray,
      outlineColor: THEME.colors.ink,
      radius: 10,
      padding: 10
    });

    // Start Battle button
    this.startBtn = new Button(this, 0, 0, 250, 54, {
      text: t('stageselect.startBattle'),
      bgColor: THEME.colors.slimeGreen,
      textColor: '#FFFFFF',
      fontSize: '19px',
      radius: 14,
      onClick: () => this.startSelectedBattle()
    });

    this.sidePanelContainer.add([
      this.stageTitle,
      this.areaTitle,
      this.bossBox,
      this.bossSprite,
      this.bossName,
      this.bossDescBox,
      this.startBtn
    ]);

    // Bottom Bar Back Button (moved higher with comfortable padding)
    this.backBtn = new Button(this, 0, 0, 150, 46, {
      text: t('common.back'),
      bgColor: THEME.colors.playfieldTray,
      textColor: '#FFFFFF',
      fontSize: '15px',
      radius: 12,
      onClick: () => this.scene.start('MainMenu')
    });

    this.unsubLayout = EventBus.on('layout:changed', (layout) => {
      this.applyLayout(layout);
    });

    this.unsubLang = EventBus.on('language:changed', () => {
      this.updateSelectedStageInfo();
      this.refreshModeButtons();
      this.hardTag.setText(t('stageselect.hardTag'));
      this.backBtn.setText(t('common.back'));
    });

    this.updateSelectedStageInfo();
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

  // ── Mode helpers ─────────────────────────────────────────────────────────

  clearedCount() {
    const save = SaveManager.data;
    return (this.mode === 'hard' ? save.hardStageCleared : save.stageCleared) || 0;
  }

  isStageOpen(stage) {
    return this.mode === 'hard'
      ? StoryProgression.isHardStageUnlocked(stage)
      : StoryProgression.isStageUnlocked(stage);
  }

  firstOpenStage() {
    return Math.min(5, Math.max(1, this.clearedCount() + 1));
  }

  buildNodes() {
    this.nodeButtons.forEach((node) => node.destroy());
    this.nodeButtons = [];
    for (let s = 1; s <= 5; s++) {
      const node = this.createStageNode(s);
      this.nodeButtons.push(node);
      this.mapContainer.add(node);
    }
  }

  refreshModeButtons() {
    const unlocked = StoryProgression.areExtraModesUnlocked();
    const lock = unlocked ? '' : '🔒 ';
    const isHard = this.mode === 'hard';
    this.hardBtn.setText(lock + t(isHard ? 'stageselect.normalMode' : 'stageselect.hardMode'));
    this.hardBtn.options.bgColor = isHard ? THEME.colors.slimeGreen : THEME.colors.arcadeYellow;
    this.hardBtn.draw();
    this.bossBtn.setText(lock + t('stageselect.bossMode'));
    this.hardBtn.setAlpha(unlocked ? 1 : 0.6);
    this.bossBtn.setAlpha(unlocked ? 1 : 0.6);
    this.hardTag.setVisible(isHard);
  }

  showLockedNotice() {
    if (this.lockNotice) this.lockNotice.destroy();
    const { width, height } = this.scale;
    const txt = new InkText(this, width / 2, height / 2, t('stageselect.modesLocked'), {
      fontSize: '18px',
      color: THEME.colors.arcadeYellowHex,
      isHud: true
    });
    txt.setWordWrapWidth(Math.min(420, width - 40));
    txt.setDepth(120);
    this.lockNotice = txt;
    this.tweens.add({
      targets: txt,
      y: height / 2 - 40,
      alpha: 0,
      delay: 1200,
      duration: 600,
      onComplete: () => {
        txt.destroy();
        if (this.lockNotice === txt) this.lockNotice = null;
      }
    });
  }

  toggleHardMode() {
    if (!StoryProgression.areExtraModesUnlocked()) {
      this.showLockedNotice();
      return;
    }
    this.mode = this.mode === 'hard' ? 'normal' : 'hard';
    this.selectedStage = this.firstOpenStage();
    this.buildNodes();
    this.refreshModeButtons();
    this.updateSelectedStageInfo();
    this.applyLayout(LayoutManager.getLayout());
  }

  startBossRush() {
    if (!StoryProgression.areExtraModesUnlocked()) {
      this.showLockedNotice();
      return;
    }
    this.scene.start('Battle', { mode: 'bossRush' });
  }

  createStageNode(stage) {
    const isUnlocked = this.isStageOpen(stage);
    const isCleared = this.clearedCount() >= stage;
    const isBossFinal = stage === 5;

    // Bigger nodes to fill the map
    const size = isBossFinal ? 88 : 72;
    const container = this.add.container(0, 0);

    let bgColor = THEME.colors.mutedGrey;
    if (isCleared) bgColor = THEME.colors.slimeGreen;
    else if (isUnlocked) bgColor = THEME.colors.arcadeYellow;

    // Selection glow ring (visible when selected)
    const selectRing = this.add.graphics();
    selectRing.lineStyle(4, THEME.colors.arcadeYellow, 1);
    selectRing.strokeCircle(0, 0, size / 2 + 6);
    selectRing.setVisible(stage === this.selectedStage);

    const panel = new Panel(this, 0, 0, size, size, {
      bgColor,
      outlineColor: THEME.colors.ink,
      outlineWidth: 3,
      radius: Math.floor(size / 2)
    });

    const label = new InkText(this, 0, -1, isUnlocked ? `${stage}` : '🔒', {
      fontSize: isBossFinal ? '28px' : '24px',
      color: '#FFFFFF',
      isHud: true
    });

    const areaName = BOSSES_CONFIG.stages[stage].areaName;
    const nameText = new InkText(this, 0, size / 2 + 16, areaName, {
      fontSize: '14px',
      color: '#FFFFFF'
    });
    nameText.setWordWrapWidth(110);

    container.add([selectRing, panel, label, nameText]);
    container.setSize(size, size);

    if (isUnlocked) {
      container.setInteractive({ useHandCursor: true });
      container.on('pointerup', () => {
        AudioManager.playSfx('sfx.click');
        this.selectedStage = stage;
        this.updateSelectedStageInfo();
        this.updateNodeHighlights();
      });
    }

    container.selectRing = selectRing;
    container.stageNum = stage;
    container.nodeSize = size;
    container.circleParts = [selectRing, panel, label];
    container.nameText = nameText;
    return container;
  }

  // Shrink the node circles on short maps (phones sideways). The area names keep their font size
  // so they stay readable; they just move up with the smaller circle.
  scaleNodes() {
    const scale = this.brainMap.nodeScale();
    this.nodeButtons.forEach((node) => {
      node.circleParts.forEach((part) => part.setScale(scale));
      node.nameText.setY((node.nodeSize / 2) * scale + 14);
      node.setSize(node.nodeSize * scale, node.nodeSize * scale);
      if (node.input) node.input.hitArea.setSize(node.nodeSize * scale, node.nodeSize * scale);
    });
  }

  updateNodeHighlights() {
    this.nodeButtons.forEach((node) => {
      if (node.selectRing) {
        node.selectRing.setVisible(node.stageNum === this.selectedStage);
      }
    });
  }

  updateSelectedStageInfo() {
    const s = this.selectedStage;
    const bossData = BOSSES_CONFIG.stages[s];
    const isUnlocked = this.isStageOpen(s);
    const isHard = this.mode === 'hard';

    this.stageTitle.setText(isHard ? t('stageselect.hardStage', { n: s }) : `STAGE ${s}`);
    this.stageTitle.setColor(isHard ? THEME.colors.punchMagentaHex : THEME.colors.arcadeYellowHex);
    this.areaTitle.setText(bossData.areaName);
    this.bossName.setText(bossData.name);

    // Full lore paragraph 1 inside the scrollable description box
    const loreText = t(`lore.${bossData.assetKey}.p1`);
    this.bossDescBox.setText(loreText);

    // Boss texture
    const tex = AssetResolver.getBossKey(this, bossData.assetKey);
    this.bossSprite.setTexture(tex);
    const boxW = this.bossBox.panelWidth || 220;
    const boxH = this.bossBox.panelHeight || 150;
    SpriteFit.fitContain(this.bossSprite, boxW - 24, boxH - 24);

    // Button state
    if (isUnlocked) {
      this.startBtn.setEnabled(true);
      this.startBtn.setText(t('stageselect.startBattle'));
    } else {
      this.startBtn.setEnabled(false);
      this.startBtn.setText(t(isHard ? 'stageselect.lockedHard' : 'stageselect.lockedNotice', { n: s - 1 }));
    }

    this.updateNodeHighlights();
  }

  startSelectedBattle() {
    if (this.mode === 'hard') {
      this.scene.start('Battle', { stage: this.selectedStage, mode: 'hard' });
      return;
    }
    StoryProgression.onStartStage(this.selectedStage);

    // If starting stage, show short area intro first
    const storyKey = `story.area${this.selectedStage}`;
    this.scene.start('StoryText', {
      key: storyKey,
      nextScene: 'Battle',
      nextSceneData: { stage: this.selectedStage }
    });
  }

  applyLayout(layout) {
    const { width, height, isLandscape, topBar } = layout;
    const mb = SCREEN_CONFIG.modeButtons;
    const modesInTopBar = width >= mb.topBarMinWidth;
    this.topBar.setReserveRight(modesInTopBar ? mb.width * 2 + mb.gap * 3 : 0);
    this.topBar.updateLayout(width, topBar.height);

    // Dedicated bottom bar height (56px) to keep Back button comfortably elevated
    const bottomReserved = 68;
    const topY = topBar.height + 8;
    const contentH = height - topY - bottomReserved;

    if (isLandscape) {
      const marginX = Math.max(16, width * 0.02);
      const gap = 16;
      const availW = width - marginX * 2 - gap;

      // Make right side panel comfortably wide and filled
      const sideW = Math.round(Math.min(420, Math.max(310, availW * 0.38)));
      const mapW = availW - sideW;

      this.mapContainer.setPosition(marginX + mapW / 2, topY + contentH / 2);
      this.mapPanel.resize(mapW, contentH);

      // The Back button only sits under the map, so on short screens the info panel can use
      // the full height down to the bottom margin.
      const sideH = height < 500 ? height - topY - 8 : contentH;
      this.sidePanelContainer.setPosition(marginX + mapW + gap + sideW / 2, topY + sideH / 2);
      this.infoPanel.resize(sideW, sideH);

      this.placeBrainAndNodes(mapW, contentH);
      this.layoutSidePanel(sideW, sideH);

      // Back button positioned higher from screen bottom with ample clearance
      this.backBtn.resize(150, 46);
      this.backBtn.setPosition(100, height - 38);
      this.layoutModeButtons(modesInTopBar, 100 + 75 + mb.gap, height - 38);
    } else {
      // Portrait
      const mapW = width - 24;
      const mapH = Math.round(contentH * 0.44);
      const sideW = width - 24;
      const sideH = contentH - mapH - 12;

      this.mapContainer.setPosition(width / 2, topY + mapH / 2);
      this.mapPanel.resize(mapW, mapH);

      this.sidePanelContainer.setPosition(width / 2, topY + mapH + 12 + sideH / 2);
      this.infoPanel.resize(sideW, sideH);

      this.placeBrainAndNodes(mapW, mapH);
      this.layoutSidePanel(sideW, sideH);

      if (modesInTopBar) {
        // Back button centered and elevated in portrait
        this.backBtn.resize(150, 46);
        this.backBtn.setPosition(width / 2, height - 38);
        this.layoutModeButtons(true);
      } else {
        // Back on the left, the two mode buttons on its right
        const btnW = Math.min(mb.width, (width - 24 - mb.gap * 2) / 3);
        this.backBtn.resize(btnW, 46);
        this.backBtn.setPosition(12 + btnW / 2, height - 38);
        this.layoutModeButtons(false, 12 + btnW + mb.gap, height - 38, btnW);
      }
    }

    if (this.currentPopup) {
      this.currentPopup.reposition(width, height);
    }

    // Refresh sprite fit to updated bossBox dimensions
    if (this.bossSprite.texture) {
      SpriteFit.fitContain(this.bossSprite, this.bossBox.panelWidth - 24, this.bossBox.panelHeight - 24);
    }
  }

  layoutSidePanel(sideW, sideH) {
    // Vertical layout across the full panel height. Short panels (phones sideways) use tighter
    // spacing, a smaller boss box and button, and hide the lore box if there is no room for it.
    const compact = sideH < 400;
    const topH = -sideH / 2;
    const botH = sideH / 2;

    // Header (Stage & Area Titles)
    const stageY = topH + (compact ? 22 : 32);
    const areaY = stageY + (compact ? 24 : 30);
    this.stageTitle.setPosition(0, stageY);
    this.areaTitle.setPosition(0, areaY);

    // Boss Portrait Box
    const boxW = Math.min(sideW - 36, 260);
    const boxH = compact
      ? Math.min(120, Math.max(64, Math.round(sideH * 0.27)))
      : Math.min(170, Math.max(110, Math.round(sideH * 0.28)));
    const bossCenterY = areaY + (compact ? 14 : 20) + boxH / 2;
    this.bossBox.setPosition(0, bossCenterY);
    this.bossBox.resize(boxW, boxH);
    this.bossSprite.setPosition(0, bossCenterY);

    // Boss Name
    this.bossName.setWordWrapWidth(sideW - 32);
    const nameH = this.bossName.height || 20;
    const nameY = bossCenterY + boxH / 2 + (compact ? 6 : 8) + nameH / 2;
    this.bossName.setPosition(0, nameY);

    // Bottom section: Start Button
    const btnW = Math.min(sideW - 36, 280);
    const btnH = compact ? 44 : 52;
    const startBtnY = botH - (compact ? 10 : 14) - btnH / 2;
    this.startBtn.setPosition(0, startBtnY);
    this.startBtn.resize(btnW, btnH);

    // Middle section: scrollable description box in the space that is left
    const descTopLimit = nameY + nameH / 2 + (compact ? 6 : 12);
    const descBottomLimit = startBtnY - btnH / 2 - (compact ? 6 : 12);
    const availableDescH = descBottomLimit - descTopLimit;
    const minDescH = 40;
    this.bossDescBox.setVisible(availableDescH >= minDescH);
    if (availableDescH >= minDescH) {
      this.bossDescBox.setPosition(0, descTopLimit + availableDescH / 2);
      this.bossDescBox.resize(sideW - 32, availableDescH);
    }
  }

  // Brain fills the map panel; the nodes sit on their brain areas and keep a readable size.
  placeBrainAndNodes(mapW, mapH) {
    this.brainMap.setPosition(0, 0);
    this.brainMap.fit(mapW, mapH);
    this.brainMap.draw(this.clearedCount());
    const coords = this.brainMap.nodePositions();
    this.drawDashedPath(coords);
    this.nodeButtons.forEach((node, idx) => node.setPosition(coords[idx].x, coords[idx].y));
    this.scaleNodes();
    this.hardTag.setPosition(-mapW / 2 + 18, -mapH / 2 + 18);
  }

  // Mode buttons: in the top bar left of its own buttons (wide screens), else in the bottom
  // row starting at leftX.
  layoutModeButtons(inTopBar, leftX = 0, rowY = 0, btnW = SCREEN_CONFIG.modeButtons.width) {
    const mb = SCREEN_CONFIG.modeButtons;
    this.hardBtn.resize(btnW, mb.height);
    this.bossBtn.resize(btnW, mb.height);
    if (inTopBar) {
      const y = this.topBar.barHeight / 2;
      const right = this.topBar.buttonsLeftX - mb.gap * 2;
      this.bossBtn.setPosition(right - btnW / 2, y);
      this.hardBtn.setPosition(right - btnW * 1.5 - mb.gap, y);
    } else {
      this.hardBtn.setPosition(leftX + btnW / 2, rowY);
      this.bossBtn.setPosition(leftX + btnW * 1.5 + mb.gap, rowY);
    }
  }

  drawDashedPath(coords) {
    this.pathGraphics.clear();

    // Under glow path
    this.pathGraphics.lineStyle(6, THEME.colors.arcadeYellow, 0.25);
    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i];
      const p2 = coords[i + 1];
      this.pathGraphics.beginPath();
      this.pathGraphics.moveTo(p1.x, p1.y);
      this.pathGraphics.lineTo(p2.x, p2.y);
      this.pathGraphics.strokePath();
    }

    // Main dashed road
    this.pathGraphics.lineStyle(3, THEME.colors.arcadeYellow, 0.95);
    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i];
      const p2 = coords[i + 1];
      this.pathGraphics.beginPath();
      this.pathGraphics.moveTo(p1.x, p1.y);
      this.pathGraphics.lineTo(p2.x, p2.y);
      this.pathGraphics.strokePath();
    }
  }
}
