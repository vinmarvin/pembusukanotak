import { describe, it, expect } from 'vitest';
import { classifyAsset } from '../../src/core/assets/classify.js';

describe('Asset Classification (ASSETS_SPEC Phase 1 Gate)', () => {
  it('correctly classifies boss image file names', () => {
    expect(classifyAsset('boss_Tralalelo Tralala.png').key).toBe('b1');
    expect(classifyAsset('Tralalelo Tralala.png').key).toBe('b1');

    expect(classifyAsset('boss_Trippa Troppa Tralala Lirila Tung Tung Sahur Boneca Crocodina.png').key).toBe('b5');
    expect(classifyAsset('Trippa Troppa Tralala ...').key).toBe('b5');

    expect(classifyAsset('tung_tung_tung_sahur.png').key).toBe('b4');
    expect(classifyAsset('boss_Tung Tung sahur.png').key).toBe('b4');

    // Boneca Ambalabu must map to b3, NOT b5!
    expect(classifyAsset('Boneca Ambalabu.png').key).toBe('b3');
    expect(classifyAsset('boss_Boneca Ambalabu.png').key).toBe('b3');

    expect(classifyAsset('boss_Cappuccino Assassino.png').key).toBe('b2');
  });

  it('correctly classifies candy image file names', () => {
    expect(classifyAsset('67.png').key).toBe('c67');
    expect(classifyAsset('candy_67.png').key).toBe('c67');

    expect(classifyAsset('Lirili Larila.png').key).toBe('lirili');
    expect(classifyAsset('candy_Lirilì Larilà.png').key).toBe('lirili');

    expect(classifyAsset('candy_nugget roblox.png').key).toBe('nugget');
    expect(classifyAsset('candy_Skibidi toilet.png').key).toBe('skibidi');
    expect(classifyAsset('candy_udin din din dun.png').key).toBe('udin');
    expect(classifyAsset('candy_Bluberini Octopusini.png').key).toBe('bluberini');
  });

  it('correctly classifies minion image file names', () => {
    expect(classifyAsset('SmallMinion.png').key).toBe('small');
    expect(classifyAsset('MediumMinion.png').key).toBe('medium');
    expect(classifyAsset('BigMinion.png').key).toBe('large');
  });

  it('correctly classifies audio file names', () => {
    expect(classifyAsset('bgm_menu.mp3').key).toBe('bgm.menu');
    expect(classifyAsset('bgm_story.mp3').key).toBe('bgm.story');
    expect(classifyAsset('bgm_timeattack.mp3').key).toBe('bgm.timekill');
    expect(classifyAsset('sfx_hit.mp3').key).toBe('sfx.hit');
    expect(classifyAsset('sfx_Tralalero Tralala.mp3').key).toBe('sfx.boss.b1');
    expect(classifyAsset('sfx_Cappuccino Assassino.m4a').key).toBe('sfx.boss.b2');
    expect(classifyAsset('sfx_Boneca Ambalabu.mp3').key).toBe('sfx.boss.b3');
    expect(classifyAsset('sfx_Tung Tung sahur.mp3').key).toBe('sfx.boss.b4');
    expect(classifyAsset('sfx_Trippa Troppa Tralala Lirila Tung Tung Sahur Boneca Crocodina.mp3').key).toBe('sfx.boss.b5');

    // Candy SFX
    expect(classifyAsset('sfx_67.mp3').key).toBe('sfx.candy.c67');
    expect(classifyAsset('sfx_Blueberrinni octopussini.mp3').key).toBe('sfx.candy.bluberini');
    expect(classifyAsset('sfx_Lirili Larila.mp3').key).toBe('sfx.candy.lirili');
    expect(classifyAsset('sfx_robloxnugget.mp3').key).toBe('sfx.candy.nugget');
    expect(classifyAsset('sfx_skibiditoilet.mp3').key).toBe('sfx.candy.skibidi');
    expect(classifyAsset('sfx_Udin Din Din Dun.mp3').key).toBe('sfx.candy.udin');
  });
});

