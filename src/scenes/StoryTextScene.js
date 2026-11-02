// src/scenes/StoryTextScene.js
// Short narrative story dialog before entering an area or ending the story.
import Phaser from 'phaser';
import { THEME } from '../config/theme.config.js';
import { Panel } from '../ui/Panel.js';
import { InkText } from '../ui/InkText.js';
import { LocalizedText } from '../ui/LocalizedText.js';
import { Button } from '../ui/Button.js';
import { AudioManager } from '../systems/AudioManager.js';

export class StoryTextScene extends Phaser.Scene {
  constructor() {
    super('StoryText');
  }

  init(data) {
    this.textKey = data.key || 'story.intro';
    this.nextScene = data.nextScene || 'Battle';
    this.nextSceneData = data.nextSceneData || {};
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    // Dark backdrop
    this.backdrop = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.75);

    // Dialog Panel
    const pw = Math.min(w * 0.88, 480);
    const ph = Math.min(h * 0.7, 260);

    this.panel = new Panel(this, w / 2, h / 2, pw, ph, {
      bgColor: THEME.colors.cardBg,
      outlineColor: THEME.colors.slimeGreen,
      radius: THEME.depth.panelRadius
    });

    this.storyBody = new LocalizedText(this, w / 2, h / 2 - 25, this.textKey, {}, {
      fontSize: '16px',
      color: '#FFFFFF'
    });
    this.storyBody.setWordWrapWidth(pw - 56);
    this.storyBody.setAlign('center');

    this.continueBtn = new Button(this, w / 2, h / 2 + ph * 0.28, 160, 46, {
      text: 'CONTINUE',
      bgColor: THEME.colors.slimeGreen,
      textColor: THEME.colors.inkHex,
      onClick: () => this.proceed()
    });
  }

  proceed() {
    AudioManager.playSfx('sfx.click');
    this.scene.start(this.nextScene, this.nextSceneData);
  }
}

