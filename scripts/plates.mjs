// Exports the still plates the page uses directly (visual-check lens: soiled vs clean roof).
import sharp from "sharp";
import fs from "fs";
fs.mkdirSync("public/plates", { recursive: true });
for (const [src, w] of [["A", 1920], ["D", 1920]]) {
  await sharp(`raw/stills/${src}.png`).resize(w).webp({ quality: 82 }).toFile(`public/plates/${src}.webp`);
  console.log("ok", src);
}
