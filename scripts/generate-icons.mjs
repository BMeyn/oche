#!/usr/bin/env node
// scripts/generate-icons.mjs
//
// Renders the OCHE PWA icon set from the brand logomark.
// The mark is the electric-green square + ink-colored bullseye dot used in
// components/ui/primitives.tsx — pure shapes, no fonts, crisp at every size.
//
// Re-run after brand changes:  npm run gen:icons
// Outputs are committed to git so this does not run on every build.

import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "icons");

const INK = "#0a0e0c";
const ELECTRIC = "#d4ff3a";

// `markScale` is the side length of the electric square as a fraction of the
// canvas. `dotScale` is the side length of the ink bullseye dot as a fraction
// of the canvas. Maskable uses a smaller markScale so the entire logomark
// stays inside the W3C ~80% safe zone (well over the ≥10% padding requirement).
function svg(size, { markScale, dotScale }) {
  const markSide = Math.round(size * markScale);
  const markXY = Math.round((size - markSide) / 2);
  const dotSide = Math.round(size * dotScale);
  const dotXY = Math.round((size - dotSide) / 2);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="${INK}"/>
      <rect x="${markXY}" y="${markXY}" width="${markSide}" height="${markSide}" fill="${ELECTRIC}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${dotSide / 2}" fill="${INK}"/>
    </svg>`,
  );
}

const STANDARD = { markScale: 0.62, dotScale: 0.12 };
const MASKABLE = { markScale: 0.5, dotScale: 0.1 };

const targets = [
  { name: "icon-192.png", size: 192, opts: STANDARD },
  { name: "icon-512.png", size: 512, opts: STANDARD },
  { name: "icon-512-maskable.png", size: 512, opts: MASKABLE },
  { name: "apple-touch-icon-180.png", size: 180, opts: STANDARD },
];

await mkdir(outDir, { recursive: true });

for (const { name, size, opts } of targets) {
  const png = await sharp(svg(size, opts)).png().toBuffer();
  await writeFile(join(outDir, name), png);
  console.log(`  wrote ${name}  (${size}x${size})`);
}

console.log(`\nDone. ${targets.length} icons written to public/icons/`);
