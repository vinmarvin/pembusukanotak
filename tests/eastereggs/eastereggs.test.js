// tests/eastereggs/eastereggs.test.js
// Main-menu easter eggs: click targets and media file matching.
import { describe, it, expect } from 'vitest';
import { createEggCounts, registerEggClick } from '../../src/core/eastereggs.js';
import { EASTER_EGGS_CONFIG } from '../../src/config/eastereggs.config.js';
import { classifyEasterEgg } from '../../src/core/assets/classify.js';

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
