// src/core/reducedMotion.js
// Detects OS prefers-reduced-motion setting.
export function prefersReducedMotion() {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
}

