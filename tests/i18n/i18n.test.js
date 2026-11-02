import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import en from '../../src/i18n/en.js';
import id from '../../src/i18n/id.js';
import loreId from '../../src/i18n/lore.id.js';
import { t, setLanguage, getLanguage } from '../../src/i18n/index.js';
import { SaveManager } from '../../src/systems/SaveManager.js';

function collectKeys(obj, prefix = '') {
  let keys = [];
  for (const [key, val] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      keys = keys.concat(collectKeys(val, fullPath));
    } else {
      keys.push(fullPath);
    }
  }
  return keys.sort();
}

describe('i18n', () => {
  it('en.js and id.js have the exact same set of translation keys', () => {
    const enKeys = collectKeys(en);
    const idKeys = collectKeys(id);
    expect(enKeys).toEqual(idKeys);
  });

  it('switches language and translates with parameters', () => {
    setLanguage('en');
    expect(getLanguage()).toBe('en');
    expect(t('common.ok')).toBe('OK');
    expect(t('battle.stageTag', { n: 3 })).toBe('Stage 3');

    setLanguage('id');
    expect(getLanguage()).toBe('id');
    expect(t('common.ok')).toBe('OK');
    expect(t('battle.stageTag', { n: 3 })).toBe('Stage 3');
    expect(t('battle.playerName')).toBe('Nirodha');
    expect(t('common.menu')).toBe('Menu Utama');

    // Check persistence
    expect(SaveManager.data.settings.language).toBe('id');
  });

  it('lore.id.js equals the text in CONTENT_LORE.md verbatim', () => {
    let loreMdPath = path.resolve(__dirname, '../../Agents/CONTENT_LORE.md');
    if (!fs.existsSync(loreMdPath)) {
      loreMdPath = path.resolve(__dirname, '../../CONTENT_LORE.md');
    }
    const content = fs.readFileSync(loreMdPath, 'utf8');

    // Split markdown by ## headings
    const sections = content.split(/^##\s+/m).slice(1);
    expect(sections.length).toBe(11);

    const keys = ['b1', 'b2', 'b3', 'b4', 'b5', 'c67', 'nugget', 'skibidi', 'lirili', 'udin', 'bluberini'];

    sections.forEach((sec, idx) => {
      const key = keys[idx];
      const lines = sec.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
      // lines[0] is the heading title e.g. "1. Tralalelo Tralala (boss, stage 1)"
      // lines[1] is paragraph 1
      // lines[2] is paragraph 2
      const p1 = lines[1];
      const p2 = lines[2];

      expect(loreId[key]).toBeDefined();
      expect(loreId[key].p1).toBe(p1);
      expect(loreId[key].p2).toBe(p2);
    });
  });
});

