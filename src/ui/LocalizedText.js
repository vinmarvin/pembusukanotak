// src/ui/LocalizedText.js
// Text that updates automatically when language changes.
import { InkText } from './InkText.js';
import { t } from '../i18n/index.js';
import { EventBus } from '../systems/EventBus.js';

export class LocalizedText extends InkText {
  constructor(scene, x, y, translationKey, params = {}, style = {}) {
    super(scene, x, y, t(translationKey, params), style);
    this._key = translationKey;
    this._params = params;

    this._unsub = EventBus.on('language:changed', () => {
      this.refreshText();
    });

    this.once('destroy', () => {
      if (this._unsub) this._unsub();
    });
  }

  setKey(key, params = null) {
    this._key = key;
    if (params) this._params = params;
    this.refreshText();
  }

  setParams(params) {
    this._params = { ...this._params, ...params };
    this.refreshText();
  }

  refreshText() {
    this.setText(t(this._key, this._params));
  }
}

