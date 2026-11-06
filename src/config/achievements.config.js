export const ACHIEVEMENTS_CONFIG = {
  total: 5,
  list: [
    {
      id: 'freshNewBrain',
      titleKey: 'achievements.freshNewBrain.title',
      descKey: 'achievements.freshNewBrain.desc',
      icon: '🧠'
    },
    {
      id: 'fullyBrainRot',
      titleKey: 'achievements.fullyBrainRot.title',
      descKey: 'achievements.fullyBrainRot.desc',
      icon: '💀',
      secret: true,
      // Minutes of menu music in one sitting (leaving the main menu resets it).
      targetMinutes: 15,
      // Longest gap between two listen ticks that still counts (laptop sleep, frozen tab).
      listenMaxGapSec: 5,
      listenTickMs: 1000
    },
    {
      id: 'scoreHunter',
      titleKey: 'achievements.scoreHunter.title',
      descKey: 'achievements.scoreHunter.desc',
      targetScore: 100000,
      icon: '🎯'
    },
    {
      id: 'memeCurator',
      titleKey: 'achievements.memeCurator.title',
      descKey: 'achievements.memeCurator.desc',
      totalMemes: 11,
      icon: '📖'
    },
    {
      id: 'supportCreator',
      titleKey: 'achievements.supportCreator.title',
      descKey: 'achievements.supportCreator.desc',
      icon: '💖'
    },
    // Hidden bonus (GAME_SPEC decision 39): invisible until unlocked, then counted on top of
    // `total` (6/5). Needs every non-hidden achievement first, then a Boss Rush run that reaches
    // bossRushBosses bosses defeated.
    {
      id: 'detoxComplete',
      titleKey: 'achievements.detoxComplete.title',
      descKey: 'achievements.detoxComplete.desc',
      icon: '🌿',
      hidden: true,
      bossRushBosses: 20
    }
  ]
};

