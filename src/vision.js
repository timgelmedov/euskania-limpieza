// Visual-check lens over the soiled aerial plate (D): it reveals the clean plate (A) and
// compares the two pixels under its centre. Readings come from image pixels only.
import { t, onLang } from "./i18n.js";

const PLATES = { dirty: "/plates/D.webp", clean: "/plates/A.webp" };
const RAMP = ["#000010", "#2b0a6b", "#8a1a8f", "#d6334a", "#f47a1f", "#fcd34a", "#fffbe6"].map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
const LUT = Array.from({ length: 256 }, (_, i) => {
  const x = (i / 255) * (RAMP.length - 1);
  const k = Math.min(RAMP.length - 2, Math.floor(x));
  return RAMP[k].map((v, j) => v + (RAMP[k + 1][j] - v) * (x - k));
});
const ironbow = (r, g, b) => {
  let best = 0, bd = Infinity;
  for (let i = 0; i < 256; i++) {
    const d = (r - LUT[i][0]) ** 2 + (g - LUT[i][1]) ** 2 + (b - LUT[i][2]) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return best / 255;
};
const hex = (c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();

export function initVision() {
  const stage = document.getElementById("visionStage");
  const lens = document.getElementById("lens");
  const lensImg = document.getElementById("lensImg");
  const el = (id) => document.getElementById(id);
  const o = { mode: el("rdMode"), value: el("rdValue"), unit: el("rdUnit"), cls: el("rdClass"), x: el("rdX"), y: el("rdY"), swA: el("rdSwA"), hexA: el("rdHexA"), swB: el("rdSwB"), hexB: el("rdHexB"), bLabel: el("rdBLabel"), scale: el("rdScale"), mark: el("rdMark"), lo: el("rdLo"), hi: el("rdHi") };
  const data = {};
  let mode = "clean";
  let pos = { x: 0.5, y: 0.5 };
  let userMoved = false;
  let visible = false;

  const load = (key) => new Promise((res) => {
    const img = new Image();
    img.src = PLATES[key];
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const cx = c.getContext("2d", { willReadFrequently: true });
      cx.drawImage(img, 0, 0);
      data[key] = cx.getImageData(0, 0, c.width, c.height);
      res();
    };
  });

  function px(key) {
    const d = data[key];
    if (!d) return null;
    const cx = Math.round(pos.x * (d.width - 1));
    const cy = Math.round(pos.y * (d.height - 1));
    const s = [0, 0, 0];
    let n = 0;
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const x = Math.min(d.width - 1, Math.max(0, cx + dx));
        const y = Math.min(d.height - 1, Math.max(0, cy + dy));
        const i = (y * d.width + x) * 4;
        s[0] += d.data[i]; s[1] += d.data[i + 1]; s[2] += d.data[i + 2];
        n++;
      }
    return { cx, cy, c: s.map((v) => Math.round(v / n)) };
  }

  function render() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    const r = lens.offsetWidth / 2;
    const x = pos.x * w;
    const y = pos.y * h;
    lens.style.left = `${x}px`;
    lens.style.top = `${y}px`;
    Object.assign(lensImg.style, { width: `${w}px`, height: `${h}px`, backgroundSize: `${w}px ${h}px`, transform: `translate(${r - x}px, ${r - y}px)` });
    const a = px("dirty");
    const b = px(mode);
    if (!a || !b) return;
    o.x.textContent = String(a.cx).padStart(4, "0");
    o.y.textContent = String(a.cy).padStart(4, "0");
    o.swA.style.background = hex(a.c);
    o.hexA.textContent = hex(a.c);
    o.swB.style.background = hex(b.c);
    o.hexB.textContent = hex(b.c);
    let v, k;
    if (mode === "clean" && (b.c[2] - b.c[0]) / 255 < 0.12) {
      // The clean plate is not blue glass here: roof, walkway or vent, not a module.
      v = 0;
      o.value.textContent = "—";
      k = "roof";
    } else if (mode === "clean") {
      const dist = Math.sqrt(a.c.reduce((s, ch, i) => s + (ch - b.c[i]) ** 2, 0)) / 441.7;
      v = Math.min(1, dist * 2.4);
      o.value.textContent = Math.round(v * 100);
      k = v < 0.08 ? "c0" : v < 0.25 ? "c1" : v < 0.5 ? "c2" : "c3";
    } else {
      v = ironbow(...b.c);
      o.value.textContent = Math.round(12 + v * 63);
      k = v < 0.2 ? "t0" : v < 0.55 ? "t1" : v < 0.8 ? "t2" : "t3";
    }
    o.cls.textContent = t(`vision.${k}`);
    o.mark.style.left = `${v * 100}%`;
  }

  function setMode(m) {
    mode = m;
    stage.querySelectorAll("[data-mode]").forEach((btn) => btn.setAttribute("aria-selected", String(btn.dataset.mode === m)));
    lensImg.style.backgroundImage = `url(${PLATES[m]})`;
    const th = m === "thermal";
    o.mode.textContent = th ? "IR" : "RGB";
    o.unit.textContent = th ? t("vision.tempUnit") : `% ${t("vision.dirtUnit")}`;
    o.bLabel.textContent = th ? "IR" : t("vision.clean");
    o.lo.textContent = th ? "12 °C" : "0%";
    o.hi.textContent = th ? "75 °C" : "100%";
    o.scale.classList.toggle("thermal", th);
    render();
  }

  const move = (e) => {
    if (e.target.closest(".vision-modes")) return;
    userMoved = true;
    lens.classList.add("on");
    const rect = stage.getBoundingClientRect();
    pos = { x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)), y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)) };
    render();
  };
  stage.addEventListener("pointermove", move);
  stage.addEventListener("pointerdown", move);
  stage.querySelectorAll("[data-mode]").forEach((btn) => btn.addEventListener("click", () => setMode(btn.dataset.mode)));
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) lens.classList.add("on");
  }, { threshold: 0.3 }).observe(stage);
  const t0 = performance.now();
  (function idle(now) {
    if (!userMoved && visible) {
      const s = (now - t0) / 1000;
      pos = { x: 0.5 + Math.sin(s * 0.45) * 0.3, y: 0.5 + Math.sin(s * 0.77) * 0.28 };
      render();
    }
    requestAnimationFrame(idle);
  })(t0);
  window.addEventListener("resize", render);
  onLang(() => setMode(mode));
  Promise.all(["dirty", "clean"].map(load)).then(() => setMode(mode));
  setMode(mode);
}
