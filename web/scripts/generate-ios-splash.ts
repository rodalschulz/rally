/**
 * Generates black + centered rally icon splash PNGs for iOS PWA launch.
 * Run: npx tsx scripts/generate-ios-splash.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { IOS_SPLASHES } from "../src/lib/pwa/ios-splash";

const ROOT = path.join(__dirname, "..");
const ICON = path.join(ROOT, "public/icons/icon-512.png");
const OUT_DIR = path.join(ROOT, "public/splash");
const BG = { r: 0, g: 0, b: 0, alpha: 1 };

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const iconBuf = await sharp(ICON).png().toBuffer();

  for (const s of IOS_SPLASHES) {
    const iconSize = Math.round(Math.min(s.width, s.height) * 0.22);
    const logo = await sharp(iconBuf)
      .resize(iconSize, iconSize, { fit: "contain", background: BG })
      .png()
      .toBuffer();

    const left = Math.round((s.width - iconSize) / 2);
    const top = Math.round((s.height - iconSize) / 2);

    const out = await sharp({
      create: {
        width: s.width,
        height: s.height,
        channels: 4,
        background: BG,
      },
    })
      .composite([{ input: logo, left, top }])
      .png()
      .toBuffer();

    const dest = path.join(OUT_DIR, s.file);
    await writeFile(dest, out);
    console.log(`wrote ${s.file} (${s.width}×${s.height})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
