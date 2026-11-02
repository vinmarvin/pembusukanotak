// tests/systems/audio_motion.test.js
// Tests for Phase 7 Gate: Audio pass, reduced motion, and tutorial flags.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AUDIO_CONFIG } from '../../src/config/audio.config.js';
import { AudioManager } from '../../src/systems/AudioManager.js';
import { SaveManager } from '../../src/systems/SaveManager.js';
import { prefersReducedMotion } from '../../src/core/reducedMotion.js';

describe('Phase 7 Audio, Motion & Tutorial Gate', () => {
  beforeEach(() => {
    SaveManager.reset();
  });

  describe('Audio Config & Throttling (ASSETS_SPEC Section 5)', () => {
    it('has exact required audio constants', () => {
      expect(AUDIO_CONFIG.crossfadeMs).toBe(500);
      expect(AUDIO_CONFIG.hitMinGapMs).toBe(80);
      expect(AUDIO_CONFIG.duckAmount).toBe(0.3);
      expect(AUDIO_CONFIG.duckMs).toBe(300);
      expect(AUDIO_CONFIG.curve).toBe(2);
    });

    it('throttles hit sfx within 80ms gap', () => {
      const mockSound = {
        get: vi.fn().mockReturnValue(true),
        play: vi.fn()
      };
      const mockScene = {
        sound: mockSound,
        tweens: { add: vi.fn() }
      };

      AudioManager.init(mockScene);

      // First hit plays
      AudioManager.playSfx('sfx.hit');
      expect(mockSound.play).toHaveBeenCalledTimes(1);

      // Immediate second hit (<80ms) is suppressed!
      AudioManager.playSfx('sfx.hit');
      expect(mockSound.play).toHaveBeenCalledTimes(1);
    });

    it('persists mute state in SaveManager and restores upon load', () => {
      SaveManager.reset();
      expect(AudioManager.isMuted()).toBe(false);

      AudioManager.toggleMute();
      expect(AudioManager.isMuted()).toBe(true);
      expect(SaveManager.data.settings.muted).toBe(true);

      // Simulate reload
      SaveManager.load();
      expect(SaveManager.data.settings.muted).toBe(true);
    });
  });

  describe('OS prefers-reduced-motion Handling', () => {
    it('detects when prefers-reduced-motion is active', () => {
      const originalWindow = globalThis.window;

      globalThis.window = {
        matchMedia: vi.fn().mockImplementation((query) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query
        }))
      };

      expect(prefersReducedMotion()).toBe(true);

      // When inactive
      globalThis.window.matchMedia = vi.fn().mockImplementation(() => ({
        matches: false
      }));

      expect(prefersReducedMotion()).toBe(false);

      if (originalWindow !== undefined) {
        globalThis.window = originalWindow;
      } else {
        delete globalThis.window;
      }
    });
  });

  describe('Tutorial Persistence Flow', () => {
    it('runs on clean launch (tutorialSeen = false) and saves when completed', () => {
      SaveManager.reset();
      expect(SaveManager.data.tutorialSeen).toBe(false);

      SaveManager.update((s) => {
        s.tutorialSeen = true;
      });

      expect(SaveManager.data.tutorialSeen).toBe(true);
      SaveManager.load();
      expect(SaveManager.data.tutorialSeen).toBe(true);
    });
  });
});
