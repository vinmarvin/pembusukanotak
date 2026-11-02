import { describe, it, expect, beforeEach } from 'vitest';
import { StoryProgression } from '../../src/core/progression/story.js';
import { SaveManager } from '../../src/systems/SaveManager.js';
import { statsForStage } from '../../src/core/combat/stats.js';

describe('Story Progression (GAME_SPEC Section 5.8 & Decision 18)', () => {
  beforeEach(() => {
    SaveManager.reset();
  });

  it('correctly manages stage unlocking sequentially', () => {
    expect(StoryProgression.isStageUnlocked(1)).toBe(true);
    expect(StoryProgression.isStageUnlocked(2)).toBe(false);

    StoryProgression.onStageCleared(1);
    expect(SaveManager.data.stageCleared).toBe(1);
    expect(StoryProgression.isStageUnlocked(2)).toBe(true);
    expect(StoryProgression.isStageUnlocked(3)).toBe(false);
  });

  it('guarantees replaying cleared stage uses that stage stats (no upgrade stacking)', () => {
    StoryProgression.onStageCleared(4);
    // Player is at stage 4 (HP 160, atk 5)
    // If player replays Stage 1:
    const stage1Stats = statsForStage(1);
    expect(stage1Stats.maxHp).toBe(100);
    expect(stage1Stats.attack).toBe(2);

    const stage3Stats = statsForStage(3);
    expect(stage3Stats.maxHp).toBe(140);
    expect(stage3Stats.attack).toBe(4);
  });

  it('tracks Story Mode completion and resets on Stage 1 start', () => {
    StoryProgression.onStartStage(1);
    expect(SaveManager.data.gameOversSinceStage1Start).toBe(0);

    // Player suffers a game over
    StoryProgression.onGameOver();
    expect(SaveManager.data.gameOversSinceStage1Start).toBe(1);

    // Clears stage 5 after a game over
    StoryProgression.onStageCleared(5);
    expect(SaveManager.data.storyCompleted).toBe(true);
    expect(SaveManager.data.achievements.freshNewBrain).toBe(true);

    // Now restart Stage 1 cleanly
    StoryProgression.onStartStage(1);
    expect(SaveManager.data.gameOversSinceStage1Start).toBe(0);
  });
});

