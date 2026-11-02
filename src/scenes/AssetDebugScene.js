// src/scenes/AssetDebugScene.js
// Phase 1 Asset pipeline verification scene: displays all candies, bosses, minions, and sound board.
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';
import { TopBar } from '../ui/TopBar.js';
import { Panel } from '../ui/Panel.js';
import { Button } from '../ui/Button.js';
import { InkText } from '../ui/InkText.js';
import { SpriteFit } from '../ui/SpriteFit.js';
import { AssetResolver } from '../systems/AssetResolver.js';
import { AudioManager } from '../systems/AudioManager.js';
import { LayoutManager } from '../systems/LayoutManager.js';
import { CANDIES_CONFIG } from '../config/candies.config.js';

export class AssetDebugScene extends Phaser.Scene {
  constructor() {
    super('AssetDebug');
  }

  create() {
    this.topBar = new TopBar(this, {
      showMenuBtn: true,
      onMenuClick: () => this.scene.start('Battle')
    });

    this.container = this.add.container(0, 0);
    this.buildContent();

    this.unsubLayout = LayoutManager._game?.scale.on('resize', () => {
      this.layoutContent();
    });

    this.layoutContent();
  }

  buildContent() {
    // 1. Candies Row
    this.candyPanel = new Panel(this, 0, 0, 100, 100, {
      bgColor: THEME.colors.cardBg,
      radius: 16
    });
    this.candyTitle = new InkText(this, 0, 0, 'CANDIES (NORMALIZED 80%)', {
      fontSize: '14px',
      color: THEME.colors.arcadeYellowHex,
      isHud: true
    });
    this.candySprites = [];
    CANDIES_CONFIG.types.forEach((c) => {
      const key = AssetResolver.getCandyKey(this, c.key);
      const sprite = this.add.sprite(0, 0, key);
      this.candySprites.push({ key: c.key, sprite });
      this.container.add(sprite);
    });
    this.container.add([this.candyPanel, this.candyTitle]);

    // 2. Bosses Row
    this.bossPanel = new Panel(this, 0, 0, 100, 100, {
      bgColor: THEME.colors.cardBg,
      radius: 16
    });
    this.bossTitle = new InkText(this, 0, 0, 'BOSSES (PORTRAIT CONTAIN)', {
      fontSize: '14px',
      color: THEME.colors.punchMagentaHex,
      isHud: true
    });
    this.bossSprites = [];
    ['b1', 'b2', 'b3', 'b4', 'b5'].forEach((bKey) => {
      const key = AssetResolver.getBossKey(this, bKey);
      const sprite = this.add.sprite(0, 0, key);
      this.bossSprites.push({ key: bKey, sprite });
      this.container.add(sprite);
    });
    this.container.add([this.bossPanel, this.bossTitle]);

    // 3. Minions Row
    this.minionPanel = new Panel(this, 0, 0, 100, 100, {
      bgColor: THEME.colors.cardBg,
      radius: 16
    });
    this.minionTitle = new InkText(this, 0, 0, 'MINIONS', {
      fontSize: '14px',
      color: THEME.colors.slimeGreenHex,
      isHud: true
    });
    this.minionSprites = [];
    ['small', 'medium', 'large'].forEach((mKey) => {
      const key = AssetResolver.getMinionKey(this, mKey);
      const sprite = this.add.sprite(0, 0, key);
      this.minionSprites.push({ key: mKey, sprite });
      this.container.add(sprite);
    });
    this.container.add([this.minionPanel, this.minionTitle]);

    // 4. Sound Board Buttons
    this.soundTitle = new InkText(this, 0, 0, 'SOUND BOARD', {
      fontSize: '14px',
      color: THEME.colors.electricCyanHex,
      isHud: true
    });
    this.container.add(this.soundTitle);

    this.soundButtons = [];
    const sounds = [
      { label: 'BGM Menu', action: () => AudioManager.playBgm('bgm.menu') },
      { label: 'BGM Story', action: () => AudioManager.playBgm('bgm.story') },
      { label: 'BGM Time', action: () => AudioManager.playBgm('bgm.timekill') },
      { label: 'SFX Hit', action: () => AudioManager.playSfx('sfx.hit') },
      { label: 'SFX B1', action: () => AudioManager.playBossSfx(1) },
      { label: 'SFX B2', action: () => AudioManager.playBossSfx(2) },
      { label: 'SFX B3', action: () => AudioManager.playBossSfx(3) },
      { label: 'SFX B4', action: () => AudioManager.playBossSfx(4) },
      { label: 'SFX B5', action: () => AudioManager.playBossSfx(5) }
    ];

    sounds.forEach((s) => {
      const btn = new Button(this, 0, 0, 80, 44, {
        text: s.label,
        fontSize: '12px',
        bgColor: THEME.colors.playfieldTray,
        radius: 10,
        onClick: s.action
      });
      this.soundButtons.push(btn);
      this.container.add(btn);
    });
  }

