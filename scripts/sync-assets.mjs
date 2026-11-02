// scripts/sync-assets.mjs
// Asset pipeline: scans visual/ and audio/, classifies, trims transparent margins,
// downscales, converts/copies, produces manifest and assets.report.md.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PNG } from 'pngjs';
import { classifyAsset } from '../src/core/assets/classify.js';
import { ASSETS_MAP_OVERRIDES } from '../src/config/assets.map.js';

const ROOT_DIR = process.cwd();
const VISUAL_DIR = path.join(ROOT_DIR, 'visual');
const AUDIO_DIR = path.join(ROOT_DIR, 'audio');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public/assets');
const IMAGES_OUT = path.join(PUBLIC_DIR, 'images');
const AUDIO_OUT = path.join(PUBLIC_DIR, 'audio');

const MANIFEST_PATH = path.join(ROOT_DIR, 'src/config/assets.generated.js');
const REPORT_PATH = fs.existsSync(path.join(ROOT_DIR, 'Agents'))
  ? path.join(ROOT_DIR, 'Agents/assets.report.md')
  : path.join(ROOT_DIR, 'assets.report.md');

const MAX_SIZES = {
  candy: 256,
  minion: 768,
  boss: 768,
  special: 768,
  logo: 1024,
  qr: 512
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function scanFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  function recurse(current) {
    const list = fs.readdirSync(current);
    for (const item of list) {
      const fullPath = path.join(current, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        recurse(fullPath);
      } else {
        results.push(fullPath);
      }
    }
  }
  recurse(dir);
  return results;
}

function computeFileHash(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function trimAndScalePng(buf, maxDim) {
  const png = PNG.sync.read(buf);
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;
  let hasAlpha = false;

  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = (png.width * y + x) << 2;
      const a = png.data[idx + 3];
      if (a < 255) hasAlpha = true;
      if (a > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    minX = 0;
    minY = 0;
    maxX = png.width - 1;
    maxY = png.height - 1;
  }

  const trimmedWidth = maxX - minX + 1;
  const trimmedHeight = maxY - minY + 1;

  // Cropped buffer
  const cropped = new PNG({ width: trimmedWidth, height: trimmedHeight });
  for (let y = 0; y < trimmedHeight; y++) {
    for (let x = 0; x < trimmedWidth; x++) {
      const srcIdx = (png.width * (minY + y) + (minX + x)) << 2;
      const dstIdx = (trimmedWidth * y + x) << 2;
      cropped.data[dstIdx] = png.data[srcIdx];
      cropped.data[dstIdx + 1] = png.data[srcIdx + 1];
      cropped.data[dstIdx + 2] = png.data[srcIdx + 2];
      cropped.data[dstIdx + 3] = png.data[srcIdx + 3];
    }
  }

  let finalPng = cropped;
  const longerSide = Math.max(trimmedWidth, trimmedHeight);

  if (longerSide > maxDim) {
    const scale = maxDim / longerSide;
    const targetW = Math.max(1, Math.round(trimmedWidth * scale));
    const targetH = Math.max(1, Math.round(trimmedHeight * scale));

    const scaled = new PNG({ width: targetW, height: targetH });
    const xRatio = trimmedWidth / targetW;
    const yRatio = trimmedHeight / targetH;

    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < targetW; x++) {
        const srcX = x * xRatio;
        const srcY = y * yRatio;
        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const x1 = Math.min(x0 + 1, trimmedWidth - 1);
        const y1 = Math.min(y0 + 1, trimmedHeight - 1);
        const xDiff = srcX - x0;
        const yDiff = srcY - y0;
        const dstIdx = (y * targetW + x) << 2;

        for (let c = 0; c < 4; c++) {
          const p00 = cropped.data[(y0 * trimmedWidth + x0) * 4 + c];
          const p10 = cropped.data[(y0 * trimmedWidth + x1) * 4 + c];
          const p01 = cropped.data[(y1 * trimmedWidth + x0) * 4 + c];
          const p11 = cropped.data[(y1 * trimmedWidth + x1) * 4 + c];

          const val =
            p00 * (1 - xDiff) * (1 - yDiff) +
            p10 * xDiff * (1 - yDiff) +
            p01 * (1 - xDiff) * yDiff +
            p11 * xDiff * yDiff;

          scaled.data[dstIdx + c] = Math.round(val);
        }
      }
    }
    finalPng = scaled;
  }

  const outBuf = PNG.sync.write(finalPng);
  return {
    buffer: outBuf,
    originalSize: { width: png.width, height: png.height },
    trimmedSize: { width: trimmedWidth, height: trimmedHeight },
    finalSize: { width: finalPng.width, height: finalPng.height },
    hasAlpha
  };
}

