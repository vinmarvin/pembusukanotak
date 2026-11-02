import Phaser from 'phaser';
import { THEME } from './theme.config.js';
import { SCREEN_CONFIG } from './screen.config.js';

export function createGameConfig(scenes = []) {
  return {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: THEME.colors.canvasHex,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: '100%',
      height: '100%',
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: {
      pixelArt: false,
      antialias: true,
      powerPreference: 'high-performance'
    },
    dom: {
      createContainer: false
    },
    scene: scenes
  };
}