  layoutContent() {
    const w = this.scale.width;
    const h = this.scale.height;
    const topH = 64;
    this.topBar.updateLayout(w, topH);

    const isSmall = w < 500;
    const contentW = w - 32;

    // Candies
    const candyY = topH + 30;
    this.candyPanel.setPosition(w / 2, candyY + 36);
    this.candyPanel.resize(contentW, 80);
    this.candyTitle.setPosition(w / 2, candyY + 6);

    const candyCell = Math.min(contentW / 7, 56);
    const startCandyX = w / 2 - (candyCell * 6) / 2 + candyCell / 2;
    this.candySprites.forEach(({ sprite }, idx) => {
      sprite.setPosition(startCandyX + idx * candyCell, candyY + 46);
      SpriteFit.fitCandy(sprite, candyCell);
    });

    // Bosses
    const bossY = candyY + 95;
    this.bossPanel.setPosition(w / 2, bossY + 46);
    this.bossPanel.resize(contentW, 100);
    this.bossTitle.setPosition(w / 2, bossY + 6);

    const bossSlotW = Math.min(contentW / 5.5, 75);
    const startBossX = w / 2 - (bossSlotW * 5) / 2;
    this.bossSprites.forEach(({ sprite }, idx) => {
      const slot = {
        x: startBossX + idx * bossSlotW,
        y: bossY + 16,
        width: bossSlotW - 8,
        height: 72
      };
      SpriteFit.fitPortrait(sprite, slot);
    });

    // Minions
    const minionY = bossY + 115;
    this.minionPanel.setPosition(w / 2, minionY + 46);
    this.minionPanel.resize(contentW, 95);
    this.minionTitle.setPosition(w / 2, minionY + 6);

    const minionSlotW = Math.min(contentW / 3.5, 110);
    const startMinionX = w / 2 - (minionSlotW * 3) / 2;
    this.minionSprites.forEach(({ sprite }, idx) => {
      const slot = {
        x: startMinionX + idx * minionSlotW,
        y: minionY + 16,
        width: minionSlotW - 12,
        height: 70
      };
      SpriteFit.fitPortrait(sprite, slot);
    });

    // Sounds
    const soundY = minionY + 110;
    this.soundTitle.setPosition(w / 2, soundY + 6);

    const cols = isSmall ? 3 : 5;
    const btnW = Math.min(contentW / (cols + 0.5), 100);
    const rowGap = 50;

    this.soundButtons.forEach((btn, idx) => {
      const c = idx % cols;
      const r = Math.floor(idx / cols);
      const rowCols = Math.min(cols, this.soundButtons.length - r * cols);
      const rowStartX = w / 2 - ((rowCols - 1) * (btnW + 8)) / 2;
      btn.setPosition(rowStartX + c * (btnW + 8), soundY + 40 + r * rowGap);
    });
  }
}

