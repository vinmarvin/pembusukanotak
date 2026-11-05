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

  create() {
    // Stage select uses story BGM per ASSETS_SPEC 5
    AudioManager.playBgm('bgm.story');

    const save = SaveManager.data;
    const initialStage = Math.min(5, Math.max(1, (save.stageCleared || 0) + 1));
    this.selectedStage = initialStage;

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
    this.brainDecoGraphics = this.add.graphics();
    this.pathGraphics = this.add.graphics();
    this.mapContainer.add([this.mapPanel, this.brainDecoGraphics, this.pathGraphics]);

    // Create 5 Area Nodes
    this.nodeButtons = [];
    for (let s = 1; s <= 5; s++) {
      const node = this.createStageNode(s);
      this.nodeButtons.push(node);
      this.mapContainer.add(node);
    }

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

  createStageNode(stage) {
    const isUnlocked = StoryProgression.isStageUnlocked(stage);
    const isCleared = (SaveManager.data.stageCleared || 0) >= stage;
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
  scaleNodes(mapH) {
    const scale = Math.min(1, Math.max(0.6, mapH / 420));
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
    const isUnlocked = StoryProgression.isStageUnlocked(s);

    this.stageTitle.setText(`STAGE ${s}`);
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
      this.startBtn.setText(t('stageselect.lockedNotice', { n: s - 1 }));
    }

    this.updateNodeHighlights();
  }

  startSelectedBattle() {
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

      // Node positions spread across the brain map
      const nodeCoords = [
        { x: -mapW * 0.36, y: contentH * 0.28 },
        { x: -mapW * 0.22, y: -contentH * 0.20 },
        { x: -mapW * 0.02, y: -contentH * 0.28 },
        { x: mapW * 0.24, y: -contentH * 0.12 },
        { x: mapW * 0.20, y: contentH * 0.24 }
      ];

      this.drawBrainDecoration(mapW, contentH);
      this.drawDashedPath(nodeCoords);
      this.nodeButtons.forEach((node, idx) => {
        node.setPosition(nodeCoords[idx].x, nodeCoords[idx].y);
      });

      this.scaleNodes(contentH);
      this.layoutSidePanel(sideW, sideH);

      // Back button positioned higher from screen bottom with ample clearance
      this.backBtn.setPosition(100, height - 38);
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

      const nodeCoords = [
        { x: -mapW * 0.36, y: mapH * 0.22 },
        { x: -mapW * 0.20, y: -mapH * 0.22 },
        { x: 0, y: mapH * 0.16 },
        { x: mapW * 0.20, y: -mapH * 0.22 },
        { x: mapW * 0.36, y: mapH * 0.22 }
      ];

      this.drawBrainDecoration(mapW, mapH);
      this.drawDashedPath(nodeCoords);
      this.nodeButtons.forEach((node, idx) => {
        node.setPosition(nodeCoords[idx].x, nodeCoords[idx].y);
      });

      this.scaleNodes(mapH);
      this.layoutSidePanel(sideW, sideH);

      // Back button centered and elevated in portrait
      this.backBtn.setPosition(width / 2, height - 38);
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

  drawBrainDecoration(mapW, mapH) {
    this.brainDecoGraphics.clear();
    // Subtle faint brain hemisphere contours and gyri grooves
    this.brainDecoGraphics.lineStyle(2, THEME.colors.ink, 0.22);

    const rx = mapW * 0.44;
    const ry = mapH * 0.42;

    // Outer faint lobes
    this.brainDecoGraphics.strokeEllipse(0, 0, rx * 2, ry * 2);

    // Hemispheric fissure curve down the center
    this.brainDecoGraphics.beginPath();
    this.brainDecoGraphics.moveTo(0, -ry);
    this.brainDecoGraphics.lineTo(0, ry);
    this.brainDecoGraphics.strokePath();

    // Subtle curved lateral sulci ripples
    this.brainDecoGraphics.strokeCircle(-rx * 0.45, -ry * 0.15, rx * 0.35);
    this.brainDecoGraphics.strokeCircle(rx * 0.45, -ry * 0.15, rx * 0.35);
    this.brainDecoGraphics.strokeCircle(-rx * 0.35, ry * 0.35, rx * 0.3);
    this.brainDecoGraphics.strokeCircle(rx * 0.35, ry * 0.35, rx * 0.3);
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
