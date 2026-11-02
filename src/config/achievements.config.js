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
      targetMinutes: 15
    },
    {
      id: 'scoreHunter',
      titleKey: 'achievements.scoreHunter.title',
      descKey: 'achievements.scoreHunter.desc',
      targetScore: 45000,
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
    }
  ]
};

