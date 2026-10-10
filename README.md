# Euskania Limpieza — «Cada fotón cuenta»

Cinematic scroll landing page for Euskania's robotic solar-panel cleaning service (SolarCleano M1), Bizkaia.
Spanish only for now (`src/i18n-eu.js` is kept for when Basque is switched back on).

## Run

```bash
npm install
npm run dev
```

## How it works

- Scroll-scrubbed films: each chapter is a pinned `<canvas>` that draws ~200 WebP frames from `public/frames/<film>/` (`src/sequence.js`, `src/chapters.js`, `src/main.js`), with Lenis smooth scrolling.
- Frames are produced from the generated MP4s by `scripts/slice.mjs <film>`: it trims frames the model holds at the start, scales to 1920 px and writes WebP. Source films and stills live in `raw/` (git-ignored).
- `scripts/real.mjs` exports the client's real photos and video into `public/real/`.
- The audit/valuation form validates locally and sends nothing — there is no backend yet.

## Content notes

- Animated scenes are AI-generated (Magnific: GPT Image 2.5 stills, Kling 3.0 films) and illustrative; the «En cubierta» section uses real photos and video.
- Project figures (Artea, Eroski Gorliz, Camping Sopelana) come from HelioScope design simulations, not measured before/after data.
