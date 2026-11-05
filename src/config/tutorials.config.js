// src/config/tutorials.config.js
// Per-mode tutorials (owner request): no tutorial at first launch; each game mode shows its own
// tutorial the first time it is played, and again from that mode's pause menu ("How to play").
// `art` picks the animation in ui/TutorialIllustrations.js; `key` is the i18n prefix
// (<key>.title / <key>.desc). Numbers in the text come from GAMEPLAY via tutorialParams().
import { GAMEPLAY } from './gameplay.config.js';

export const TUTORIALS_CONFIG = {
  story: {
    // Save flag kept from the original single tutorial so old saves stay valid
    saveFlag: 'tutorialSeen',
    titleKey: 'menu.story.title',
    steps: [
      { art: 'match', key: 'tutorial.step1' },
      { art: 'attack', key: 'tutorial.step2' },
      { art: 'countdown', key: 'tutorial.step3' }
    ]
  },
  timeKill: {
    saveFlag: 'timeKillTutorialSeen',
    titleKey: 'menu.timekill.title',
    steps: [
      { art: 'matchScore', key: 'tutorial.timeKill.step1' },
      { art: 'clock', key: 'tutorial.timeKill.step2' },
      { art: 'power', key: 'tutorial.timeKill.step3' },
      { art: 'score', key: 'tutorial.timeKill.step4' }
    ]
  }
};

// Values the tutorial text and art show. All of them are real game rules.
export function tutorialParams() {
  const tk = GAMEPLAY.timeKill;
  return {
    points: GAMEPLAY.board.scorePerCandy,
    min: tk.durationSec / 60,
    penalty: tk.wrongSwapPenaltySec,
    combo: tk.comboBonusSec,
    bonus: tk.match4BonusSec,
    freeze: tk.freezeSec,
    mult: tk.scoreMultiplier,
    x5: tk.scoreMultiplierSec
  };
}
