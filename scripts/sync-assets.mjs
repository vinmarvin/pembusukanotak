// scripts/sync-assets.mjs
// Asset pipeline: scans visual/ and audio/, classifies, trims transparent margins,
// downscales, converts/copies, produces manifest and assets.report.md.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PNG } from 'pngjs';
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';
import { classifyAsset, classifyEasterEgg } from '../src/core/assets/classify.js';
import { ASSETS_MAP_OVERRIDES } from '../src/config/assets.map.js';
import { COMPRESS } from '../src/config/compress.config.js';

const execFileAsync = promisify(execFile);

const ROOT_DIR = process.cwd();
const VISUAL_DIR = path.join(ROOT_DIR, 'visual');
const AUDIO_DIR = path.join(ROOT_DIR, 'audio');
const EGG_DIR = path.join(ROOT_DIR, 'easteregg');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public/assets');
const IMAGES_OUT = path.join(PUBLIC_DIR, 'images');
const AUDIO_OUT = path.join(PUBLIC_DIR, 'audio');
const EGG_OUT = path.join(PUBLIC_DIR, 'easteregg');

const FAVICON_PATH = path.join(ROOT_DIR, 'public/favicon.png');
// Remembers which source + settings produced each encoded audio/video file, so builds skip ffmpeg
// when nothing changed. Lives outside public/ so it never ships with the game.
const CACHE_PATH = path.join(ROOT_DIR, 'scripts/asset-cache.json');
// Hand-placed files in the output folders that the pipeline must never delete.
const PROTECTED_OUTPUTS = new Set(['qr.jpg']);

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
  qr: 512,
  effect: 256
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

// ── Compression helpers ─────────────────────────────────────────────────
function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function cacheSignature(srcFile, opts) {
  return `${computeFileHash(srcFile)}|v${COMPRESS.version}|${JSON.stringify(opts)}`;
}

// Runs `produce` only when the output is missing or its source/settings changed.
async function withCache(cache, outPath, srcFile, opts, produce) {
  const rel = path.relative(ROOT_DIR, outPath).replace(/\\/g, '/');
  const sig = cacheSignature(srcFile, opts);
  if (cache[rel] === sig && fs.existsSync(outPath)) return;
  await produce();
  cache[rel] = sig;
}

// Deletes old outputs with the same name but another extension (e.g. b5.png after b5.webp).
function removeStaleSiblings(outPath) {
  const dir = path.dirname(outPath);
  const { name, base } = path.parse(outPath);
  for (const f of fs.readdirSync(dir)) {
    if (f === base || PROTECTED_OUTPUTS.has(f)) continue;
    if (path.parse(f).name === name) fs.unlinkSync(path.join(dir, f));
  }
}

async function runFfmpeg(args) {
  await execFileAsync(ffmpegPath, ['-y', '-v', 'error', ...args]);
}

// Moves tmp to out, unless the source is the same format and already smaller (then copies source).
function keepSmaller(srcFile, tmpPath, outPath) {
  const sameExt = path.extname(srcFile).toLowerCase() === path.extname(outPath).toLowerCase();
  if (sameExt && fs.statSync(srcFile).size <= fs.statSync(tmpPath).size) {
    fs.copyFileSync(srcFile, outPath);
    fs.unlinkSync(tmpPath);
  } else {
    fs.renameSync(tmpPath, outPath);
  }
}

async function encodeMp3(srcFile, outPath, opts) {
  const tmp = `${outPath}.tmp.mp3`;
  await runFfmpeg([
    '-i', srcFile, '-vn', '-map_metadata', '-1',
    '-ac', String(opts.channels), '-ar', String(opts.sampleRate),
    '-codec:a', 'libmp3lame', '-b:a', opts.bitrate, tmp
  ]);
  keepSmaller(srcFile, tmp, outPath);
}

async function encodeMp4(srcFile, outPath, opts) {
  const tmp = `${outPath}.tmp.mp4`;
  await runFfmpeg([
    '-i', srcFile, '-map_metadata', '-1',
    '-vf', `scale='min(${opts.maxWidth},iw)':-2`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(opts.crf), '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', opts.audioBitrate, '-movflags', '+faststart', tmp
  ]);
  keepSmaller(srcFile, tmp, outPath);
}

