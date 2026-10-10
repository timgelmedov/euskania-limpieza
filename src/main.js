import Lenis from "lenis";
import { Sequence, drawFrame, fitCanvas } from "./sequence.js";
import { CHAPTERS, clamp } from "./chapters.js";
import { initLang } from "./i18n.js";
import { initVision } from "./vision.js";
import { initForm } from "./form.js";

const FILMS = ["hero", "salida", "descenso", "choque", "limpieza", "entrada", "flujo"];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const lenis = new Lenis({ lerp: reduceMotion ? 1 : 0.09, smoothWheel: !reduceMotion, wheelMultiplier: 0.9 });
window.__lenis = lenis;
document.querySelectorAll('a[href^="#"]').forEach((a) =>
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    const target = id === "#top" ? 0 : document.querySelector(id);
    if (target === null) return;
    e.preventDefault();
    lenis.scrollTo(target, { duration: reduceMotion ? 0 : 1.6 });
  }),
);

const sequences = {};
const chapters = [];

async function setup() {
  const metas = await Promise.all(FILMS.map((f) => fetch(`/frames/${f}/meta.json`).then((r) => r.json())));
  FILMS.forEach((f, i) => (sequences[f] = new Sequence(f, metas[i].count)));

  for (const el of document.querySelectorAll(".chapter")) {
    const name = el.id;
    const canvas = el.querySelector("canvas.film");
    const ch = { el, canvas, ctx: canvas.getContext("2d", { alpha: false }), logic: CHAPTERS[name](el), seq: sequences[el.dataset.film], p: -1, key: "", active: false };
    ch.seq.onProgress(() => (ch.key = ""));
    chapters.push(ch);
  }

  const bar = document.querySelector(".loadbar");
  const fill = bar.querySelector("i");
  const total = FILMS.reduce((n, f) => n + sequences[f].count, 0);
  const tick = () => {
    const loaded = FILMS.reduce((n, f) => n + sequences[f].loaded, 0);
    fill.style.width = `${(loaded / total) * 100}%`;
    if (loaded >= total) bar.classList.add("done");
  };
  FILMS.forEach((f) => sequences[f].onProgress(tick));
  (async () => {
    for (const f of FILMS) await sequences[f].load();
  })();
  requestAnimationFrame(frame);
}

function render(ch) {
  const vh = window.innerHeight;
  const rect = ch.el.getBoundingClientRect();
  // Jumping ahead (nav link, fast scroll): start this film now instead of waiting its turn.
  if (ch.seq && !ch.seq.started && rect.top < vh * 2 && rect.bottom > -vh) ch.seq.load();
  if (!(rect.top < vh && rect.bottom > 0)) {
    if (ch.active) ch.logic.leave?.();
    ch.active = false;
    return;
  }
  ch.active = true;
  const p = clamp(-rect.top / Math.max(1, rect.height - vh));
  const resized = fitCanvas(ch.canvas);
  if (p !== ch.p) ch.logic.update(p, true);
  ch.p = p;
  const tf = ch.logic.transform ? ch.logic.transform(p) : { scale: 1, x: 0, y: 0 };
  const idx = Math.round(ch.logic.film(p) * (ch.seq.count - 1));
  const key = `${idx}|${tf.scale.toFixed(4)}|${tf.x.toFixed(4)}|${tf.y.toFixed(4)}`;
  if (resized || key !== ch.key) {
    drawFrame(ch.ctx, ch.seq.nearest(idx), tf);
    ch.key = key;
  }
}

function frame(t) {
  lenis.raf(t);
  for (const ch of chapters) render(ch);
  requestAnimationFrame(frame);
}
window.addEventListener("resize", () => chapters.forEach((c) => (c.key = "")));

const links = [...document.querySelectorAll(".nav-links a")];
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${e.target.id}`))),
  { rootMargin: "-45% 0px -50% 0px" },
);
document.querySelectorAll("main > section[id]").forEach((s) => io.observe(s));

initLang();
initVision();
initForm();
setup();

// Debug hook for automated checks: render every chapter synchronously.
window.__euskania = { renderNow: () => chapters.forEach(render), sequences };
