// src/ui/AchievementToast.js
// Slide-down "Achievement Unlocked" banner shown at the top of the current scene.
import { THEME } from '../config/theme.config.js';
import { Panel } from './Panel.js';
import { LocalizedText } from './LocalizedText.js';
import { prefersReducedMotion } from '../core/reducedMotion.js';

const { holdMs: HOLD_MS, slideInMs, slideOutMs } = THEME.toast;

export function showAchievementToast(scene, { icon, titleKey }) {
  const { width } = scene.scale;
  const tw = Math.min(width - 32, 360);
  const th = 74;
  const restY = 64 + th / 2 + 12;

  const toast = scene.add.container(width / 2, -th);
  toast.setDepth(500);

  const panel = new Panel(scene, 0, 0, tw, th, {
    bgColor: THEME.colors.cardBg,
    outlineColor: THEME.colors.arcadeYellow,
    radius: 16
  });
  const iconTxt = scene.add.text(-tw / 2 + 38, 0, icon, { fontSize: '34px' }).setOrigin(0.5);
  const heading = new LocalizedText(scene, -tw / 2 + 72, -13, 'achievements.toast', {}, {
    fontSize: '13px',
    color: THEME.colors.arcadeYellowHex,
    isHud: true,
    strokeThickness: 3
  }).setOrigin(0, 0.5);
  const title = new LocalizedText(scene, -tw / 2 + 72, 13, titleKey, {}, {
    fontSize: '17px',
    color: '#FFFFFF',
    isTitle: true,
    strokeThickness: 3
  }).setOrigin(0, 0.5);
  title.setWordWrapWidth(tw - 90);

  toast.add([panel, iconTxt, heading, title]);

  if (prefersReducedMotion()) {
    toast.setY(restY);
    scene.time.delayedCall(HOLD_MS, () => toast.destroy());
    return toast;
  }

  scene.tweens.add({
    targets: toast,
    y: restY,
    duration: slideInMs,
    ease: 'Back.easeOut',
    onComplete: () => {
      scene.tweens.add({ targets: iconTxt, scale: 1.25, duration: 160, yoyo: true, repeat: 2 });
      scene.tweens.add({
        targets: toast,
        y: -th,
        delay: HOLD_MS,
        duration: slideOutMs,
        ease: 'Cubic.easeIn',
        onComplete: () => toast.destroy()
      });
    }
  });
  return toast;
}
