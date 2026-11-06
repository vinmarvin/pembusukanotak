export default {
  game: {
    title: 'PEMBUSUKAN OTAK',
    subtitle: 'Brainrot Match-3'
  },
  common: {
    back: 'Back',
    menu: 'Main Menu',
    close: 'Close',
    ok: 'OK',
    retry: 'Retry',
    resume: 'Resume',
    restart: 'Restart',
    next: 'Next',
    locked: 'Locked'
  },
  menu: {
    story: {
      title: 'Story Mode',
      subtitle: '{cleared}/{total} areas cleared'
    },
    timekill: {
      title: 'Time Kill',
      subtitle: '2-minute score attack'
    },
    achievements: {
      title: 'Achievements',
      subtitle: '{unlocked}/{total} unlocked'
    },
    memebook: {
      title: 'Journal of Meme',
      subtitle: '{discovered}/{total} discovered'
    },
    credits: 'Credits'
  },
  stageselect: {
    title: 'Brain Map',
    stage: 'Stage {n}',
    boss: 'Boss',
    playerStats: 'HP: {hp} | ATK: {atk}',
    startBattle: 'Start Battle',
    lockedNotice: 'Clear stage {n} first',
    lockedHard: 'Clear hard stage {n} first',
    hardMode: 'Hard Mode',
    normalMode: 'Normal Mode',
    bossMode: 'Boss Mode',
    hardTag: 'HARD MODE',
    hardStage: 'HARD STAGE {n}',
    modesLocked: 'Finish Story Mode to unlock Hard Mode and Boss Mode!'
  },
  battle: {
    playerName: 'Nirodha',
    vs: 'VS',
    stageTag: 'Stage {n}',
    enemyTag: 'Enemy {k}/{total}',
    hardStageTag: 'Hard {n}',
    bossRushTag: 'Boss Rush',
    bossCount: 'Boss #{k}',
    healed: 'HEALED!',
    healAmount: '+{hp} HP',
    heal: 'Heal',
    boost: 'ATK x{mult}',
    boostOn: 'ATK x{mult}!',
    ready: 'READY!',
    minion: 'MINION',
    boss: 'BOSS',
    freezeCountdown: 'FROZEN! {sec}s',
    casts: '{boss} CASTS:',
    effectName: {
      shuffle: 'CANDY SHUFFLE!',
      remove: 'DEVOURED {count} CANDIES!',
      freeze: 'BRAIN FREEZE ({sec}s)!'
    },
    effect: {
      shuffle: '{boss} shuffled the candies!',
      remove: '{boss} devoured {count} candies!',
      freeze: '{boss} froze your brain for {sec}s!'
    }
  },
  // Enemy taunt bubble after 5 wrong swaps in a row (GAME_SPEC decision 37). [DRAFT - owner to verify]
  taunts: {
    minion: {
      l1: 'Bro is just shuffling candies 💀',
      l2: 'Are you lost, little brain?',
      l3: 'Skill issue detected.',
      l4: "Take your time… I'll wait 😴",
      l5: "That's not a match, chief."
    },
    b1: {
      l1: 'Tralalero tralala~ missed again!',
      l2: 'My sneakers move faster than your brain.',
      l3: "Keep swiping, I'll keep singing~"
    },
    b2: {
      l1: 'A careless brain… my favorite target.',
      l2: "Too slow. Your coffee's getting cold.",
      l3: "I don't even need to sneak up on you."
    },
    b3: {
      l1: 'Even my tire has better aim.',
      l2: 'Ambalabu! Stuck in the mud?',
      l3: "You're rolling in circles, just like me."
    },
    b4: {
      l1: 'Tung tung tung… wake up, your brain is asleep!',
      l2: 'Sahur! Sahur! Still missing?',
      l3: 'Even at 3 AM I match better than you.'
    },
    b5: {
      l1: "Five brains in one, and you can't use one?",
      l2: 'Every part of me is laughing at you.',
      l3: 'The rot is winning, little brain.'
    }
  },
  // Boss Rush callouts (GAME_SPEC decision 38). Slang: same text in both languages.
  callouts: {
    tier2: 'Tung Tung!',
    tier3: 'TTT… Triple T',
    tier4: 'Ohio Level',
    tier5: 'You Got the Rizz'
  },
  timekill: {
    score: 'Score',
    bestScore: 'Best High Score',
    timeLeft: 'Time Left',
    effect: {
      freeze: 'Freeze: {sec}s',
      x5: '5x Score: {sec}s'
    },
    pause: 'Pause'
  },
  stageclear: {
    title: 'Stage Clear!',
    hpUpgrade: 'Max HP: {before} -> {after}',
    atkUpgrade: 'Attack: {before} -> {after}',
    nextStage: 'Next Stage',
    retry: 'Replay',
    menu: 'Stage Select',
    memeUnlocked: 'Meme Book entry unlocked!'
  },
  gameover: {
    title: 'Brainrot Overload',
    subtitle: 'Your brain got cooked!',
    retry: 'Retry Stage',
    menu: 'Main Menu'
  },
  results: {
    title: "Time's Up!",
    score: 'Final Score',
    bestScore: 'Best Score',
    newBest: 'NEW BEST!',
    playAgain: 'Play Again',
    menu: 'Main Menu',
    bossRush: {
      title: 'Boss Rush Over',
      score: 'Bosses Defeated',
      bestScore: 'Best Run'
    }
  },
  memebook: {
    title: 'Journal of Meme',
    topSecret: 'TOP SECRET',
    progress: '{count} / {total} collected',
    entry: 'Entry {n} / {total}',
    locked: 'LOCKED',
    hint: {
      boss: 'Defeat this boss once',
      candy: 'Destroy 100 of this candy: {current}/{target}'
    }
  },
  achievements: {
    title: 'Achievements',
    progress: '{count} / {total}',
    unlocked: 'Unlocked',
    toast: 'Achievement Unlocked!',
    freshNewBrain: {
      title: 'Fresh New Brain',
      desc: 'Finish Story Mode'
    },
    fullyBrainRot: {
      title: 'You are fully brain rot',
      desc: 'Stayed on the main menu with the theme music playing for 15 minutes straight.'
    },
    scoreHunter: {
      title: 'Score Hunter',
      desc: 'Reach 100000 score in Time Kill ({current}/{target})'
    },
    memeCurator: {
      title: 'Meme Curator',
      desc: 'Unlock all 11 Meme Book entries ({current}/{target})'
    },
    supportCreator: {
      title: 'Support Creator',
      desc: 'Click the donation button'
    },
    secret: 'SECRET',
    detoxComplete: {
      title: 'Detox Complete',
      desc: 'Beat 20 bosses in one Boss Rush run.'
    }
  },
  settings: {
    title: 'Settings',
    music: 'Music',
    sfx: 'SFX',
    language: 'Language',
    langEn: 'English',
    langId: 'Indonesia',
    howToPlay: 'How to play',
    resetProgress: 'Reset Progress',
    resetConfirm: 'Are you sure you want to reset all progress? All scores, achievements, and Meme Book entries will be restored to default.',
    ok: 'OK'
  },
  credits: {
    title: 'Credits',
    content: 'Pembusukan Otak\nA Brainrot Match-3 Combat Game',
    course: 'Made for the TPG 2026 course',
    techStack: 'Built with JavaScript, Phaser 3 and Vite',
    engineLink: '🎮 Game engine: Phaser (phaser.io)',
    fontsLink: '🔤 Fonts: Google Fonts (fonts.google.com)',
    musicCredit: '🎵 Music & SFX: Pixabay (pixabay.com)',
    sfxCredit: '🎬 Sounds: VP Masti (YouTube)',
    feedback: '💬 Feedback, ideas, or own an asset here? Chat on WhatsApp',
    support: 'Support the creator',
    author: 'Made by {name} · NRP {nrp}'
  },
  rotate: {
    title: 'Rotate your device',
    hint: 'Pembusukan Otak is played in landscape.'
  },
  donation: {
    title: 'Support the Creator',
    desc: 'Scan the QR code to support future meme games!',
    thanks: 'Thank you for playing!'
  },
  pause: {
    title: 'Game Paused',
    resume: 'Resume',
    restart: 'Restart',
    menu: 'Leave to Menu'
  },
  story: {
    intro: 'Brainrot algorithms are frying the human mind! Jump into the neural network, match candies, and restore your healthy brain.',
    area1: 'Welcome to Dopamine Drip. Endless notifications flood your senses. Defeat Tralalelo Tralala to escape!',
    area2: 'The Endless Scroll has no bottom. Cappuccino Assassino strikes from the dark alleys of the feed!',
    area3: 'Sensory overload at maximum speed! Dodge the distractions and crush Boneca Ambalabu!',
    area4: 'The deserted wasteland where attention spans go to die. Beware of Tung Tung Tung Sahur strike!',
    area5: 'The core of the meltdown! All brainrot beasts have fused into the ultimate monstrosity. Cleanse the brain!',
    ending: 'Congratulations! You defeated the final Brainrot chimera and restored total clarity. Nirodha triumphs!'
  },
  tutorial: {
    title: 'Tutorial',
    step1: {
      title: 'Match to Attack',
      desc: 'Swap adjacent candies to match 3 or more in a row or column.'
    },
    step2: {
      title: 'Deal Damage',
      desc: 'Every destroyed candy deals damage to the enemy!'
    },
    step3: {
      title: 'Watch Out!',
      desc: 'The enemy countdown bar ticks down. Bosses use wild special effects!'
    },
    timeKill: {
      step1: {
        title: 'Match for Points',
        desc: 'Swap neighbouring candies to line up 3 or more. Every candy you clear is worth {points} points.'
      },
      step2: {
        title: 'Race the Clock',
        desc: 'You have {min} minutes. A wrong swap costs {penalty} s. A move that sets off a chain reaction gives +{combo} s.'
      },
      step3: {
        title: 'Power-Ups',
        desc: 'Match 4 or more for +{bonus} s and a power candy. Match it or tap it twice: line, bomb, freeze ({freeze} s) or score x{mult} ({x5} s).'
      },
      step4: {
        title: 'Go for the High Score!',
        desc: 'No enemies here. Reach as high a score as you can before time runs out, and beat your best!'
      },
      minusSec: '-{sec} s',
      plusSec: '+{sec} s'
    },
    skip: 'Skip Tutorial',
    gotIt: 'Got It!'
  }
};
