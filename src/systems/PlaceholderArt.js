// src/systems/PlaceholderArt.js
// Generates procedural canvas textures for missing visual assets.
import { THEME } from '../config/theme.config.js';
import { CANDIES_CONFIG } from '../config/candies.config.js';

export class PlaceholderArt {
  static createAllPlaceholders(scene) {
    this.createCandyPlaceholders(scene);
    this.createBossPlaceholders(scene);
    this.createMinionPlaceholders(scene);
    this.createSpecialPlaceholders(scene);
  }

  static createCandyPlaceholders(scene) {
    for (const candy of CANDIES_CONFIG.types) {
      const key = `placeholder_candy_${candy.key}`;
      if (scene.textures.exists(key)) continue;

      const size = 128;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      // Outer rounded square / token
      const pad = 12;
      const r = 24;
      ctx.fillStyle = candy.colorHex;
      ctx.strokeStyle = THEME.colors.inkHex;
      ctx.lineWidth = 8;

      ctx.beginPath();
      ctx.roundRect(pad, pad, size - pad * 2, size - pad * 2, r);
      ctx.fill();
      ctx.stroke();

      // Inner highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.arc(size * 0.35, size * 0.35, 14, 0, Math.PI * 2);
      ctx.fill();

      // Candy Code label
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(candy.code, size / 2, size / 2 + 2);

      scene.textures.addCanvas(key, canvas);
    }
  }

  static createBossPlaceholders(scene) {
    const bosses = ['b1', 'b2', 'b3', 'b4', 'b5'];
    bosses.forEach((bKey, idx) => {
      const key = `placeholder_boss_${bKey}`;
      if (scene.textures.exists(key)) return;

      const w = 240;
      const h = 240;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      // Threatening boss silhouette / blob
      ctx.fillStyle = THEME.colors.punchMagentaHex;
      ctx.strokeStyle = THEME.colors.inkHex;
      ctx.lineWidth = 8;

      ctx.beginPath();
      ctx.roundRect(10, 10, w - 20, h - 20, 36);
      ctx.fill();
      ctx.stroke();

      // Eyes
      ctx.fillStyle = THEME.colors.arcadeYellowHex;
      ctx.beginPath();
      ctx.arc(w * 0.35, h * 0.38, 16, 0, Math.PI * 2);
      ctx.arc(w * 0.65, h * 0.38, 16, 0, Math.PI * 2);
      ctx.fill();

      // Label
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`BOSS ${idx + 1}`, w / 2, h * 0.72);

      scene.textures.addCanvas(key, canvas);
    });
  }

  static createMinionPlaceholders(scene) {
    const minions = [
      { key: 'small', label: 'SMALL', w: 140, h: 140, color: '#9E9D24' },
      { key: 'medium', label: 'MED', w: 180, h: 180, color: '#E65100' },
      { key: 'large', label: 'LARGE', w: 220, h: 220, color: '#C2185B' }
    ];

    minions.forEach((m) => {
      const key = `placeholder_minion_${m.key}`;
      if (scene.textures.exists(key)) return;

      const canvas = document.createElement('canvas');
      canvas.width = m.w;
      canvas.height = m.h;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = m.color;
      ctx.strokeStyle = THEME.colors.inkHex;
      ctx.lineWidth = 6;

      ctx.beginPath();
      ctx.roundRect(8, 8, m.w - 16, m.h - 16, 20);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(m.label, m.w / 2, m.h / 2);

      scene.textures.addCanvas(key, canvas);
    });
  }

  static createSpecialPlaceholders(scene) {
    // Player portrait placeholder
    if (!scene.textures.exists('placeholder_player')) {
      const w = 180;
      const h = 180;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = THEME.colors.slimeGreenHex;
      ctx.strokeStyle = THEME.colors.inkHex;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.roundRect(6, 6, w - 12, h - 12, 24);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = THEME.colors.inkHex;
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('OTAK SEHAT', w / 2, h / 2);

      scene.textures.addCanvas('placeholder_player', canvas);
    }

    // QR placeholder
    if (!scene.textures.exists('placeholder_qr')) {
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, size - 8, size - 8);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('QR CODE', size / 2, size / 2 - 20);
      ctx.font = '16px sans-serif';
      ctx.fillText('[Donation Placeholder]', size / 2, size / 2 + 20);

      scene.textures.addCanvas('placeholder_qr', canvas);
    }
  }
}
