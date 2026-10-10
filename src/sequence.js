// Image-sequence loader: fetches frames coarse-to-fine so a scrub is usable
// long before every frame has arrived, and answers "nearest loaded frame".
const queue = [];
let active = 0;
const MAX_CONCURRENT = 8;

function pump() {
  while (active < MAX_CONCURRENT && queue.length) {
    const job = queue.shift();
    active++;
    job().finally(() => {
      active--;
      pump();
    });
  }
}

export class Sequence {
  constructor(name, count) {
    this.name = name;
    this.count = count;
    this.frames = new Array(count).fill(null);
    this.loaded = 0;
    this.listeners = new Set();
    this.started = false;
  }

  url(i) {
    return `/frames/${this.name}/${String(i + 1).padStart(4, "0")}.webp`;
  }

  // Coarse-to-fine order: every 16th frame, then every 8th, 4th, 2nd, then the rest.
  order() {
    const seen = new Set();
    const out = [];
    for (const step of [16, 8, 4, 2, 1]) {
      for (let i = 0; i < this.count; i += step) {
        if (!seen.has(i)) {
          seen.add(i);
          out.push(i);
        }
      }
    }
    if (!seen.has(this.count - 1)) out.push(this.count - 1);
    return out;
  }

  load() {
    if (this.started) return this.done;
    this.started = true;
    const jobs = this.order().map((i) => () => this.fetchFrame(i));
    this.done = new Promise((resolve) => {
      this.resolve = resolve;
    });
    queue.push(...jobs);
    pump();
    return this.done;
  }

  fetchFrame(i) {
    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.src = this.url(i);
      const finish = () => {
        this.frames[i] = img;
        this.loaded++;
        this.listeners.forEach((fn) => fn(this));
        if (this.loaded === this.count) this.resolve?.();
        resolve();
      };
      img.decode().then(finish, () => {
        if (img.complete && img.naturalWidth) return finish();
        img.onload = finish;
        img.onerror = () => {
          this.loaded++;
          resolve();
        };
      });
    });
  }

  onProgress(fn) {
    this.listeners.add(fn);
  }

  nearest(i) {
    i = Math.max(0, Math.min(this.count - 1, Math.round(i)));
    if (this.frames[i]) return this.frames[i];
    for (let d = 1; d < this.count; d++) {
      if (this.frames[i - d]) return this.frames[i - d];
      if (this.frames[i + d]) return this.frames[i + d];
    }
    return null;
  }
}

// Draw an image "cover"-fitted into a canvas, then transformed by scale and offset
// (offsets are fractions of canvas width/height).
export function drawFrame(ctx, img, { scale = 1, x = 0, y = 0 } = {}) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, cw, ch);
  if (!img) return;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(cw / iw, ch / ih);
  const s = base * scale;
  const w = iw * s;
  const h = ih * s;
  ctx.drawImage(img, (cw - w) / 2 + x * cw, (ch - h) / 2 + y * ch, w, h);
}

export function fitCanvas(canvas, maxDpr = 2) {
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    return true;
  }
  return false;
}