export function runSyncAssets() {
  console.log('[sync-assets] Starting asset pipeline...');
  ensureDir(PUBLIC_DIR);
  ensureDir(IMAGES_OUT);
  ensureDir(AUDIO_OUT);

  const manifest = {
    images: {},
    audio: {}
  };

  const report = {
    mapped: [],
    unmatched: [],
    missingKeys: [],
    noAlpha: [],
    aspectRatioAnomalies: []
  };

  // 1. Process Visual Assets
  const visualFiles = scanFiles(VISUAL_DIR);
  for (const vFile of visualFiles) {
    const classification = classifyAsset(vFile, ASSETS_MAP_OVERRIDES);
    if (!classification) {
      report.unmatched.push(path.relative(ROOT_DIR, vFile));
      continue;
    }

    const { key, category } = classification;
    const maxDim = MAX_SIZES[category] || 768;

    try {
      const srcBuf = fs.readFileSync(vFile);
      const isPng = vFile.toLowerCase().endsWith('.png');

      let processed = null;
      let outFileName = `${key}.png`;
      let outPath = path.join(IMAGES_OUT, outFileName);

      if (isPng) {
        processed = trimAndScalePng(srcBuf, maxDim);
        fs.writeFileSync(outPath, processed.buffer);
      } else {
        // Direct copy for jpg/webp if present
        const ext = path.extname(vFile);
        outFileName = `${key}${ext}`;
        outPath = path.join(IMAGES_OUT, outFileName);
        fs.copyFileSync(vFile, outPath);
        processed = {
          originalSize: { width: 0, height: 0 },
          trimmedSize: { width: 0, height: 0 },
          finalSize: { width: 0, height: 0 },
          hasAlpha: true
        };
      }

      const relPublicPath = `assets/images/${outFileName}`;
      manifest.images[key] = {
        key,
        path: relPublicPath,
        category,
        originalSize: processed.originalSize,
        trimmedSize: processed.trimmedSize,
        finalSize: processed.finalSize
      };

      if (!processed.hasAlpha && (category === 'candy' || category === 'boss')) {
        report.noAlpha.push(key);
      }

      report.mapped.push({
        source: path.relative(ROOT_DIR, vFile),
        key,
        kind: 'image',
        category,
        original: `${processed.originalSize.width}x${processed.originalSize.height}`,
        trimmed: `${processed.trimmedSize.width}x${processed.trimmedSize.height}`,
        final: `${processed.finalSize.width}x${processed.finalSize.height}`
      });
    } catch (err) {
      console.warn(`[sync-assets] Failed to process visual asset ${vFile}:`, err);
    }
  }

  // 2. Process Audio Assets
  const audioFiles = scanFiles(AUDIO_DIR);
  for (const aFile of audioFiles) {
    const classification = classifyAsset(aFile, ASSETS_MAP_OVERRIDES);
    if (!classification) {
      report.unmatched.push(path.relative(ROOT_DIR, aFile));
      continue;
    }

    const { key, category } = classification;
    const ext = path.extname(aFile);
    const safeKey = key.replace(/\./g, '_');
    const outFileName = `${safeKey}${ext}`;
    const outPath = path.join(AUDIO_OUT, outFileName);

    try {
      fs.copyFileSync(aFile, outPath);
      const relPublicPath = `assets/audio/${outFileName}`;

      manifest.audio[key] = {
        key,
        path: relPublicPath,
        category
      };

      report.mapped.push({
        source: path.relative(ROOT_DIR, aFile),
        key,
        kind: 'audio',
        category,
        original: `${fs.statSync(aFile).size} bytes`,
        trimmed: 'N/A',
        final: relPublicPath
      });
    } catch (err) {
      console.warn(`[sync-assets] Failed to copy audio asset ${aFile}:`, err);
    }
  }

  // 3. Check for Missing Required Keys
  const requiredCandies = ['c67', 'nugget', 'skibidi', 'lirili', 'udin', 'bluberini'];
  const requiredBosses = ['b1', 'b2', 'b3', 'b4', 'b5'];
  const requiredMinions = ['small', 'medium', 'large'];
  const requiredAudio = [
    'bgm.menu',
    'bgm.story',
    'bgm.timekill',
    'sfx.hit',
    'sfx.boss.b1',
    'sfx.boss.b2',
    'sfx.boss.b3',
    'sfx.boss.b4',
    'sfx.boss.b5'
  ];

  for (const c of requiredCandies) {
    if (!manifest.images[c]) report.missingKeys.push(`candy: ${c}`);
  }
  for (const b of requiredBosses) {
    if (!manifest.images[b]) report.missingKeys.push(`boss: ${b}`);
  }
  for (const m of requiredMinions) {
    if (!manifest.images[m]) report.missingKeys.push(`minion: ${m}`);
  }
  for (const a of requiredAudio) {
    if (!manifest.audio[a]) report.missingKeys.push(`audio: ${a}`);
  }
  // Optional images
  if (!manifest.images['logo']) report.missingKeys.push('optional: logo');
  if (!manifest.images['player']) report.missingKeys.push('optional: player');
  if (!manifest.images['qr']) report.missingKeys.push('optional: qr');

  // 4. Write manifest
  const manifestContent = `// Auto-generated by scripts/sync-assets.mjs
export const ASSETS_MANIFEST = ${JSON.stringify(manifest, null, 2)};
`;
  fs.writeFileSync(MANIFEST_PATH, manifestContent, 'utf-8');

  // 5. Write assets.report.md
  let reportMd = `# Assets Synchronization Report
Generated at: ${new Date().toISOString()}

## Mapped Assets (${report.mapped.length})
| Source File | Logical Key | Kind | Category | Original | Trimmed | Output |
|---|---|---|---|---|---|---|
`;
  for (const m of report.mapped) {
    reportMd += `| \`${m.source}\` | \`${m.key}\` | ${m.kind} | ${m.category} | ${m.original} | ${m.trimmed} | ${m.final} |\n`;
  }

  reportMd += `\n## Unmatched Files (${report.unmatched.length})\n`;
  if (report.unmatched.length === 0) {
    reportMd += `*None. All files matched successfully.*\n`;
  } else {
    for (const u of report.unmatched) {
      reportMd += `- \`${u}\`\n`;
    }
  }

  reportMd += `\n## Missing Keys (${report.missingKeys.length})\n`;
  if (report.missingKeys.length === 0) {
    reportMd += `*None. All required keys found.*\n`;
  } else {
    for (const mk of report.missingKeys) {
      reportMd += `- \`${mk}\`\n`;
    }
  }

  reportMd += `\n## Assets Lacking Transparency (${report.noAlpha.length})\n`;
  if (report.noAlpha.length === 0) {
    reportMd += `*None. All sprite assets contain transparency.*\n`;
  } else {
    for (const na of report.noAlpha) {
      reportMd += `- \`${na}\`\n`;
    }
  }

  fs.writeFileSync(REPORT_PATH, reportMd, 'utf-8');
  console.log(`[sync-assets] Pipeline finished. Mapped ${report.mapped.length} assets.`);
  return { manifest, report };
}

// Execute if run directly
if (process.argv[1] && process.argv[1].endsWith('sync-assets.mjs')) {
  runSyncAssets();
}
