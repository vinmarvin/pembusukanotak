// src/core/assets/fit.js
// Pure mathematical functions for size-fitting sprites consistently without stretching.

export function fitCandy(sourceWidth, sourceHeight, cellSize) {
  if (!sourceWidth || !sourceHeight || !cellSize) {
    return { scale: 1, scaleX: 1, scaleY: 1, visibleWidth: 0, visibleHeight: 0, longerSide: 0 };
  }
  const targetLongerSide = 0.8 * cellSize;
  const maxSrcDim = Math.max(sourceWidth, sourceHeight);
  const scale = targetLongerSide / maxSrcDim;

  const visibleWidth = sourceWidth * scale;
  const visibleHeight = sourceHeight * scale;

  return {
    scale,
    scaleX: scale,
    scaleY: scale,
    visibleWidth,
    visibleHeight,
    longerSide: Math.max(visibleWidth, visibleHeight)
  };
}

export function fitContain(sourceWidth, sourceHeight, slotWidth, slotHeight) {
  if (!sourceWidth || !sourceHeight || !slotWidth || !slotHeight) {
    return { scale: 1, scaleX: 1, scaleY: 1, visibleWidth: 0, visibleHeight: 0 };
  }
  const scale = Math.min(slotWidth / sourceWidth, slotHeight / sourceHeight);
  return {
    scale,
    scaleX: scale,
    scaleY: scale,
    visibleWidth: sourceWidth * scale,
    visibleHeight: sourceHeight * scale
  };
}

export function fitPortrait(sourceWidth, sourceHeight, slot) {
  const { width: slotWidth, height: slotHeight } = slot;
  const fit = fitContain(sourceWidth, sourceHeight, slotWidth, slotHeight);

  return {
    ...fit,
    originX: 0.5,
    originY: 1.0, // Anchored to bottom of the slot per ASSETS_SPEC 4
    x: slot.x + slotWidth / 2,
    y: slot.y + slotHeight
  };
}

