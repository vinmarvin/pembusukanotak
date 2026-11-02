// src/i18n/index.js
// Internationalization system for English and Indonesian.
import en from './en.js';
import id from './id.js';
import loreEn from './lore.en.js';
import loreId from './lore.id.js';
import { EventBus } from '../systems/EventBus.js';
import { SaveManager } from '../systems/SaveManager.js';

const dictionaries = {
  en: { ...en, lore: loreEn },
  id: { ...id, lore: loreId }
};

let currentLanguage = SaveManager.data.settings?.language || 'en';

export function getLanguage() {
  return currentLanguage;
}

export function setLanguage(lang) {
  if (lang !== 'en' && lang !== 'id') {
    lang = 'en';
  }
  if (currentLanguage === lang) return;
  currentLanguage = lang;
  SaveManager.update((s) => {
    if (!s.settings) s.settings = {};
    s.settings.language = lang;
  });
  EventBus.emit('language:changed', lang);
}

export function t(path, params = {}) {
  const dict = dictionaries[currentLanguage] || dictionaries.en;
  const parts = path.split('.');
  let val = dict;
  for (const part of parts) {
    if (val && typeof val === 'object' && part in val) {
      val = val[part];
    } else {
      // Fallback to English
      let fallback = dictionaries.en;
      for (const fpart of parts) {
        if (fallback && typeof fallback === 'object' && fpart in fallback) {
          fallback = fallback[fpart];
        } else {
          fallback = null;
          break;
        }
      }
      val = fallback;
      break;
    }
  }

  if (typeof val !== 'string') {
    return path;
  }

  return val.replace(/\{(\w+)\}/g, (_, k) => (k in params ? params[k] : `{${k}}`));
}

export { en, id, loreEn, loreId };

