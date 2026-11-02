import { describe, it, expect, beforeEach } from 'vitest';
import { SaveManager, getDefaultSave } from '../../src/systems/SaveManager.js';

describe('SaveManager', () => {
  beforeEach(() => {
    SaveManager.reset();
  });

  it('loads default values properly', () => {
    const data = SaveManager.data;
    expect(data.version).toBe(1);
    expect(data.stageCleared).toBe(0);
    expect(data.settings.language).toBe('en');
    expect(data.settings.musicVolume).toBe(70);
  });

  it('updates state and persists', () => {
    SaveManager.update((s) => {
      s.stageCleared = 2;
      s.settings.language = 'id';
    });

    expect(SaveManager.data.stageCleared).toBe(2);
    expect(SaveManager.data.settings.language).toBe('id');
  });
});

