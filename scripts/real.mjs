// Exports the client's real photos and video for the "En cubierta" section.
import sharp from "sharp";
sharp.cache(false);
import fs from "fs";
import { execFileSync } from "child_process";
import ffmpeg from "ffmpeg-static";
const R = "../real materials";
const out = "public/real";
fs.mkdirSync(out, { recursive: true });
const photos = {
  r1: "WhatsApp Image 2026-07-06 at 10.10.51.jpeg",
  r2: "WhatsApp Image 2026-08-19 at 08.36.02.jpeg",
  r3: "_DSC0367.jpg",
  r4: "WhatsApp Image 2026-08-19 at 08.35.00.jpeg",
  r5: "WhatsApp Image 2026-08-19 at 08.56.55.jpeg",
};
for (const [k, f] of Object.entries(photos)) {
  await sharp(`${R}/${f}`).rotate().resize(1200, 1200, { fit: "inside" }).webp({ quality: 80 }).toFile(`${out}/${k}.webp`);
  console.log("ok", k);
}
const video = `${R}/WhatsApp Video 2026-08-27 at 08.47.04.mp4`;
fs.copyFileSync(video, `${out}/m1.mp4`);
execFileSync(ffmpeg, ["-y", "-ss", "1", "-i", video, "-frames:v", "1", "raw/m1-poster.jpg"], { stdio: "ignore" });
await sharp("raw/m1-poster.jpg").webp({ quality: 80 }).toFile(`${out}/m1-poster.webp`);
fs.rmSync("raw/m1-poster.jpg");
console.log("ok video");
