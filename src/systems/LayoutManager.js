// src/systems/LayoutManager.js
// Responsive layout manager computing zones, scaling, and safe areas.
import { SCREEN_CONFIG } from '../config/screen.config.js';
import { EventBus } from './EventBus.js';

class LayoutManagerImpl {
  constructor() {
    this._width = SCREEN_CONFIG.baseWidth;
    this._height = SCREEN_CONFIG.baseHeight;
    this._dpr = 1;
    this._resizeTimeout = null;
  }

  init(game) {
    this._game = game;
    this._dpr = Math.min(window?.devicePixelRatio || 1, SCREEN_CONFIG.dprCap);
    this.updateDimensions(game.scale.width, game.scale.height);

    game.scale.on('resize', (gameSize) => {
      this.handleResize(gameSize.width, gameSize.height);
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('orientationchange', () => {
        setTimeout(() => {
          if (this._game) {
            this.handleResize(this._game.scale.width, this._game.scale.height);
          }
        }, 100);
      });
    }
  }

  updateDimensions(width, height) {
    this._width = Math.max(width, SCREEN_CONFIG.minWidth);
    this._height = Math.max(height, SCREEN_CONFIG.minHeight);
  }

  isLandscape() {
    return this._width >= this._height;
  }

  isPortrait() {
    return this._width < this._height;
  }

  handleResize(width, height) {
    this.updateDimensions(width, height);
    if (this._resizeTimeout) clearTimeout(this._resizeTimeout);
    this._resizeTimeout = setTimeout(() => {
      const layout = this.getLayout();
      EventBus.emit('layout:changed', layout);
    }, 50);
  }

  getLayout() {
    const w = this._width;
    const h = this._height;
    const orientation = w >= h ? 'landscape' : 'portrait';
    const isLandscape = orientation === 'landscape';

    const minDim = Math.min(w, h);
    const rawScale = minDim / SCREEN_CONFIG.uiScale.baseDimension;
    const uiScale = Math.min(
      Math.max(rawScale, SCREEN_CONFIG.uiScale.min),
      SCREEN_CONFIG.uiScale.max
    );
    const tokenScale = uiScale * SCREEN_CONFIG.uiScale.tokenScaleFactor;

    const safeMargin = Math.round(SCREEN_CONFIG.safeMargin * uiScale);
    const topBarHeight = Math.round(SCREEN_CONFIG.topBarHeight * uiScale);

    // Common zones calculation
    const topBar = {
      x: 0,
      y: 0,
      width: w,
      height: topBarHeight
    };

    const contentArea = {
      x: safeMargin,
      y: topBarHeight + safeMargin,
      width: w - safeMargin * 2,
      height: h - topBarHeight - safeMargin * 2
    };

    // Battle Layout Zones (Bug 4: added clear gap between countdown and play board)
    let battle = {};
    const gapBetween = Math.max(18, Math.round(22 * uiScale));

    if (isLandscape) {
      const fightersHeight = Math.min(contentArea.height * 0.28, 140 * uiScale);
      const countdownHeight = Math.round(28 * uiScale);
      const countdownY = contentArea.y + fightersHeight + safeMargin * 0.5;
      const boardY = countdownY + countdownHeight + gapBetween;
      const remainingHeight = contentArea.y + contentArea.height - boardY;

      battle = {
        fighters: {
          x: contentArea.x,
          y: contentArea.y,
          width: contentArea.width,
          height: fightersHeight
        },
        countdown: {
          x: contentArea.x,
          y: countdownY,
          width: contentArea.width,
          height: countdownHeight
        },
        board: {
          x: contentArea.x,
          y: boardY,
          width: contentArea.width,
          height: Math.max(remainingHeight, 180)
        }
      };
    } else {
      // Portrait
      const fightersHeight = Math.min(contentArea.height * 0.20, 110 * uiScale);
      const countdownHeight = Math.round(24 * uiScale);
      const hintHeight = Math.round(30 * uiScale);
      const countdownY = contentArea.y + fightersHeight + safeMargin * 0.5;
      const boardY = countdownY + countdownHeight + gapBetween;
      const boardHeight = contentArea.height - (boardY - contentArea.y) - hintHeight - safeMargin;

      battle = {
        fighters: {
          x: contentArea.x,
          y: contentArea.y,
          width: contentArea.width,
          height: fightersHeight
        },
        countdown: {
          x: contentArea.x,
          y: countdownY,
          width: contentArea.width,
          height: countdownHeight
        },
        board: {
          x: contentArea.x,
          y: boardY,
          width: contentArea.width,
          height: Math.max(boardHeight, 200)
        },
        hint: {
          x: contentArea.x,
          y: boardY + boardHeight + safeMargin * 0.5,
          width: contentArea.width,
          height: hintHeight
        }
      };
    }

    // Time Kill Layout Zones
    let timeKill = {};
    if (isLandscape) {
      const headerHeight = Math.min(contentArea.height * 0.16, 75 * uiScale);
      const timerHeight = Math.round(28 * uiScale);
      const hintHeight = Math.round(24 * uiScale);
      const boardHeight = contentArea.height - headerHeight - timerHeight - hintHeight - safeMargin;

      timeKill = {
        header: {
          x: contentArea.x,
          y: contentArea.y,
          width: contentArea.width,
          height: headerHeight
        },
        timer: {
          x: contentArea.x,
          y: contentArea.y + headerHeight + 2,
          width: contentArea.width,
          height: timerHeight
        },
        board: {
          x: contentArea.x,
          y: contentArea.y + headerHeight + timerHeight + safeMargin * 0.25,
          width: contentArea.width,
          height: boardHeight
        },
        hint: {
          x: contentArea.x,
          y: contentArea.y + headerHeight + timerHeight + boardHeight + safeMargin * 0.25,
          width: contentArea.width,
          height: hintHeight
        }
      };
    } else {
      const headerHeight = Math.min(contentArea.height * 0.16, 85 * uiScale);
      const timerHeight = Math.round(30 * uiScale);
      const hintHeight = Math.round(28 * uiScale);
      const boardHeight = contentArea.height - headerHeight - timerHeight - hintHeight - safeMargin;

      timeKill = {
        header: {
          x: contentArea.x,
          y: contentArea.y,
          width: contentArea.width,
          height: headerHeight
        },
        timer: {
          x: contentArea.x,
          y: contentArea.y + headerHeight + 2,
          width: contentArea.width,
          height: timerHeight
        },
        board: {
          x: contentArea.x,
          y: contentArea.y + headerHeight + timerHeight + safeMargin * 0.25,
          width: contentArea.width,
          height: boardHeight
        },
        hint: {
          x: contentArea.x,
          y: contentArea.y + headerHeight + timerHeight + boardHeight + safeMargin * 0.25,
          width: contentArea.width,
          height: hintHeight
        }
      };
    }

    return {
      width: w,
      height: h,
      dpr: this._dpr,
      orientation,
      isLandscape,
      uiScale,
      tokenScale,
      safeMargin,
      topBar,
      contentArea,
      battle,
      timeKill
    };
  }

  // Calculate square cell dimensions centered inside any bounding zone
  computeBoardMetrics(cols, rows, zone) {
    const maxCellW = zone.width / cols;
    const maxCellH = zone.height / rows;
    const cellSize = Math.floor(Math.min(maxCellW, maxCellH));
    const boardWidth = cellSize * cols;
    const boardHeight = cellSize * rows;
    const startX = zone.x + Math.floor((zone.width - boardWidth) / 2);
    const startY = zone.y + Math.floor((zone.height - boardHeight) / 2);

    return {
      cols,
      rows,
      cellSize,
      boardWidth,
      boardHeight,
      startX,
      startY
    };
  }
}

export const LayoutManager = new LayoutManagerImpl();

