// src/systems/InputManager.js
// Handles pointer events for match-3 board interaction: drag-to-swap or tap-tap swap.
import { SCREEN_CONFIG } from '../config/screen.config.js';

export class InputManager {
  constructor({ scene, onSwap, onPowerTap }) {
    this.scene = scene;
    this.onSwap = onSwap; // callback({ r1, c1, r2, c2 })
    this.onPowerTap = onPowerTap; // callback({ r, c })

    this.selectedCell = null;
    this.dragStartPos = null;
    this.isDragging = false;
    this.enabled = true;
    this.boardMetrics = null;
  }

  setBoardMetrics(metrics) {
    this.boardMetrics = metrics;
  }

  setEnabled(val) {
    this.enabled = val;
    if (!val) {
      this.selectedCell = null;
      this.dragStartPos = null;
      this.isDragging = false;
    }
  }

  bindEvents() {
    this.scene.input.on('pointerdown', (pointer) => this.handlePointerDown(pointer));
    this.scene.input.on('pointermove', (pointer) => this.handlePointerMove(pointer));
    this.scene.input.on('pointerup', (pointer) => this.handlePointerUp(pointer));
  }

  getCellFromPointer(pointer) {
    if (!this.boardMetrics) return null;
    const { startX, startY, cellSize, cols, rows } = this.boardMetrics;

    const px = pointer.x - startX;
    const py = pointer.y - startY;

    if (px < 0 || py < 0) return null;

    const c = Math.floor(px / cellSize);
    const r = Math.floor(py / cellSize);

    if (c >= 0 && c < cols && r >= 0 && r < rows) {
      return { r, c };
    }
    return null;
  }

  handlePointerDown(pointer) {
    if (!this.enabled || !this.boardMetrics) return;

    const cell = this.getCellFromPointer(pointer);
    if (!cell) {
      this.selectedCell = null;
      return;
    }

    this.dragStartPos = { x: pointer.x, y: pointer.y, cell };
    this.isDragging = true;
  }

  handlePointerMove(pointer) {
    if (!this.enabled || !this.isDragging || !this.dragStartPos || !this.boardMetrics) return;

    const dx = pointer.x - this.dragStartPos.x;
    const dy = pointer.y - this.dragStartPos.y;
    const threshold = this.boardMetrics.cellSize * SCREEN_CONFIG.swipeThresholdRatio;

    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      // Swiped!
      const startCell = this.dragStartPos.cell;
      let targetCell = null;

      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal swap
        const dc = dx > 0 ? 1 : -1;
        const nc = startCell.c + dc;
        if (nc >= 0 && nc < this.boardMetrics.cols) {
          targetCell = { r: startCell.r, c: nc };
        }
      } else {
        // Vertical swap
        const dr = dy > 0 ? 1 : -1;
        const nr = startCell.r + dr;
        if (nr >= 0 && nr < this.boardMetrics.rows) {
          targetCell = { r: nr, c: startCell.c };
        }
      }

      this.isDragging = false;
      this.dragStartPos = null;
      this.selectedCell = null;

      if (targetCell && this.onSwap) {
        this.onSwap({
          r1: startCell.r,
          c1: startCell.c,
          r2: targetCell.r,
          c2: targetCell.c
        });
      }
    }
  }

  handlePointerUp(pointer) {
    if (!this.enabled) return;

    if (this.isDragging && this.dragStartPos) {
      const cell = this.getCellFromPointer(pointer);
      const startCell = this.dragStartPos.cell;

      if (cell && cell.r === startCell.r && cell.c === startCell.c) {
        // It was a tap!
        if (this.selectedCell) {
          if (this.selectedCell.r === cell.r && this.selectedCell.c === cell.c) {
            // Tapped selected cell a second time -> trigger powerup if applicable
            if (this.onPowerTap) {
              this.onPowerTap(cell);
            }
            this.selectedCell = null;
          } else {
            // Check adjacency
            const dr = Math.abs(this.selectedCell.r - cell.r);
            const dc = Math.abs(this.selectedCell.c - cell.c);
            if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
              const prev = this.selectedCell;
              this.selectedCell = null;
              if (this.onSwap) {
                this.onSwap({ r1: prev.r, c1: prev.c, r2: cell.r, c2: cell.c });
              }
            } else {
              this.selectedCell = cell;
            }
          }
        } else {
          this.selectedCell = cell;
        }
      }
    }

    this.isDragging = false;
    this.dragStartPos = null;
  }
}

