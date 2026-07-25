import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");

const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#E8F7A0"/>
      <stop offset="55%" stop-color="#B8E000"/>
      <stop offset="100%" stop-color="#7BC41A"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="#143D32"/>
  <circle cx="256" cy="256" r="148" fill="url(#g)"/>
  <path d="M160 200c40 55 90 95 152 118" fill="none" stroke="#143D32" stroke-width="14" stroke-linecap="round" opacity="0.35"/>
  <path d="M300 150c28 48 48 100 52 158" fill="none" stroke="#143D32" stroke-width="14" stroke-linecap="round" opacity="0.35"/>
  <text x="256" y="288" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="120" font-weight="800" fill="#143D32">r</text>
</svg>`;

async function main() {
  await mkdir(outDir, { recursive: true });
  for (const size of [180, 192, 512]) {
    const png = await sharp(Buffer.from(svg(size))).png().toBuffer();
    await writeFile(path.join(outDir, `icon-${size}.png`), png);
  }
  // maskable: more padding
  const maskable = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#143D32"/>
  <circle cx="256" cy="256" r="120" fill="#B8E000"/>
  <text x="256" y="282" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="100" font-weight="800" fill="#143D32">r</text>
</svg>`;
  await writeFile(
    path.join(outDir, "maskable-512.png"),
    await sharp(Buffer.from(maskable)).png().toBuffer(),
  );
  console.log("icons written to public/icons");
}

main();
