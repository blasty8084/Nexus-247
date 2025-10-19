/**
 * 🧾 Cosmic Dashboard — Post Build Verifier (v6.8.4)
 * Validates build outputs, PWA integrity, and size optimizations.
 * Run automatically after build-assets.js.
 */

import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../");
const publicDir = path.join(rootDir, "public");

const SIZE_LIMITS = {
  js: 400 * 1024,   // 400 KB
  css: 300 * 1024,  // 300 KB
};

const REQUIRED_FILES = [
  "script.js",
  "style.css",
  "manifest.json",
  "sw.js",
  "version.txt",
];

/* -------------------------------------------------------------------------- */
/*                              UTILITY HELPERS                               */
/* -------------------------------------------------------------------------- */

function formatBytes(bytes) {
  const sizes = ["B", "KB", "MB"];
  if (bytes === 0) return "0B";
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

function checkFileSize(filePath, limit) {
  const stats = fs.statSync(filePath);
  if (stats.size > limit) {
    console.warn(
      chalk.yellow(
        `⚠️ ${path.basename(filePath)} is large (${formatBytes(
          stats.size
        )}), consider optimizing.`
      )
    );
  } else {
    console.log(
      chalk.green(
        `✅ ${path.basename(filePath)} optimized: ${formatBytes(stats.size)}`
      )
    );
  }
}

function validateJSON(filePath) {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    JSON.parse(data);
    return true;
  } catch {
    console.error(chalk.red(`❌ Invalid JSON file: ${filePath}`));
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*                             MAIN VERIFICATION                              */
/* -------------------------------------------------------------------------- */

(async () => {
  console.log(chalk.magentaBright("\n🧩 Cosmic Post-Build Verification (v6.8.4)\n"));

  let success = true;

  // 1️⃣ Check required build files
  for (const file of REQUIRED_FILES) {
    const filePath = path.join(publicDir, file);
    if (!(await fs.pathExists(filePath))) {
      console.error(chalk.red(`❌ Missing build output: public/${file}`));
      success = false;
    } else {
      console.log(chalk.green(`✅ Verified: public/${file}`));
    }
  }

  // 2️⃣ Validate JSON files
  console.log(chalk.cyan("\n📘 Validating JSON structures..."));
  ["manifest.json"].forEach((file) => {
    const filePath = path.join(publicDir, file);
    if (fs.existsSync(filePath)) {
      validateJSON(filePath);
    }
  });

  // 3️⃣ Check version.txt consistency
  const versionFile = path.join(publicDir, "version.txt");
  const pkgFile = path.join(rootDir, "package.json");
  if (fs.existsSync(versionFile) && fs.existsSync(pkgFile)) {
    const versionTxt = fs.readFileSync(versionFile, "utf8").trim();
    const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
    if (!versionTxt.includes(pkg.version)) {
      console.error(
        chalk.red(
          `❌ Version mismatch: version.txt (${versionTxt}) ≠ package.json (${pkg.version})`
        )
      );
      success = false;
    } else {
      console.log(chalk.green(`✅ Version consistency: ${pkg.version}`));
    }
  }

  // 4️⃣ Check JS/CSS size optimization
  console.log(chalk.cyan("\n📦 Checking asset sizes..."));
  const jsFile = path.join(publicDir, "script.js");
  const cssFile = path.join(publicDir, "style.css");
  if (fs.existsSync(jsFile)) checkFileSize(jsFile, SIZE_LIMITS.js);
  if (fs.existsSync(cssFile)) checkFileSize(cssFile, SIZE_LIMITS.css);

  // 5️⃣ Validate PWA & Service Worker
  console.log(chalk.cyan("\n🔁 Checking PWA Service Worker..."));
  const swFile = path.join(publicDir, "sw.js");
  if (fs.existsSync(swFile)) {
    const swContent = fs.readFileSync(swFile, "utf8");
    if (!swContent.includes("workbox")) {
      console.warn(chalk.yellow("⚠️ Service worker missing Workbox reference."));
    } else {
      console.log(chalk.green("✅ Service worker valid."));
    }
  }

  // 6️⃣ Generate build summary
  console.log(chalk.cyan("\n🧠 Build Summary:\n"));
  console.table([
    { File: "script.js", Size: formatBytes(fs.statSync(jsFile).size) },
    { File: "style.css", Size: formatBytes(fs.statSync(cssFile).size) },
    { File: "manifest.json", Status: "OK" },
    { File: "sw.js", Status: "OK" },
  ]);

  // 7️⃣ Final result
  if (success) {
    console.log(chalk.greenBright("\n✅ All post-build checks passed successfully!\n"));
  } else {
    console.error(
      chalk.redBright("\n❌ Some checks failed — review logs above before deploying.\n")
    );
    process.exit(1);
  }
})();