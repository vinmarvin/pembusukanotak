// src/ui/SettingsPopup.js
// Settings popup matching Setings.png with section 6 corrections.
import { THEME } from '../config/theme.config.js';
import { Popup } from './Popup.js';
import { Slider } from './Slider.js';
import { Toggle } from './Toggle.js';
import { Button } from './Button.js';
import { InkText } from './InkText.js';
import { LocalizedText } from './LocalizedText.js';
import { AudioManager } from '../systems/AudioManager.js';
import { SaveManager } from '../systems/SaveManager.js';
import { EventBus } from '../systems/EventBus.js';
import { getLanguage, setLanguage, t } from '../i18n/index.js';

export class SettingsPopup {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = options;

    const pw = Math.min(scene.scale.width * 0.88, 440);
    const ph = Math.min(scene.scale.height * 0.88, 440);

    this.popup = new Popup(scene, pw, ph, {
      title: t('settings.title'),
      onClose: () => {
        if (this.unsubLang) this.unsubLang();
        if (options.onClose) options.onClose();
      }
    });

    const d = this.popup.dialog;

    // Music Slider Row
    this.musicLabel = new LocalizedText(scene, -pw * 0.35, -ph * 0.26, 'settings.music', {}, {
      fontSize: '16px',
      color: '#FFFFFF',
      originX: 0
    });
    this.musicSlider = new Slider(scene, 30, -ph * 0.26, pw * 0.45, 30, {
      value: AudioManager.getMusicVolume(),
      onChange: (val) => AudioManager.setMusicVolume(val)
    });
    d.add([this.musicLabel, this.musicSlider]);

    // SFX Slider Row
    this.sfxLabel = new LocalizedText(scene, -pw * 0.35, -ph * 0.13, 'settings.sfx', {}, {
      fontSize: '16px',
      color: '#FFFFFF',
      originX: 0
    });
    this.sfxSlider = new Slider(scene, 30, -ph * 0.13, pw * 0.45, 30, {
      value: AudioManager.getSfxVolume(),
      onChange: (val) => AudioManager.setSfxVolume(val),
      onDragEnd: () => AudioManager.playSfx('sfx.hit')
    });
    d.add([this.sfxLabel, this.sfxSlider]);

    // Language Toggle Row
    this.langLabel = new LocalizedText(scene, -pw * 0.35, ph * 0.02, 'settings.language', {}, {
      fontSize: '16px',
      color: '#FFFFFF',
      originX: 0
    });
    this.langToggle = new Toggle(scene, 30, ph * 0.02, pw * 0.45, 36, {
      items: [
        { key: 'en', label: 'English' },
        { key: 'id', label: 'Indonesia' }
      ],
      selectedKey: getLanguage(),
      onSelect: (k) => setLanguage(k)
    });
    d.add([this.langLabel, this.langToggle]);

    // "Reset Progress" button with confirmation
    this.resetBtn = new Button(scene, 0, ph * 0.18, 160, 32, {
      text: t('settings.resetProgress'),
      bgColor: THEME.colors.playfieldTray,
      outlineColor: THEME.colors.punchMagenta,
      textColor: THEME.colors.punchMagentaHex,
      fontSize: '13px',
      radius: 8,
      onClick: () => {
        AudioManager.playSfx('sfx.click');
        const confirmed = window.confirm(t('settings.resetConfirm'));
        if (confirmed) {
          SaveManager.reset();
          window.location.reload();
        }
      }
    });
    d.add(this.resetBtn);

    this.unsubLang = EventBus.on('language:changed', () => {
      if (this.resetBtn) {
        this.resetBtn.setText(t('settings.resetProgress'));
      }
    });

    // OK Button
    this.okBtn = new Button(scene, 0, ph * 0.36, 120, 42, {
      text: t('common.ok'),
      bgColor: THEME.colors.slimeGreen,
      textColor: THEME.colors.inkHex,
      onClick: () => this.close()
    });
    d.add(this.okBtn);
  }

  close() {
    if (this.unsubLang) this.unsubLang();
    this.popup.close();
  }

  reposition(sw, sh) {
    if (this.popup) {
      this.popup.reposition(sw, sh);
    }
  }
}

