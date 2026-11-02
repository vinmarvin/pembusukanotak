// src/core/assets/classify.js
// Pure classification of visual and audio file names into logical asset keys.

export function normalizeName(name) {
  // Lowercase, remove accents (e.g. ì -> i, à -> a), keep letters and digits only
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function classifyAsset(filePath, overrides = {}) {
  // Check explicit owner overrides first (file name or path)
  const fileName = filePath.split(/[/\\]/).pop();
  if (overrides[filePath]) return overrides[filePath];
  if (overrides[fileName]) return overrides[fileName];

  const norm = normalizeName(filePath);
  const isAudio = /\.(mp3|m4a|wav|ogg|flac|aac)$/i.test(filePath);

  if (isAudio) {
    return classifyAudio(norm, filePath);
  } else {
    return classifyVisual(norm, filePath);
  }
}

function classifyAudio(norm, originalPath) {
  // BGM matching
  if (norm.includes('bgm') || norm.includes('music')) {
    if (norm.includes('timeattack') || norm.includes('timekill') || norm.includes('timekiller') || norm.includes('tk')) {
      return { key: 'bgm.timekill', kind: 'audio', category: 'bgm' };
    }
    if (norm.includes('story')) {
      return { key: 'bgm.story', kind: 'audio', category: 'bgm' };
    }
    if (norm.includes('menu') || norm.includes('title') || norm.includes('start') || norm.includes('main')) {
      return { key: 'bgm.menu', kind: 'audio', category: 'bgm' };
    }
  }

  // Boss SFX: b5 must be tested first because b5 contains words of other bosses!
  if (norm.includes('sfx') || norm.includes('boss')) {
    if (
      norm.includes('trippa') ||
      norm.includes('troppa') ||
      norm.includes('crocodina') ||
      norm.includes('combined')
    ) {
      return { key: 'sfx.boss.b5', kind: 'audio', category: 'sfx' };
    }
    if (norm.includes('tralalelo') || norm.includes('tralalero')) {
      return { key: 'sfx.boss.b1', kind: 'audio', category: 'sfx' };
    }
    if (norm.includes('cappuccino') || norm.includes('assassino')) {
      return { key: 'sfx.boss.b2', kind: 'audio', category: 'sfx' };
    }
    if (norm.includes('ambalabu') || (norm.includes('boneca') && !norm.includes('crocodina'))) {
      return { key: 'sfx.boss.b3', kind: 'audio', category: 'sfx' };
    }
    if (norm.includes('tungtung') || norm.includes('sahur')) {
      return { key: 'sfx.boss.b4', kind: 'audio', category: 'sfx' };
    }
  }

  // Candy SFX
  if (norm.includes('sfx') || norm.includes('candy')) {
    if (norm.includes('67') || norm.includes('sixseven')) {
      return { key: 'sfx.candy.c67', kind: 'audio', category: 'sfx' };
    }
    if (norm.includes('nugget')) {
      return { key: 'sfx.candy.nugget', kind: 'audio', category: 'sfx' };
    }
    if (norm.includes('skibidi') || norm.includes('toilet')) {
      return { key: 'sfx.candy.skibidi', kind: 'audio', category: 'sfx' };
    }
    if (norm.includes('lirili') || norm.includes('larila')) {
      return { key: 'sfx.candy.lirili', kind: 'audio', category: 'sfx' };
    }
    if (norm.includes('udin')) {
      return { key: 'sfx.candy.udin', kind: 'audio', category: 'sfx' };
    }
    if (norm.includes('bluberini') || norm.includes('blueberrinni') || norm.includes('octopus')) {
      return { key: 'sfx.candy.bluberini', kind: 'audio', category: 'sfx' };
    }
  }

  if (norm.includes('hit') || norm.includes('damage')) {
    return { key: 'sfx.hit', kind: 'audio', category: 'sfx' };
  }

  // Optional sfx
  for (const opt of ['match', 'swap', 'invalid', 'win', 'lose', 'click', 'powerup', 'freeze']) {
    if (norm.includes(opt)) {
      return { key: `sfx.${opt}`, kind: 'audio', category: 'sfx' };
    }
  }

  return null;
}

function classifyVisual(norm, originalPath) {
  // 1. Bosses: Check b5 first because b5 name contains tralala, lirila, tung tung sahur, boneca!
  if (
    norm.includes('trippa') ||
    norm.includes('troppa') ||
    norm.includes('crocodina') ||
    norm.includes('combined')
  ) {
    return { key: 'b5', kind: 'image', category: 'boss' };
  }
  if (norm.includes('tralalelo') || norm.includes('tralalero')) {
    return { key: 'b1', kind: 'image', category: 'boss' };
  }
  if (norm.includes('cappuccino') || norm.includes('assassino')) {
    return { key: 'b2', kind: 'image', category: 'boss' };
  }
  if (norm.includes('ambalabu') || (norm.includes('boneca') && !norm.includes('crocodina'))) {
    return { key: 'b3', kind: 'image', category: 'boss' };
  }
  if (norm.includes('tungtung') || norm.includes('sahur')) {
    return { key: 'b4', kind: 'image', category: 'boss' };
  }

  // 2. Candies
  if (norm.includes('67') || norm.includes('sixseven')) {
    return { key: 'c67', kind: 'image', category: 'candy' };
  }
  if (norm.includes('nugget')) {
    return { key: 'nugget', kind: 'image', category: 'candy' };
  }
  if (norm.includes('skibidi') || norm.includes('toilet')) {
    return { key: 'skibidi', kind: 'image', category: 'candy' };
  }
  if (norm.includes('lirili') || norm.includes('larila') || norm.includes('cactus') || norm.includes('kaktus')) {
    return { key: 'lirili', kind: 'image', category: 'candy' };
  }
  if (norm.includes('udin')) {
    return { key: 'udin', kind: 'image', category: 'candy' };
  }
  if (norm.includes('bluberini') || norm.includes('octopus') || norm.includes('gurita')) {
    return { key: 'bluberini', kind: 'image', category: 'candy' };
  }

  // 3. Minions
  if (norm.includes('minion') || norm.includes('kroco') || norm.includes('enemy') || norm.includes('monster')) {
    let size = 'small';
    if (norm.includes('medium') || norm.includes('sedang') || norm.includes('med')) {
      size = 'medium';
    } else if (norm.includes('large') || norm.includes('big') || norm.includes('besar')) {
      size = 'large';
    } else if (norm.includes('small') || norm.includes('kecil')) {
      size = 'small';
    }

    return { key: size, kind: 'image', category: 'minion', size };
  }

  // 4. Special visuals
  if (norm.includes('logo')) return { key: 'logo', kind: 'image', category: 'special' };
  if (norm.includes('player') || norm.includes('otaksehat')) return { key: 'player', kind: 'image', category: 'special' };
  if (norm.includes('qr')) return { key: 'qr', kind: 'image', category: 'special' };

  return null;
}