function toWebp(input) {
  const { quality, alphaQuality, effort } = COMPRESS.image;
  return input.webp({ quality, alphaQuality, effort });
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

export async function runSyncAssets() {
  console.log('[sync-assets] Starting asset pipeline...');
  ensureDir(PUBLIC_DIR);
  ensureDir(IMAGES_OUT);
  ensureDir(AUDIO_OUT);
  const cache = loadCache();

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
      const outFileName = `${key}.webp`;
      const outPath = path.join(IMAGES_OUT, outFileName);

      if (isPng) {
        processed = trimAndScalePng(srcBuf, maxDim);
        await toWebp(sharp(processed.buffer)).toFile(outPath);
      } else {
        // jpg/webp: scale down to the category bound, then encode as WebP
        const meta = await sharp(srcBuf).metadata();
        const info = await toWebp(
          sharp(srcBuf).resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
        ).toFile(outPath);
        processed = {
          originalSize: { width: meta.width, height: meta.height },
          trimmedSize: { width: meta.width, height: meta.height },
          finalSize: { width: info.width, height: info.height },
          hasAlpha: true
        };
      }
      removeStaleSiblings(outPath);

      // Small browser-tab icon from the logo (the full logo was 290 KB as a favicon)
      if (key === 'logo') {
        const s = COMPRESS.favicon.size;
        await sharp(srcBuf)
          .resize(s, s, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png({ palette: true, compressionLevel: 9 })
          .toFile(FAVICON_PATH);
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
    const safeKey = key.replace(/\./g, '_');
    const outFileName = `${safeKey}.mp3`;
    const outPath = path.join(AUDIO_OUT, outFileName);

    try {
      const opts = category === 'bgm' ? COMPRESS.bgm : COMPRESS.sfx;
      await withCache(cache, outPath, aFile, opts, () => encodeMp3(aFile, outPath, opts));
      removeStaleSiblings(outPath);
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

  // 2b. Easter egg media (easteregg/, copied as-is; originals never touched)
  manifest.easterEggs = {};
  const eggFiles = scanFiles(EGG_DIR);
  if (eggFiles.length) ensureDir(EGG_OUT);
  for (const eFile of eggFiles) {
    const classification = classifyEasterEgg(eFile);
    if (!classification) {
      report.unmatched.push(path.relative(ROOT_DIR, eFile));
      continue;
    }
    const { key, kind, category } = classification;
    const ext = { image: '.webp', audio: '.mp3', video: '.mp4' }[kind];
    const outFileName = `${key.replace(/\./g, '_')}${ext}`;
    const outPath = path.join(EGG_OUT, outFileName);
    try {
      if (kind === 'image') {
        const m = COMPRESS.eggImageMax;
        await toWebp(
          sharp(eFile).resize(m, m, { fit: 'inside', withoutEnlargement: true })
        ).toFile(outPath);
      } else if (kind === 'audio') {
        await withCache(cache, outPath, eFile, COMPRESS.sfx, () => encodeMp3(eFile, outPath, COMPRESS.sfx));
      } else {
        await withCache(cache, outPath, eFile, COMPRESS.video, () => encodeMp4(eFile, outPath, COMPRESS.video));
      }
      removeStaleSiblings(outPath);
      const relPublicPath = `assets/easteregg/${outFileName}`;
      manifest.easterEggs[key] = { key, kind, path: relPublicPath };
      report.mapped.push({
        source: path.relative(ROOT_DIR, eFile),
        key,
        kind,
        category,
        original: `${fs.statSync(eFile).size} bytes`,
        trimmed: 'N/A',
        final: relPublicPath
      });
    } catch (err) {
      console.warn(`[sync-assets] Failed to copy easter egg ${eFile}:`, err);
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
  for (const fx of ['fx.shuffle', 'fx.remove10', 'fx.freeze']) {
    if (!manifest.images[fx]) report.missingKeys.push(`optional: ${fx} (emoji icon used)`);
  }

  // 4. Write manifest
  const manifestContent = `// Auto-generated by scripts/sync-assets.mjs
export const ASSETS_MANIFEST = ${JSON.stringify(manifest, null, 2)};
`;
  fs.writeFileSync(MANIFEST_PATH, manifestContent, 'utf-8');
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf-8');

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
  runSyncAssets().catch((err) => {
    console.error('[sync-assets] Failed:', err);
    process.exit(1);
  });
}
