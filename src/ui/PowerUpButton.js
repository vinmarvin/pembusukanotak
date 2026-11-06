// src/ui/PowerUpButton.js
// Hard mode power-up button (owner mockup: green heal, orange damage boost left of the board).
// A square tile that fills up from the bottom while it charges, pulses when ready, and shows a
// status caption underneath ("37/100", "42s", "READY!").
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';
import { InkText } from './InkText.js';
import { AudioManager } from '../systems/AudioManager.js';

export class PowerUpButton extends Phaser.GameObjects.Container {
  constructor(scene, options = {}) {
    super(scene, 0, 0);
    this.color = options.color ?? THEME.colors.slimeGreen;
    this.onClick = options.onClick || null;
    this.size = 72;
    this.progress = 0;
    this.ready = false;
    this.active = false;

    this.shadow = scene.add.graphics();
    this.tile = scene.add.graphics();
    this.icon = new InkText(scene, 0, -4, options.icon || '?', { fontSize: '30px', color: '#FFFFFF', isHud: true });
    this.title = new InkText(scene, 0, 0, '', { fontSize: '13px', color: '#FFFFFF', isHud: true });
    this.caption = new InkText(scene, 0, 0, '', { fontSize: '12px', color: THEME.colors.arcadeYellowHex, isHud: true });
    this.add([this.shadow, this.tile, this.icon, this.title, this.caption]);

    this.setSize(this.size, this.size);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerup', () => {
      if (!this.ready || !this.onClick) return;
      AudioManager.playSfx('sfx.click');
      this.onClick();
    });

    this.draw();
    scene.add.existing(this);
  }

  // Total height including the caption under the tile
  get fullHeight() {
    return this.size + 36;
  }

  resize(size) {
    this.size = Math.max(48, Math.round(size));
    this.setSize(this.size, this.size);
    if (this.input) this.input.hitArea.setSize(this.size, this.size);
    this.icon.setFontSize(`${Math.round(this.size * 0.4)}px`);
    this.draw();
  }

  setTitle(text) {
    this.title.setText(text);
  }

  // progress 0..1 (how charged), ready = can be used now, active = effect running
  setState({ progress = 0, ready = false, active = false, caption = '' }) {
    const changed = progress !== this.progress || ready !== this.ready || active !== this.active;
    this.progress = Math.max(0, Math.min(1, progress));
    this.active = active;
    if (ready !== this.ready) {
      this.ready = ready;
      this.updatePulse();
    }
    if (this.caption.text !== caption) this.caption.setText(caption);
    if (changed) this.draw();
  }

  updatePulse() {
    if (this.pulse) {
      this.pulse.stop();
      this.pulse = null;
      this.tile.setScale(1);
      this.icon.setScale(1);
    }
    if (this.ready) {
      this.pulse = this.scene.tweens.add({
        targets: [this.icon],
        scale: 1.15,
        duration: 420,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  draw() {
    const s = this.size;
    const r = Math.round(s * 0.18);
    const g = this.tile;
    this.shadow.clear();
    g.clear();

    this.shadow.fillStyle(THEME.colors.hardShadow, 1);
    this.shadow.fillRoundedRect(-s / 2, -s / 2 + THEME.depth.shadowOffset, s, s, r);

    // Empty (dark) tile, then the charged part filled from the bottom
    g.fillStyle(THEME.colors.playfieldTray, 1);
    g.fillRoundedRect(-s / 2, -s / 2, s, s, r);
    const fillH = s * (this.ready || this.active ? 1 : this.progress);
    if (fillH > 0) {
      g.fillStyle(this.color, this.ready || this.active ? 1 : 0.55);
      if (fillH >= s - 1) {
        g.fillRoundedRect(-s / 2, -s / 2, s, s, r);
      } else {
        g.fillRect(-s / 2 + 3, s / 2 - fillH, s - 6, Math.max(0, fillH - 3));
      }
    }

    const outline = this.active ? THEME.colors.white : this.ready ? THEME.colors.arcadeYellow : THEME.colors.ink;
    g.lineStyle(this.ready || this.active ? 4 : 3, outline, 1);
    g.strokeRoundedRect(-s / 2, -s / 2, s, s, r);

    this.icon.setAlpha(this.ready || this.active ? 1 : 0.55);
    this.title.setPosition(0, s / 2 + 14);
    this.caption.setPosition(0, s / 2 + 29);
  }

  destroy(fromScene) {
    if (this.pulse) this.pulse.stop();
    super.destroy(fromScene);
  }
}
