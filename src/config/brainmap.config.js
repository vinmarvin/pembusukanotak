// src/config/brainmap.config.js
// Stage Select brain map (owner request): a side-view brain drawn in code. Areas that are not
// cleared yet are covered in brainrot (green slime, bruises); clearing an area heals that part.
// All coordinates are in a fixed design space (designW x designH) that is scaled to fit the map
// panel, so the brain keeps its shape on every screen.
export const BRAIN_MAP = {
  designW: 1000,
  designH: 700,
  // Share of the map panel the brain may fill
  fill: 0.94,
  seed: 4242,

  // Cerebrum outline control points (smooth closed curve, frontal lobe on the left)
  cerebrum: [
    { x: 118, y: 392 }, { x: 84, y: 286 }, { x: 128, y: 168 }, { x: 250, y: 86 },
    { x: 410, y: 50 }, { x: 580, y: 54 }, { x: 735, y: 102 }, { x: 860, y: 196 },
    { x: 912, y: 306 }, { x: 878, y: 410 }, { x: 790, y: 460 }, { x: 668, y: 452 },
    { x: 566, y: 486 }, { x: 420, y: 516 }, { x: 282, y: 494 }, { x: 178, y: 452 }
  ],
  outlineSamples: 220,
  // Scalloped edge: number of bumps around the outline and their height
  bumps: 26,
  bumpAmp: 9,

  cerebellum: { x: 748, y: 522, rx: 132, ry: 78, folia: 6 },
  stem: [
    { x: 584, y: 470 }, { x: 650, y: 470 }, { x: 664, y: 560 }, { x: 676, y: 668 },
    { x: 614, y: 672 }, { x: 604, y: 566 }
  ],

  // Main grooves between lobes (central sulcus and lateral fissure)
  fissures: [
    [{ x: 520, y: 62 }, { x: 498, y: 140 }, { x: 470, y: 220 }, { x: 452, y: 300 }],
    [{ x: 214, y: 420 }, { x: 330, y: 392 }, { x: 460, y: 360 }, { x: 610, y: 352 }]
  ],
  // Folds (gyri): meandering grooves drawn inside the cerebrum
  gyri: { count: 60, segments: 16, segmentLen: 20, turn: 0.55, inset: 0.9 },

  // Stage node anchors (design space), from the outer edge of the brain to its core
  nodes: [
    { x: 196, y: 318 },  // 1 Dopamine Drip (frontal lobe)
    { x: 330, y: 168 },  // 2 Endless Scroll
    { x: 600, y: 150 },  // 3 Subway Surfer (parietal lobe)
    { x: 786, y: 318 },  // 4 Brainrot Wasteland (occipital lobe)
    { x: 500, y: 408 }   // 5 Brainrot Meltdown (the core)
  ],

  // Brainrot patch drawn around each uncleared area
  rot: { radius: 120, blobs: 9, blobMin: 16, blobMax: 46, bubbles: 7 },

  colors: {
    brain: 0xC75C8C,
    brainHighlight: 0xF29BC0,
    groove: 0x7E2A57,
    cerebellum: 0xB04D7C,
    stem: 0x8E3E68,
    outline: 0x0B0410,
    rotSlime: 0x6BBF3A,
    rotBruise: 0x3E1650,
    rotBubble: 0xB6F27A,
    healedGlow: 0xFFD1E6
  },
  alpha: { rotSlime: 0.55, rotBruise: 0.55, rotBubble: 0.8, healedGlow: 0.35 },
  outlineWidth: 7,
  grooveWidth: 9,

  // Node circles scale with the brain, within these limits
  nodeScale: { min: 0.55, max: 1, perBrainScale: 1.25 }
};
