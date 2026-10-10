// Per-chapter choreography: film playhead, frame transform and overlay updates.
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ss = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const $ = (sel, root = document) => root.querySelector(sel);
const playhead = (p, a = 0.03, b = 0.95) => clamp((p - a) / (b - a));
const coverBase = () => Math.max(window.innerWidth / 1920, window.innerHeight / 1080);
const portraitFit = () => {
  const W = window.innerWidth;
  const H = window.innerHeight;
  return W >= H ? 1 : Math.min(1, ((W / 1920) * 1.4) / coverBase());
};
const es = (n, d = 0) => n.toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d });
const fade = (el, o, dy = 24) => {
  el.style.opacity = o;
  el.style.transform = `translateY(${(1 - o) * dy}px)`;
};

// HERO: slow-motion close-up film; the headline sits in the black above the glass.
function hero(root) {
  const title = $(".hero-title", root);
  const cue = $(".scroll-cue", root);
  return {
    film: (p) => playhead(p, 0.02, 0.96),
    transform: () => ({ scale: 1.04, x: 0, y: window.innerWidth >= window.innerHeight ? 0.12 : 0.06 }),
    update(p) {
      const out = ss(0.12, 0.3, p);
      title.style.opacity = 1 - out;
      title.style.transform = `translateY(${-out * 5}vh)`;
      cue.style.opacity = 1 - ss(0.01, 0.05, p);
    },
  };
}

function salida(root) {
  const head = $(".chapter-head", root);
  const time = $("#slTime", root);
  const dist = $("#slDist", root);
  return {
    film: (p) => playhead(p),
    update(p) {
      const f = playhead(p);
      head.style.opacity = 1 - ss(0.4, 0.52, p);
      const s = Math.round(f * 500);
      time.textContent = `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
      dist.textContent = es(149.6 * f, 1);
    },
  };
}

function descenso(root) {
  const head = $(".chapter-head", root);
  const lat = $("#dcLat", root);
  const lng = $("#dcLng", root);
  const alt = $("#dcAlt", root);
  return {
    film: (p) => playhead(p),
    update(p) {
      const f = playhead(p);
      head.style.opacity = 1 - ss(0.4, 0.52, p);
      const e = ss(0, 1, f);
      lat.textContent = `${lerp(45.2, 43.3898, e).toFixed(4)}° N`;
      lng.textContent = `${lerp(4.1, 2.9854, e).toFixed(4)}° W`;
      const km = 400 * Math.pow(0.0003, f);
      alt.textContent = km >= 1 ? `${es(km, km < 10 ? 1 : 0)} km` : `${Math.round(km * 1000)} m`;
    },
  };
}

function choque(root) {
  const head = $(".chapter-head", root);
  const items = [...root.querySelectorAll(".soil-list li")];
  const num = $("#chScatter", root);
  return {
    film: (p) => playhead(p),
    transform: () => ({ scale: portraitFit(), x: 0, y: window.innerWidth < window.innerHeight ? -0.17 : 0 }),
    update(p) {
      head.style.opacity = 1 - ss(0.12, 0.2, p);
      items.forEach((li) => li.classList.toggle("in", p > parseFloat(li.dataset.at)));
      num.textContent = es(Math.round(Math.pow(10, 9 * ss(0.08, 0.92, p))) - 1);
    },
  };
}

function limpieza(root) {
  const head = $(".chapter-head", root);
  const cards = [...root.querySelectorAll(".glass")];
  const bar = $("#lpBar", root);
  const pct = $("#lpPct", root);
  return {
    film: (p) => playhead(p),
    update(p) {
      const f = playhead(p);
      head.style.opacity = 1 - ss(0.12, 0.2, p);
      cards.forEach((c) => {
        const at = parseFloat(c.dataset.at);
        fade(c, ss(at - 0.06, at, p) * (1 - ss(at + 0.14, at + 0.2, p)));
      });
      const v = Math.round(ss(0.03, 0.62, f) * 100);
      bar.style.width = `${v}%`;
      pct.textContent = `${v}%`;
    },
  };
}

function entrada(root) {
  const head = $(".chapter-head", root);
  const items = [...root.querySelectorAll(".layers li")];
  return {
    film: (p) => playhead(p),
    transform: () => ({ scale: portraitFit(), x: 0, y: window.innerWidth < window.innerHeight ? -0.17 : 0 }),
    update(p) {
      head.style.opacity = 1 - ss(0.34, 0.44, p);
      items.forEach((li, i) => li.classList.toggle("in", p > 0.5 + i * 0.06));
    },
  };
}

function flujo(root) {
  const head = $(".chapter-head", root);
  const clock = $("#flClock", root);
  return {
    film: (p) => playhead(p),
    update(p) {
      const f = playhead(p);
      head.style.opacity = 1 - ss(0.5, 0.62, p);
      const mins = Math.round(lerp(12 * 60, 21 * 60 + 30, f));
      clock.textContent = `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
    },
  };
}

export const CHAPTERS = { hero, salida, descenso, choque, limpieza, entrada, flujo };
