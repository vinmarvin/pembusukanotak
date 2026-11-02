// src/systems/AssetResolver.js
// Resolves logical asset keys to loaded Phaser textures or placeholder keys.
import { ASSETS_MANIFEST } from '../config/assets.generated.js';

export class AssetResolver {
  static getTextureKey(scene, logicalKey) {
    // 1. Check if the exact key exists directly in textures
    if (scene.textures && scene.textures.exists(logicalKey)) {
      return logicalKey;
    }

    // 2. Check manifest
    if (ASSETS_MANIFEST && ASSETS_MANIFEST.images && ASSETS_MANIFEST.images[logicalKey]) {
      const manifestKey = ASSETS_MANIFEST.images[logicalKey].key || logicalKey;
      if (scene.textures && scene.textures.exists(manifestKey)) {
        return manifestKey;
      }
    }

    // 3. Fallback to appropriate placeholder texture
    if (logicalKey.startsWith('c') || ['nugget', 'skibidi', 'lirili', 'udin', 'bluberini'].includes(logicalKey)) {
      const pKey = `placeholder_candy_${logicalKey}`;
      if (scene.textures && scene.textures.exists(pKey)) return pKey;
    }

    if (logicalKey.startsWith('b')) {
      const pKey = `placeholder_boss_${logicalKey}`;
      if (scene.textures && scene.textures.exists(pKey)) return pKey;
    }

    if (['small', 'medium', 'large'].includes(logicalKey)) {
      const pKey = `placeholder_minion_${logicalKey}`;
      if (scene.textures && scene.textures.exists(pKey)) return pKey;
    }

    if (logicalKey === 'player') {
      const pKey = 'placeholder_player';
      if (scene.textures && scene.textures.exists(pKey)) return pKey;
    }

    if (logicalKey === 'qr') {
      const pKey = 'placeholder_qr';
      if (scene.textures && scene.textures.exists(pKey)) return pKey;
    }

    // Default fallback
    return '__DEFAULT';
  }

  static getCandyKey(scene, candyTypeOrKey) {
    const candyKeys = ['c67', 'nugget', 'skibidi', 'lirili', 'udin', 'bluberini'];
    const key = typeof candyTypeOrKey === 'number' ? candyKeys[candyTypeOrKey] : candyTypeOrKey;
    return this.getTextureKey(scene, key);
  }

  static getBossKey(scene, stageOrKey) {
    const bossKey = typeof stageOrKey === 'number' ? `b${stageOrKey}` : stageOrKey;
    return this.getTextureKey(scene, bossKey);
  }

  static getMinionKey(scene, sizeKey) {
    return this.getTextureKey(scene, sizeKey);
  }
}

