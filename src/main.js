// src/main.js
// Entry point: imports style, creates Phaser.Game with configured scenes.
import './style.css';
import Phaser from 'phaser';
import { createGameConfig } from './config/game.config.js';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { StageSelectScene } from './scenes/StageSelectScene.js';
import { StoryTextScene } from './scenes/StoryTextScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { TimeKillScene } from './scenes/TimeKillScene.js';
import { ResultsScene } from './scenes/ResultsScene.js';
import { StageClearScene } from './scenes/StageClearScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { TutorialScene } from './scenes/TutorialScene.js';
import { MemeBookScene } from './scenes/MemeBookScene.js';
import { AchievementsScene } from './scenes/AchievementsScene.js';
import { AssetDebugScene } from './scenes/AssetDebugScene.js';

const scenes = [
  BootScene,
  PreloadScene,
  MainMenuScene,
  StageSelectScene,
  StoryTextScene,
  BattleScene,
  TimeKillScene,
  ResultsScene,
  StageClearScene,
  GameOverScene,
  TutorialScene,
  MemeBookScene,
  AchievementsScene,
  AssetDebugScene
];
const config = createGameConfig(scenes);

export const game = new Phaser.Game(config);
