// src/systems/LayoutManager.js
// Responsive layout manager computing zones, scaling, and safe areas.
//
// Three layout modes:
//   - landscape (laptop / tablet): mockup layout. Fighter row, countdown row, board below.
//   - compact landscape (short screens, e.g. phones sideways): board uses the full height in the
//     centre; fighter / score cards and timers sit in side columns. Without this the board on a
//     ~390 px tall phone was only ~30 px per cell.
//   - portrait: stacked, board full width.
// Every mode also returns ready-made rectangles (playerCard, enemyCard, vs, scoreCard, ...) so the
// scenes only place things, they never re-derive the layout.
import { SCREEN_CONFIG } from '../config/screen.config.js';
import { EventBus } from './EventBus.js';

const rect = (x, y, width, height) => ({ x, y, width, height });
// Size of the Time Kill effect chips (TimeKillScene draws them at this size).
export const TK_CHIP = { w: 110, h: 32 };
const centeredRect = (cx, cy, width, height) => rect(cx - width / 2, cy - height / 2, width, height);

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
    const isCompact = isLandscape && h <= SCREEN_CONFIG.compactLandscape.maxHeight;

    const minDim = Math.min(w, h);
    const rawScale = minDim / SCREEN_CONFIG.uiScale.baseDimension;
    const uiScale = Math.min(
      Math.max(rawScale, SCREEN_CONFIG.uiScale.min),
      SCREEN_CONFIG.uiScale.max
    );
    const tokenScale = uiScale * SCREEN_CONFIG.uiScale.tokenScaleFactor;

    const safeMargin = Math.round(SCREEN_CONFIG.safeMargin * uiScale);
    // Must match what TopBar actually draws, or content slides under the bar on phones.
    const topBarHeight = Math.max(Math.round(SCREEN_CONFIG.topBarHeight * uiScale), SCREEN_CONFIG.topBarMinHeight);

    const topBar = rect(0, 0, w, topBarHeight);
    const contentArea = rect(
      safeMargin,
      topBarHeight + safeMargin,
      w - safeMargin * 2,
      h - topBarHeight - safeMargin * 2
    );

    const ctx = { w, h, uiScale, safeMargin, contentArea };
    const battle = isCompact ? this.battleCompact(ctx) : this.battleStacked(ctx, isLandscape);
    const timeKill = isCompact ? this.timeKillCompact(ctx) : this.timeKillStacked(ctx, isLandscape);

    return {
      width: w,
      height: h,
      dpr: this._dpr,
      orientation,
      isLandscape,
      isCompact,
      uiScale,
      tokenScale,
      safeMargin,
      topBar,
      contentArea,
      battle,
      timeKill
    };
  }

  // ── Shared helpers ─────────────────────────────────────────────────────────

  // Centre column for a board of cols x rows in compact landscape. Returns the board zone and
  // the two side columns. The board takes the full content height unless the side columns
  // would get narrower than sideMinWidth.
  compactColumns(contentArea, cols, rows) {
    const { sideMinWidth, gap } = SCREEN_CONFIG.compactLandscape;
    const pad = SCREEN_CONFIG.boardTrayPad;
    const maxBoardW = contentArea.width - 2 * (sideMinWidth + gap);
    const cell = Math.floor(Math.min((contentArea.height - pad * 2) / rows, (maxBoardW - pad * 2) / cols));
    const zoneW = cell * cols + pad * 2;
    const zoneX = contentArea.x + (contentArea.width - zoneW) / 2;
    const sideW = zoneX - gap - contentArea.x;
    return {
      gap,
      board: rect(zoneX, contentArea.y, zoneW, contentArea.height),
      left: rect(contentArea.x, contentArea.y, sideW, contentArea.height),
      right: rect(zoneX + zoneW + gap, contentArea.y, sideW, contentArea.height)
    };
  }

  // ── Battle ─────────────────────────────────────────────────────────────────

  battleStacked({ uiScale, safeMargin, contentArea }, isLandscape) {
    const gapBetween = Math.max(18, Math.round(22 * uiScale));
    const fightersHeight = isLandscape
      ? Math.min(contentArea.height * 0.28, 140 * uiScale)
      : Math.min(contentArea.height * 0.2, 110 * uiScale);
    const countdownHeight = Math.round((isLandscape ? 28 : 24) * uiScale);
    const hintHeight = isLandscape ? 0 : Math.round(30 * uiScale);
    const countdownY = contentArea.y + fightersHeight + safeMargin * 0.5;
    const boardY = countdownY + countdownHeight + gapBetween;
    const boardHeight = contentArea.y + contentArea.height - boardY - (isLandscape ? 0 : hintHeight + safeMargin);

    const fighters = rect(contentArea.x, contentArea.y, contentArea.width, fightersHeight);
    const cx = fighters.x + fighters.width / 2;
    const cy = fighters.y + fighters.height / 2;
    const vsW = Math.max(90, 110 * uiScale);
    const vsH = Math.max(54, 68 * uiScale);
    const cardGap = 8;
    // Cards never run into the VS badge: on narrow phones they shrink and move to the edges.
    const cardW = Math.min(fighters.width * 0.38, 220 * uiScale, (fighters.width - vsW - cardGap * 2) / 2);
    const cardH = Math.min(fighters.height * 0.9, 90 * uiScale);
    const offset = Math.max(fighters.width * 0.28, vsW / 2 + cardGap + cardW / 2);

    const battle = {
      mode: 'stacked',
      fighters,
      playerCard: centeredRect(cx - offset, cy, cardW, cardH),
      enemyCard: centeredRect(cx + offset, cy, cardW, cardH),
      vs: centeredRect(cx, cy, vsW, vsH),
      countdown: rect(contentArea.x, countdownY, contentArea.width, countdownHeight),
      board: rect(contentArea.x, boardY, contentArea.width, Math.max(boardHeight, isLandscape ? 180 : 200))
    };
    if (!isLandscape) {
      battle.hint = rect(contentArea.x, boardY + boardHeight + safeMargin * 0.5, contentArea.width, hintHeight);
    }
    return battle;
  }

  battleCompact({ uiScale, contentArea }) {
    const { board, left, right, gap } = this.compactColumns(contentArea, 8, 7);
    const cardH = Math.min(contentArea.height * 0.42, 130);
    const vsW = Math.min(left.width * 0.7, 110);
    const vsH = Math.max(54, 68 * uiScale);
    const countdownH = Math.max(18, Math.round(24 * uiScale));
    return {
      mode: 'compact',
      // Fighters zone = the left column (kept for callers that only need a zone)
      fighters: left,
      playerCard: rect(left.x, left.y, left.width, cardH),
      vs: centeredRect(left.x + left.width / 2, left.y + cardH + gap + vsH / 2, vsW, vsH),
      enemyCard: rect(right.x, right.y, right.width, cardH),
      // Enemy attack countdown sits under the enemy card
      countdown: rect(right.x, right.y + cardH + gap * 2, right.width, countdownH),
      board
    };
  }

  // ── Time Kill ──────────────────────────────────────────────────────────────

  timeKillStacked({ w, h, uiScale, safeMargin, contentArea }, isLandscape) {
    const headerHeight = Math.min(contentArea.height * 0.16, (isLandscape ? 75 : 85) * uiScale);
    const timerHeight = Math.round((isLandscape ? 28 : 30) * uiScale);
    // Portrait: the header is too narrow for score cards + effect chips, so the chips get their
    // own row above the board (portrait boards are width-limited, so this costs no board size).
    const chipRowHeight = isLandscape ? 0 : TK_CHIP.h + 8;
    const boardHeight = contentArea.height - headerHeight - timerHeight - chipRowHeight - safeMargin;

    const header = rect(contentArea.x, contentArea.y, contentArea.width, headerHeight);
    const timer = rect(contentArea.x, contentArea.y + headerHeight + 2, contentArea.width, timerHeight);
    const boardY = contentArea.y + headerHeight + timerHeight + chipRowHeight + safeMargin * 0.25;
    const board = rect(contentArea.x, boardY, contentArea.width, boardHeight);

    const hx = header.x + header.width / 2;
    const hy = header.y + header.height / 2;
    const cardW = Math.min(180 * uiScale, header.width * 0.32);
    const cardH = Math.min(65 * uiScale, header.height * 0.7);
    const chipY = isLandscape ? hy : timer.y + timer.height + chipRowHeight / 2;
    const chipDx = TK_CHIP.w / 2 + (isLandscape ? 3 : 6);
    // Landscape: chips sit between the score cards, so keep the cards clear of them.
    const cardOffset = isLandscape ? Math.max(cardW * 1.1, TK_CHIP.w + 8 + cardW / 2) : cardW * 1.1;
    return {
      mode: 'stacked',
      header,
      timer,
      board,
      scoreCard: centeredRect(hx - cardOffset, hy, cardW, cardH),
      bestCard: centeredRect(hx + cardOffset, hy, cardW, cardH),
      freezeChip: { x: hx - chipDx, y: chipY },
      x5Chip: { x: hx + chipDx, y: chipY },
      timerBar: centeredRect(w / 2, timer.y + timer.height / 2, Math.min(w * 0.7, 360 * uiScale), Math.max(20, Math.min(26, timer.height)))
    };
  }

  timeKillCompact({ uiScale, contentArea }) {
    const { board, left, right, gap } = this.compactColumns(contentArea, 8, 8);
    const cardH = Math.max(52, Math.min(70, contentArea.height * 0.2));
    const cardW = Math.min(left.width, 200);
    const lx = left.x + left.width / 2;
    const rx = right.x + right.width / 2;
    const timerH = Math.max(20, Math.round(24 * uiScale));
    const timerY = left.y + cardH * 2 + gap * 3 + timerH / 2;
    return {
      mode: 'compact',
      header: left,
      timer: rect(left.x, timerY - timerH / 2, left.width, timerH),
      board,
      scoreCard: centeredRect(lx, left.y + cardH / 2, cardW, cardH),
      bestCard: centeredRect(lx, left.y + cardH * 1.5 + gap, cardW, cardH),
      freezeChip: { x: rx, y: right.y + TK_CHIP.h / 2 + 4 },
      x5Chip: { x: rx, y: right.y + TK_CHIP.h * 1.5 + 4 + gap },
      timerBar: centeredRect(lx, timerY, Math.min(left.width * 0.95, 260), timerH)
    };
  }

  // Hard mode power-up buttons (2 tiles). Returns the board zone to use (portrait gives up a row
  // under the board) and the tile centres:
  //   compact landscape: side by side in the left column under the VS badge
  //   stacked landscape: stacked in the free space left of the board, from the board top
  //   portrait:          side by side in a row under the board
  planPowerUps(layout, cols, rows) {
    const cfg = SCREEN_CONFIG.powerUps;
    const { battle, contentArea } = layout;
    const clampSize = (v) => Math.max(cfg.minSize, Math.min(cfg.maxSize, Math.floor(v)));

    if (battle.mode === 'compact') {
      const left = battle.fighters;
      const top = battle.vs.y + battle.vs.height + cfg.gap;
      const size = clampSize(Math.min((left.width - cfg.gap) / 2, left.y + left.height - top - cfg.captionH));
      const cx = left.x + left.width / 2;
      const y = top + size / 2;
      const dx = (Math.max(size, cfg.captionW) + cfg.gap) / 2;
      return { boardZone: battle.board, size, positions: [{ x: cx - dx, y }, { x: cx + dx, y }] };
    }

    const metrics = this.computeBoardMetrics(cols, rows, battle.board);
    const pad = SCREEN_CONFIG.boardTrayPad;
    const leftSpace = metrics.startX - pad - contentArea.x;
    if (leftSpace >= cfg.minSize + cfg.gap * 2) {
      const size = clampSize(leftSpace - cfg.gap * 2);
      const x = contentArea.x + leftSpace / 2;
      const y1 = metrics.startY + size / 2;
      return {
        boardZone: battle.board,
        size,
        positions: [{ x, y: y1 }, { x, y: y1 + size + cfg.captionH + cfg.gap }]
      };
    }

    const size = cfg.portraitSize;
    const rowH = size + cfg.captionH + cfg.gap;
    const boardZone = rect(battle.board.x, battle.board.y, battle.board.width, battle.board.height - rowH);
    const m = this.computeBoardMetrics(cols, rows, boardZone);
    const y = m.startY + m.boardHeight + pad + cfg.gap + size / 2;
    const cx = contentArea.x + contentArea.width / 2;
    const dx = (Math.max(size, cfg.captionW) + cfg.gap) / 2;
    return { boardZone, size, positions: [{ x: cx - dx, y }, { x: cx + dx, y }] };
  }

  // Free space for the enemy taunt bubble (GAME_SPEC decision 37): right of the board tray and of
  // `avoidRight` (the countdown bar's right edge), from below the enemy card to the bottom of the
  // content. Stacked landscape only. Returns null when there is no room, so the bubble never
  // covers the board.
  planTauntBubble(layout, metrics, { avoidRight = 0, minWidth, gap }) {
    const { contentArea, battle } = layout;
    if (!layout.isLandscape || layout.isCompact || battle.mode !== 'stacked') return null;
    const pad = SCREEN_CONFIG.boardTrayPad;
    const left = Math.max(metrics.startX + metrics.boardWidth + pad, avoidRight) + gap;
    const right = contentArea.x + contentArea.width;
    const top = battle.enemyCard.y + battle.enemyCard.height + gap;
    const bottom = contentArea.y + contentArea.height;
    if (right - left < minWidth || bottom - top < minWidth / 3) return null;
    return rect(left, top, right - left, bottom - top);
  }

  // Square cells centred in the zone. The tray padding is kept free on every side,
  // so the board tray never touches the zone edge (or the screen edge).
  computeBoardMetrics(cols, rows, zone) {
    const pad = SCREEN_CONFIG.boardTrayPad;
    const maxCellW = (zone.width - pad * 2) / cols;
    const maxCellH = (zone.height - pad * 2) / rows;
    const cellSize = Math.max(1, Math.floor(Math.min(maxCellW, maxCellH)));
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
