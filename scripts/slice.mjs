// Usage: node scripts/slice.mjs <name> [--loop]
// Reads raw/films/<name>.mp4, trims the frames Kling holds at the start (and at the
// end with --loop), then writes ~200 evenly spaced 1920px WebP frames to public/frames/<name>/.
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';

const name = process.argv[2];
const loop = process.argv.includes('--loop');
const TARGET = 200;
const src = `raw/films/${name}.mp4`;
const tmp = `raw/tmp/${name}-${Date.now()}`;
const out = `public/frames/${name}`;

function run(args, { capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpeg, args, { stdio: ['ignore', capture ? 'pipe' : 'ignore', 'pipe'] });
    const chunks = [];
    let err = '';
    if (capture) p.stdout.on('data', (d) => chunks.push(d));
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => (code === 0 ? resolve({ buf: Buffer.concat(chunks), err }) : reject(new Error(err.slice(-2000)))));
  });
}

// 1. Motion analysis on a tiny greyscale proxy.
const W = 128, H = 72, FS = W * H;
const { buf, err } = await run(['-i', src, '-vf', `scale=${W}:${H},format=gray`, '-f', 'rawvideo', '-'], { capture: true });
const n = Math.floor(buf.length / FS);
const fps = parseFloat((err.match(/(\d+(?:\.\d+)?) fps/) || [])[1] || '24');
const diffs = [0];
for (let i = 1; i < n; i++) {
  let s = 0;
  for (let j = 0; j < FS; j++) s += Math.abs(buf[i * FS + j] - buf[(i - 1) * FS + j]);
  diffs.push(s / FS);
}
const sorted = [...diffs.slice(1)].sort((a, b) => a - b);
const median = sorted[Math.floor(sorted.length / 2)];
const thr = Math.max(0.12, median * 0.25);
let start = 1;
while (start < n - 1 && diffs[start] < thr) start++;
start = Math.max(0, start - 1);
let end = n - 1;
if (loop) while (end > start + 1 && diffs[end] < thr) end--;
// A near-static film looks "held" everywhere; never trim away more than a third of it.
if (end - start < n * 0.66) {
  start = 0;
  end = n - 1;
}
console.log(`${name}: ${n} frames @ ${fps}fps, median diff ${median.toFixed(3)}, thr ${thr.toFixed(3)} -> keep ${start}..${end}`);
console.log('first diffs', diffs.slice(0, 16).map((d) => d.toFixed(2)).join(' '));
console.log('last diffs', diffs.slice(-8).map((d) => d.toFixed(2)).join(' '));

// 2. Full-res extraction of the kept range, blacks crushed so the void matches the page.
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });
const crush = ['descenso', 'limpieza', 'flujo'].includes(name) ? 'null' : 'colorlevels=rimin=0.035:gimin=0.035:bimin=0.035';
await run([
  '-i', src,
  '-vf', `select='between(n\,${start}\,${end})',scale=1920:-2:flags=lanczos,${crush}`,
  '-vsync', '0', '-q:v', '2', path.join(tmp, '%04d.jpg'),
]);
const files = fs.readdirSync(tmp).filter((f) => f.endsWith('.jpg')).sort();

// 3. Resample to ~TARGET frames and encode WebP.
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const count = Math.min(TARGET, files.length);
let bytes = 0;
for (let i = 0; i < count; i++) {
  const k = Math.round((i * (files.length - 1)) / Math.max(1, count - 1));
  const dst = path.join(out, String(i + 1).padStart(4, '0') + '.webp');
  await sharp(path.join(tmp, files[k])).webp({ quality: 74 }).toFile(dst);
  bytes += fs.statSync(dst).size;
}
fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify({ count, fps, trimmedStart: start, sourceFrames: n }));
console.log(`${name}: wrote ${count} frames from ${files.length}, ${(bytes / 1e6).toFixed(1)} MB`);
