export const GAMEPLAY = {
  board: { cols: 8, rowsStory: 7, rowsTimeKill: 8, candyTypes: 6, scorePerCandy: 100, hardChainCap: 60 },
  player: { baseHp: 100, baseAttack: 2, hpPerStage: 20, attackPerStage: 1 },
  enemies: {
    small:  { hp: 50,  dmgMin: 2, dmgMax: 4, intervalSec: 15 },
    medium: { hp: 150, dmgMin: 2, dmgMax: 4, intervalSec: 15 },
    large:  { hp: 200, dmgMin: 2, dmgMax: 4, intervalSec: 15 },
    boss:   { hp: 250, hpStage5: 350, dmg: 5, intervalSec: 10 }
  },
  stages: 5,
  stageOrder: ['small', 'small', 'medium', 'medium', 'large', 'boss'],
  bossEffects: { removeCount: 10, freezeSec: 5 },
  timeKill: {
    durationSec: 120, wrongSwapPenaltySec: 10, comboBonusSec: 5, match4BonusSec: 5,
    freezeSec: 15, scoreMultiplier: 5, scoreMultiplierSec: 10, bombSize: 4
  },
  memeBook: { candyUnlockCount: 100 },
  achievements: { scoreHunterScore: 100000 },
  balanceSim: { secondsPerMatch: 4, candiesPerMatch: 3 },
  debug: { allowQueryFlag: true, attackMultiplier: 10 }
};

