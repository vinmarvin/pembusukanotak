export const ENEMIES_CONFIG = {
  types: {
    small:  { id: 'small',  hp: 50,  dmgMin: 2, dmgMax: 4, intervalSec: 15, tag: 'MINION' },
    medium: { id: 'medium', hp: 150, dmgMin: 2, dmgMax: 4, intervalSec: 15, tag: 'MINION' },
    large:  { id: 'large',  hp: 200, dmgMin: 2, dmgMax: 4, intervalSec: 15, tag: 'MINION' },
    boss:   { id: 'boss',   hp: 250, hpStage5: 350, dmg: 5, intervalSec: 10, tag: 'BOSS' }
  },
  stageOrder: ['small', 'small', 'medium', 'medium', 'large', 'boss'],
  totalPerStage: 6
};

