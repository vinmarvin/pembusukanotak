// tests/eastereggs/eastereggs.test.js
// Main-menu easter eggs: click targets and media file matching.
import { describe, it, expect } from 'vitest';
import { createEggCounts, registerEggClick, isLowScoreEgg } from '../../src/core/eastereggs.js';
import { EASTER_EGGS_CONFIG } from '../../src/config/eastereggs.config.js';
import { classifyEasterEgg, classifyAsset } from '../../src/core/assets/classify.js';

const clickN = (counts, id, n) => {
  let hit = null;
  for (let i = 0; i < n; i++) hit = registerEggClick(counts, id) || hit;
  return hit;
};

describe('Main menu easter eggs', () => {
  it('uses the owner click targets: 67, 42, 82', () => {
    expect(EASTER_EGGS_CONFIG.eggs.c67.clicks).toBe(67);
    expect(EASTER_EGGS_CONFIG.eggs.small.clicks).toBe(42);
    expect(EASTER_EGGS_CONFIG.eggs.skibidi.clicks).toBe(82);
    expect(EASTER_EGGS_CONFIG.eggs.skibidi.type).toBe('video');
  });

  it('triggers exactly on the target click, not before', () => {
    const counts = createEggCounts();
    expect(clickN(counts, 'c67', 66)).toBeNull();
    const egg = registerEggClick(counts, 'c67');
    expect(egg.media).toBe('egg.c67');
    expect(counts.c67).toBe(0);
  });

  it('counts each icon separately and restarts after triggering', () => {
    const counts = createEggCounts();
    clickN(counts, 'small', 41);
    clickN(counts, 'skibidi', 81);
    expect(counts.small).toBe(41);
    expect(counts.skibidi).toBe(81);
    expect(registerEggClick(counts, 'small').media).toBe('egg.ambatukam');
    expect(clickN(counts, 'small', 41)).toBeNull();
    expect(registerEggClick(counts, 'skibidi').media).toBe('egg.skibidi');
  });

  it('ignores icons that are not easter eggs', () => {
    const counts = createEggCounts();
    expect(registerEggClick(counts, 'bluberini')).toBeNull();
  });

  it('matches the owner media files', () => {
    expect(classifyEasterEgg('easteregg/67 earrape.mp3')).toMatchObject({ key: 'egg.c67', kind: 'audio' });
    expect(classifyEasterEgg('easteregg/Ambatukam Termuwani.mp3')).toMatchObject({ key: 'egg.ambatukam', kind: 'audio' });
    expect(classifyEasterEgg('easteregg/SkibidJumpScare.mp4')).toMatchObject({ key: 'egg.skibidi', kind: 'video' });
    expect(classifyEasterEgg('easteregg/notes.txt')).toBeNull();
  });
});

describe('Time Kill low-score easter egg', () => {
  it('fires when the final score is 5000 or less', () => {
    expect(EASTER_EGGS_CONFIG.lowScore.maxScore).toBe(5000);
    expect(isLowScoreEgg(0)).toBe(true);
    expect(isLowScoreEgg(4900)).toBe(true);
    expect(isLowScoreEgg(5000)).toBe(true);
    expect(isLowScoreEgg(5100)).toBe(false);
    expect(isLowScoreEgg(100000)).toBe(false);
  });

  it('maps easteregg/5000.png and audio/sfx_less5000.mp3 to the egg keys', () => {
    expect(classifyEasterEgg('easteregg/5000.png')).toEqual({ key: 'egg.less5000', kind: 'image', category: 'easteregg' });
    expect(classifyAsset('audio/sfx_less5000.mp3').key).toBe('sfx.egg.less5000');
    expect(EASTER_EGGS_CONFIG.lowScore.image).toBe('egg.less5000');
    expect(EASTER_EGGS_CONFIG.lowScore.sound).toBe('sfx.egg.less5000');
  });
});
