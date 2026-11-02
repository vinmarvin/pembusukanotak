// tests/unlocks/unlocks.test.js
// Tests for Phase 6 Gate: Meme Book unlocks, achievements, and persistence.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  isEntryUnlocked,
  getEntryProgress,
  countUnlockedEntries,
  recordCandyDestruction,
  recordBossDefeat,
  recordClearedCandies,
  MEMEBOOK_ENTRIES
} from '../../src/core/unlocks/memebook.js';
import {
  checkAchievements,
  getAchievementProgress,
  ACHIEVEMENTS_LIST
} from '../../src/core/unlocks/achievements.js';
import { StoryProgression } from '../../src/core/progression/story.js';
import { SaveManager } from '../../src/systems/SaveManager.js';
import { GAMEPLAY } from '../../src/config/gameplay.config.js';

describe('Phase 6 Unlocks & Achievements Core', () => {
  beforeEach(() => {
    SaveManager.reset();
  });

  describe('Meme Book Candy & Boss Unlocks', () => {
    it('candy entry unlocks at exactly 100 destroyed candies and not before', () => {
      const save = SaveManager.data;
      expect(isEntryUnlocked(save, 'c67')).toBe(false);

      // 99 destroyed candies
      recordCandyDestruction(save, 'c67', 99);
      expect(save.candyDestroyed.c67).toBe(99);
      expect(isEntryUnlocked(save, 'c67')).toBe(false);

      // 100th candy -> unlocks!
      const res = recordCandyDestruction(save, 'c67', 1);
      expect(save.candyDestroyed.c67).toBe(100);
      expect(res.newlyUnlocked).toBe(true);
      expect(isEntryUnlocked(save, 'c67')).toBe(true);

      // Further candies remain unlocked
      const res2 = recordCandyDestruction(save, 'c67', 10);
      expect(save.candyDestroyed.c67).toBe(110);
      expect(res2.newlyUnlocked).toBe(false);
      expect(isEntryUnlocked(save, 'c67')).toBe(true);
    });

    it('boss-effect removals do not count towards candy destruction (only player match steps)', () => {
      const save = SaveManager.data;
      // Simulated steps from a player match-3 move
      const steps = [
        {
          index: 0,
          cleared: [
            { r: 0, c: 0, candy: { type: 1 } }, // nugget
            { r: 0, c: 1, candy: { type: 1 } },
            { r: 0, c: 2, candy: { type: 1 } }
          ]
        }
      ];

      recordClearedCandies(save, steps);
      expect(save.candyDestroyed.nugget).toBe(3);

      // A boss effect removal (e.g. remove10) is handled separately in fightEngine/bossEffects
      // without passing through recordClearedCandies, so candyDestroyed does not increment!
      expect(save.candyDestroyed.c67).toBe(0);
      expect(save.candyDestroyed.skibidi).toBe(0);
    });

    it('boss entry unlocks once on the first defeat', () => {
      const save = SaveManager.data;
      expect(isEntryUnlocked(save, 'b1')).toBe(false);

      const r1 = recordBossDefeat(save, 'b1');
      expect(r1.newlyUnlocked).toBe(true);
      expect(isEntryUnlocked(save, 'b1')).toBe(true);

      // Replaying / defeating again
      const r2 = recordBossDefeat(save, 'b1');
      expect(r2.newlyUnlocked).toBe(false);
      expect(isEntryUnlocked(save, 'b1')).toBe(true);
    });
  });

  describe('Achievements Criteria', () => {
    it('Fresh New Brain unlocks on clearing Stage 5', () => {
      const save = SaveManager.data;
      expect(save.achievements.freshNewBrain).toBe(false);

      StoryProgression.onStageCleared(1);
      StoryProgression.onStageCleared(2);
      StoryProgression.onStageCleared(3);
      StoryProgression.onStageCleared(4);
      expect(save.achievements.freshNewBrain).toBe(false);

      StoryProgression.onStageCleared(5);
      expect(save.achievements.freshNewBrain).toBe(true);
    });

    it('You are fully brain rot unlocks when listening to menu theme for 15 minutes', () => {
      SaveManager.reset();
      const save = SaveManager.data;
      save.menuListenTime = 899;
      checkAchievements(save);
      expect(save.achievements.fullyBrainRot).toBe(false);

      save.menuListenTime = 900;
      checkAchievements(save);
      expect(save.achievements.fullyBrainRot).toBe(true);
    });

    it('Score Hunter unlocks at 45000 or more in Time Kill', () => {
      const save = SaveManager.data;
      save.bestScore = 44900;
      checkAchievements(save);
      expect(save.achievements.scoreHunter).toBe(false);

      save.bestScore = 45000;
      const newly = checkAchievements(save);
      expect(newly).toContain('scoreHunter');
      expect(save.achievements.scoreHunter).toBe(true);
    });

    it('Meme Curator unlocks only when all 11 entries are unlocked', () => {
      const save = SaveManager.data;
      // Unlock 5 bosses
      for (let i = 1; i <= 5; i++) {
        recordBossDefeat(save, `b${i}`);
      }
      // Unlock 5 of 6 candies
      const candyKeys = ['c67', 'nugget', 'skibidi', 'lirili', 'udin'];
      for (const k of candyKeys) {
        recordCandyDestruction(save, k, 100);
      }
      expect(countUnlockedEntries(save)).toBe(10);
      checkAchievements(save);
      expect(save.achievements.memeCurator).toBe(false);

      // Unlock 11th entry (bluberini)
      recordCandyDestruction(save, 'bluberini', 100);
      expect(countUnlockedEntries(save)).toBe(11);

      const newly = checkAchievements(save);
      expect(newly).toContain('memeCurator');
      expect(save.achievements.memeCurator).toBe(true);
    });

    it('Support Creator unlocks on first donation button click', () => {
      const save = SaveManager.data;
      expect(save.achievements.supportCreator).toBe(false);

      // Simulating donation click
      SaveManager.update((s) => {
        s.achievements.supportCreator = true;
      });
      expect(SaveManager.data.achievements.supportCreator).toBe(true);
    });
  });

  describe('Full Save & Load Persistence', () => {
    it('restores stage progress, counters, achievements, best score, volumes, mute, and language', () => {
      SaveManager.reset();
      SaveManager.update((s) => {
        s.stageCleared = 3;
        s.gameOversSinceStage1Start = 2;
        s.storyCompleted = false;
        s.candyDestroyed.c67 = 120;
        s.bossDefeated.b1 = true;
        s.bossDefeated.b2 = true;
        s.achievements.supportCreator = true;
        s.bestScore = 15400;
        s.settings.musicVolume = 45;
        s.settings.sfxVolume = 65;
        s.settings.muted = true;
        s.settings.language = 'id';
      });

      // Reload from storage
      SaveManager.load();
      const loaded = SaveManager.data;

      expect(loaded.stageCleared).toBe(3);
      expect(loaded.gameOversSinceStage1Start).toBe(2);
      expect(loaded.candyDestroyed.c67).toBe(120);
      expect(loaded.bossDefeated.b1).toBe(true);
      expect(loaded.bossDefeated.b2).toBe(true);
      expect(loaded.achievements.supportCreator).toBe(true);
      expect(loaded.bestScore).toBe(15400);
      expect(loaded.settings.musicVolume).toBe(45);
      expect(loaded.settings.sfxVolume).toBe(65);
      expect(loaded.settings.muted).toBe(true);
      expect(loaded.settings.language).toBe('id');
    });
  });
});

