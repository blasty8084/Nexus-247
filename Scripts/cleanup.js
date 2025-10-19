/**
 * 🧹 Cosmic Dashboard Cleanup Script (v6.8.4)
 * Safely removes old build assets, temporary cache, and stale logs.
 * Keeps essential configs, icons, and public assets intact.
 */

import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../");
const publicDir = path.join(rootDir, "public");
const logsDir = path.join(rootDir, "logs");
const iconsDir = path.join(publicDir, "icons");
const tempDirs = [path.join(rootDir, ".cache"), path.join(rootDir, "temp")];

/* -------------------------------------------------------------------------- */
/*                           SAFE DELETE HELPER                               */
/* -------------------------------------------------------------------------- */
async function safeRemove(target, label) {
  try {
    if (await fs.pathExists(target)) {
      await fs.remove(target);
      console.log(chalk.green(`🧹 Removed: ${label}`));
    }
  } catch (err) {
    console.error(chalk.red(`❌ Failed to remove ${label}:`), err.message);
  }
}

/* -------------------------------------------------------------------------- */
/*                         CLEANUP OPERATIONS                                 */
/* -------------------------------------------------------------------------- */
async function cleanPublicFolder() {
  console.log(chalk.cyanBright("\n🧭 Cleaning public directory..."));

  const items = await fs.readdir(publicDir);
  for (const item of items) {
    const fullPath = path.join(publicDir, item);
    if (
      item.startsWith("favicon") ||
      item === "manifest.json" ||
      item === "sw.js" ||
      item === "workbox-config.js" ||
      item === "index.html" ||
      item === "style.css" ||
      item === "script.js" ||
      item === "assets" ||
      item === "icons"
    ) {
      continue; // Skip essential files
    }
    await safeRemove(fullPath, `public/${item}`);
  }

  console.log(chalk.green("✅ Public folder cleaned successfully.\n"));
}

async function cleanOldIcons() {
  if (await fs.pathExists(iconsDir)) {
    const files = await fs.readdir(iconsDir);
    const deleted = [];
    for (const file of files) {
      if (/icon-\d+x\d+\.png/.test(file)) {
        await fs.remove(path.join(iconsDir, file));
        deleted.push(file);
      }
    }
    if (deleted.length) {
      console.log(chalk.yellow(`🗑️ Removed ${deleted.length} old icons.`));
    }
  }
}

async function cleanLogs() {
  if (!(await fs.pathExists(logsDir))) return;

  const files = await fs.readdir(logsDir);
  const logFiles = files.filter(f => f.endsWith(".log"));
  if (logFiles.length > 0) {
    console.log(chalk.cyan("🪶 Cleaning log files..."));
    for (const log of logFiles) {
      await safeRemove(path.join(logsDir, log), `log: ${log}`);
    }
  }
}

async function cleanTempFolders() {
  for (const dir of tempDirs) {
    await safeRemove(dir, path.basename(dir));
  }
}

/* -------------------------------------------------------------------------- */
/*                               MAIN EXECUTION                               */
/* -------------------------------------------------------------------------- */
(async () => {
  console.log(chalk.magentaBright("\n🌌 Cosmic Cleanup Utility v6.8.4 Starting...\n"));

  await cleanPublicFolder();
  await cleanOldIcons();
  await cleanLogs();
  await cleanTempFolders();

  console.log(chalk.bold.greenBright("\n✅ Cleanup complete — System is ready for next build!\n"));
})();