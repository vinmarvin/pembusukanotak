import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { runSyncAssets } from '../../scripts/sync-assets.mjs';

function getDirChecksums(dir) {
  if (!fs.existsSync(dir)) return {};
  const map = {};
  function scan(curr) {
    for (const item of fs.readdirSync(curr)) {
      const p = path.join(curr, item);
      if (fs.statSync(p).isDirectory()) {
        scan(p);
      } else {
        const hash = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
        map[path.relative(dir, p)] = hash;
      }
    }
  }
  scan(dir);
  return map;
}

describe('Read-Only Originals Integrity (ASSETS_SPEC & Phase 1 Gate)', () => {
  it('does not modify, move, or rename any file in visual/, audio/, or design/', () => {
    const visualBefore = getDirChecksums('visual');
    const audioBefore = getDirChecksums('audio');
    const designBefore = getDirChecksums('design');

    // Run sync-assets again
    runSyncAssets();

    const visualAfter = getDirChecksums('visual');
    const audioAfter = getDirChecksums('audio');
    const designAfter = getDirChecksums('design');

    expect(visualAfter).toEqual(visualBefore);
    expect(audioAfter).toEqual(audioBefore);
    expect(designAfter).toEqual(designBefore);
  });
});

