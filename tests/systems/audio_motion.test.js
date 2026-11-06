// tests/systems/audio_motion.test.js
// Tests for Phase 7 Gate: Audio pass, reduced motion, and tutorial flags.
import { shouldShowTutorial, markTutorialSeen } from '../../src/core/tutorials.js';
import { TUTORIALS_CONFIG, tutorialParams } from '../../src/config/tutorials.config.js';
import { t, setLanguage } from '../../src/i18n/index.js';
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

    it('does not pause the audio context when the game loses focus (background play)', () => {
      const mockSound = { pauseOnBlur: true, get: vi.fn(), play: vi.fn() };
      AudioManager.init({ sound: mockSound });
      expect(mockSound.pauseOnBlur).toBe(false);
    });

    it('plays only one Meme Book clip at a time (spam taps are ignored)', () => {
      const clips = [];
      const mockSound = {
        get: vi.fn().mockReturnValue(true),
        play: vi.fn(),
        add: vi.fn(() => {
          const handlers = {};
          const clip = {
            isPlaying: false,
            once: (ev, fn) => (handlers[ev] = fn),
            play: vi.fn(() => (clip.isPlaying = true)),
            stop: vi.fn(() => (clip.isPlaying = false)),
            destroy: vi.fn(),
            finish: () => {
              clip.isPlaying = false;
              handlers.complete();
            }
          };
          clips.push(clip);
          return clip;
        })
      };
      AudioManager.init({ sound: mockSound });
      AudioManager.stopMemeClip();

      expect(AudioManager.playMemeClip('sfx.boss.b1')).toBe(true);
      expect(AudioManager.playMemeClip('sfx.boss.b1')).toBe(false);
      expect(AudioManager.playMemeClip('sfx.boss.b1')).toBe(false);
      expect(clips.length).toBe(1);

      // After the clip ends, the next tap plays again
      clips[0].finish();
      expect(AudioManager.isMemeClipPlaying()).toBe(false);
      expect(AudioManager.playMemeClip('sfx.boss.b1')).toBe(true);
      expect(clips.length).toBe(2);

      // Turning the page stops the current clip
      AudioManager.stopMemeClip();
      expect(clips[1].stop).toHaveBeenCalled();
      expect(AudioManager.isMemeClipPlaying()).toBe(false);
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

  describe('Tutorial Persistence Flow (per mode, no launch tutorial)', () => {
    it('a fresh save shows each mode tutorial once, tracked separately, and keeps it across reloads', () => {
      SaveManager.reset();
      const save = SaveManager.data;
      expect(shouldShowTutorial(save, 'story')).toBe(true);
      expect(shouldShowTutorial(save, 'timeKill')).toBe(true);

      SaveManager.update((s) => markTutorialSeen(s, 'timeKill'));
      expect(shouldShowTutorial(SaveManager.data, 'timeKill')).toBe(false);
      expect(shouldShowTutorial(SaveManager.data, 'story')).toBe(true);

      SaveManager.update((s) => markTutorialSeen(s, 'story'));
      SaveManager.load();
      expect(shouldShowTutorial(SaveManager.data, 'story')).toBe(false);
      expect(shouldShowTutorial(SaveManager.data, 'timeKill')).toBe(false);
    });

    it('old saves that saw the original tutorial count as having seen the Story tutorial', () => {
      SaveManager.reset();
      SaveManager.update((s) => {
        s.tutorialSeen = true;
        delete s.timeKillTutorialSeen;
      });
      expect(shouldShowTutorial(SaveManager.data, 'story')).toBe(false);
      expect(shouldShowTutorial(SaveManager.data, 'timeKill')).toBe(true);
    });

    it('every tutorial step has text in both languages and uses only real rule values', () => {
      for (const mode of Object.keys(TUTORIALS_CONFIG)) {
        expect(TUTORIALS_CONFIG[mode].steps.length).toBeGreaterThanOrEqual(3);
        for (const step of TUTORIALS_CONFIG[mode].steps) {
          for (const lang of ['en', 'id']) {
            setLanguage(lang);
            const title = t(`${step.key}.title`, tutorialParams());
            const desc = t(`${step.key}.desc`, tutorialParams());
            expect(title).not.toBe(`${step.key}.title`);
            expect(desc).not.toMatch(/\{\w+\}/);
          }
        }
      }
      setLanguage('en');
      expect(t('tutorial.timeKill.step2.desc', tutorialParams())).toContain('2 minutes');
      expect(t('tutorial.timeKill.step2.desc', tutorialParams())).toContain('10 s');
    });
  });
});
