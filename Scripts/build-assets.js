/**
 * 🧱 Cosmic Dashboard Build Script (v6.8.4)
 * Minifies CSS/JS, optimizes images, embeds version info, and prepares for PWA injection.
 */

import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import CleanCSS from "clean-css";
import UglifyJS from "uglify-js";
import sharp from "sharp";
import chalk from "chalk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../");
const publicDir = path.join(rootDir, "public");
const versionFile = path.join(publicDir, "version.txt");
const packageFile = path.join(rootDir, "package.json");

console.log(chalk.cyanBright("🚀 Building Cosmic Dashboard v6.8.4 ..."));

// Step 1: Load version
const pkg = JSON.parse(fs.readFileSync(packageFile, "utf-8"));
const version = pkg.version || "6.8.4";
const versionLabel = pkg.cosmic?.versionLabel || `Cosmic Horizon ${version}`;

console.log(chalk.magentaBright(`📦 Version: ${versionLabel}`));

// Step 2: Ensure output structure
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

// Step 3: Minify CSS
const cssPath = path.join(publicDir, "style.css");
if (fs.existsSync(cssPath)) {
  const css = fs.readFileSync(cssPath, "utf-8");
  const output = new CleanCSS({ level: 2 }).minify(css);
  fs.writeFileSync(cssPath, output.styles);
  console.log(chalk.green("🎨 Minified style.css"));
} else {
  console.log(chalk.yellow("⚠️ style.css not found — skipping."));
}

// Step 4: Minify JS
const jsPath = path.join(publicDir, "script.js");
if (fs.existsSync(jsPath)) {
  const js = fs.readFileSync(jsPath, "utf-8");
  const output = UglifyJS.minify(js);
  if (output.error) {
    console.error(chalk.red("❌ JS Minification error:"), output.error);
  } else {
    fs.writeFileSync(jsPath, output.code);
    console.log(chalk.green("⚙️ Minified script.js"));
  }
} else {
  console.log(chalk.yellow("⚠️ script.js not found — skipping."));
}

// Step 5: Optimize images
const imageDir = path.join(publicDir, "assets");
if (fs.existsSync(imageDir)) {
  const imageFiles = fs.readdirSync(imageDir).filter(f =>
    /\.(png|jpg|jpeg|webp)$/i.test(f)
  );

  for (const file of imageFiles) {
    const filePath = path.join(imageDir, file);
    const outputPath = path.join(imageDir, file);
    await sharp(filePath)
      .webp({ quality: 80 })
      .toFile(outputPath)
      .catch(err => console.log(chalk.red(`🖼️ Error optimizing ${file}: ${err}`)));
  }

  console.log(chalk.green(`🖼️ Optimized ${imageFiles.length} images.`));
} else {
  console.log(chalk.yellow("⚠️ No /assets folder found — skipping image optimization."));
}

// Step 6: Embed version info
fs.writeFileSync(versionFile, `Cosmic Dashboard v${version}\n${versionLabel}`);
console.log(chalk.blueBright("📝 Embedded version info into version.txt"));

// Step 7: PWA build (optional)
try {
  console.log(chalk.gray("🔧 Injecting PWA manifest..."));
  execSync("npm run pwa:inject", { stdio: "inherit" });
  console.log(chalk.green("✅ PWA build complete."));
} catch {
  console.log(chalk.yellow("⚠️ PWA build skipped (workbox not found or optional)."));
}

// Step 8: Success summary
console.log(chalk.bold.greenBright(`
✅ Build Complete!
🌌 Cosmic Dashboard ${versionLabel}
📁 Output: /public
🕹️ Ready for deployment.
`));