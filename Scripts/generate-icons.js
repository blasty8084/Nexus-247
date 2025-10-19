/**

🪐 Cosmic Dashboard – Advanced Icon Generator (v6.8.5)

Generates PWA icons (standard, maskable, monochrome, favicon)

from a single source image. Updates manifest.json automatically.
*/


import sharp from "sharp";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../");
const publicDir = path.join(rootDir, "public");
const iconDir = path.join(publicDir, "icons");
const manifestPath = path.join(publicDir, "manifest.json");

const baseIcon = path.join(iconDir, "cosmic-logo-base.png");
const sizes = [16, 32, 48, 64, 128, 192, 256, 384, 512];

async function generateIcons() {
console.log(chalk.cyan("\n🧩 Generating Cosmic Dashboard icons..."));

if (!fs.existsSync(baseIcon)) {
console.log(chalk.red(❌ Missing base icon: ${baseIcon}));
console.log("💡 Please place 'cosmic-logo-base.png' in /public/icons/");
return;
}

fs.ensureDirSync(iconDir);

// Standard PNGs
for (const size of sizes) {
const outputPath = path.join(iconDir, cosmic-logo-${size}.png);
await sharp(baseIcon)
.resize(size, size)
.png({ quality: 95 })
.toFile(outputPath);
console.log(chalk.green(✅ ${size}x${size} icon created));
}

// Favicon
const faviconPath = path.join(iconDir, "favicon.ico");
await sharp(baseIcon).resize(64, 64).toFile(path.join(iconDir, "tmp-fav.png"));
await sharp(path.join(iconDir, "tmp-fav.png")).resize(32, 32).toFile(faviconPath);
fs.removeSync(path.join(iconDir, "tmp-fav.png"));
console.log(chalk.green("✅ Favicon generated"));

// Maskable (Adaptive)
const maskableSizes = [192, 512];
for (const size of maskableSizes) {
const maskablePath = path.join(iconDir, cosmic-logo-maskable-${size}.png);
await sharp(baseIcon)
.resize(size, size)
.extend({
top: Math.round(size * 0.1),
bottom: Math.round(size * 0.1),
left: Math.round(size * 0.1),
right: Math.round(size * 0.1),
background: "#071126",
})
.png({ quality: 100 })
.toFile(maskablePath);
console.log(chalk.green(🌀 Maskable ${size}x${size} icon created));
}

// Monochrome (Android 13+)
for (const size of maskableSizes) {
const monoPath = path.join(iconDir, cosmic-logo-mono-${size}.png);
await sharp(baseIcon)
.resize(size, size)
.grayscale()
.threshold(180)
.png()
.toFile(monoPath);
console.log(chalk.green(⚫ Monochrome ${size}x${size} icon created));
}

// Update manifest.json
const manifest = {
name: "Cosmic Dashboard",
short_name: "Cosmic",
start_url: "/",
display: "standalone",
background_color: "#071126",
theme_color: "#071126",
description: "Cosmic Dashboard — Minecraft Bot control + realtime telemetry",
icons: [
...sizes
.filter((s) => s >= 192)
.map((s) => ({
src: icons/cosmic-logo-${s}.png,
sizes: ${s}x${s},
type: "image/png",
purpose: "any",
})),
...maskableSizes.map((s) => ({
src: icons/cosmic-logo-maskable-${s}.png,
sizes: ${s}x${s},
type: "image/png",
purpose: "maskable",
})),
...maskableSizes.map((s) => ({
src: icons/cosmic-logo-mono-${s}.png,
sizes: ${s}x${s},
type: "image/png",
purpose: "monochrome",
})),
],
};

await fs.writeJSON(manifestPath, manifest, { spaces: 2 });
console.log(chalk.yellow("🔄 manifest.json updated successfully"));

console.log(chalk.green("\n✨ All icons generated and manifest updated!\n"));
}

generateIcons().catch((err) => console.error(chalk.red("❌ Icon generation failed:"), err));

