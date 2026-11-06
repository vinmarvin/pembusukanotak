// src/ui/RotateOverlay.js
// Full-screen "rotate your device" message for touch screens held in portrait.
// The game is designed for landscape 16:9; while the message shows, the game is paused
// so battle timers do not run behind it.
import { t } from '../i18n/index.js';
import { EventBus } from '../systems/EventBus.js';

const PORTRAIT_TOUCH = '(orientation: portrait) and (pointer: coarse)';

export function installRotateOverlay(game) {
  if (typeof window === 'undefined' || !window.matchMedia) return;

  const el = document.createElement('div');
  el.id = 'rotate-overlay';
  el.setAttribute('role', 'alert');
  el.innerHTML = `
    <div class="rotate-phone" aria-hidden="true"></div>
    <p class="rotate-title"></p>
    <p class="rotate-hint"></p>
  `;
  document.body.appendChild(el);

  const titleEl = el.querySelector('.rotate-title');
  const hintEl = el.querySelector('.rotate-hint');
  const renderText = () => {
    titleEl.textContent = t('rotate.title');
    hintEl.textContent = t('rotate.hint');
  };
  renderText();
  EventBus.on('language:changed', renderText);

  const mq = window.matchMedia(PORTRAIT_TOUCH);
  let pausedByUs = false;
  const update = () => {
    const show = mq.matches;
    el.classList.toggle('show', show);
    if (show && !game.isPaused) {
      game.pause();
      pausedByUs = true;
    } else if (!show && pausedByUs) {
      game.resume();
      pausedByUs = false;
      // The screen changed while paused; Phaser's refresh reads the cached parent size, so
      // update that first, then refresh, or the canvas keeps its portrait size.
      game.scale.getParentBounds();
      game.scale.refresh();
    }
  };

  if (mq.addEventListener) mq.addEventListener('change', update);
  else mq.addListener(update);
  // Some browsers skip the media-query event on rotation; resize always fires.
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
  // Show the message at once, but pause only after boot (pausing earlier is undone by boot).
  el.classList.toggle('show', mq.matches);
  if (game.isBooted) update();
  else game.events.once('ready', update);
}
