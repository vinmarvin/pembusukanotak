// src/core/device.js
// Input-device checks. PC = the main input is a mouse or trackpad (hover + fine pointer).
export function isDesktopPointer(query = '(hover: hover) and (pointer: fine)') {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia(query).matches;
  }
  return false;
}
