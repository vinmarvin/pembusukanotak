export const SCREEN_CONFIG = {
  baseWidth: 1280,
  baseHeight: 720,
  minWidth: 320,
  minHeight: 320,
  uiScale: {
    baseDimension: 720,
    min: 0.6,
    max: 1.6,
    tokenScaleFactor: 0.667
  },
  minSizes: {
    buttonHeight: 44,
    bodyText: 14,
    label: 12,
    hudNumber: 18
  },
  swipeThresholdRatio: 0.3,
  dprCap: 2,
  topBarHeight: 64,
  // The top bar never draws shorter than this (its buttons are 44 px tall).
  topBarMinHeight: 56,
  safeMargin: 12,
  // Hard mode power-up buttons (tile size range, gap, and room for the two caption lines)
  powerUps: { maxSize: 72, minSize: 48, portraitSize: 56, gap: 10, captionH: 38, captionW: 84 },
  // Stage Select: the Hard / Boss mode buttons sit in the top bar from this width, else next to Back.
  modeButtons: { topBarMinWidth: 900, width: 130, height: 44, gap: 10 },
  // Board tray padding (BoardView draws the tray 9 px outside the cells, plus a 4 px shadow).
  // Reserved inside the board zone so the tray never touches the screen edge.
  boardTrayPad: 13,
  // Short landscape screens (phones turned sideways): the board uses the full height and the
  // fighter cards / score cards move to side columns instead of a row above the board.
  compactLandscape: {
    maxHeight: 600,
    sideMinWidth: 180,
    gap: 10
  }
};
