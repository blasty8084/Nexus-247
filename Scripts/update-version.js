/**
 * 🛰️ Cosmic Dashboard – Auto Version Updater (v6.8.5)
 * Automatically updates /public/version.txt during build.
 */

import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import chalk from "chalk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../");
const publicDir = path.join(rootDir, "public");
const versionFile = path.join(publicDir, "version.txt");
const packagePath = path.join(rootDir, "package.json");

(async () => {
  try {
    console.log(chalk.cyan("\n🔄 Updating version.txt..."));

    const pkg = await fs.readJSON(packagePath);
    const version = pkg.version || "unknown";
    const label = pkg.cosmic?.versionLabel || "";
    const date = new Date().toISOString().split("T")[0];
    let commitHash = "N/A";

    try {
      commitHash = execSync("git rev-parse --short HEAD").toString().trim();
    } catch {
      console.log(chalk.yellow("⚠️ Git hash not found (not a git repo?)"));
    }

    const content = `
🌌 COSMIC SMART DASHBOARD – VERSION HISTORY
───────────────────────────────────────────────
Project: Cosmic Smart Dashboard
Codename: Horizon PWA
Maintainer: @MinecraftBotAsh
Engine: Node.js 22 + Express + Socket.IO + Workbox
───────────────────────────────────────────────

🔖 Current Version: v${version}
📦 Release Type: Stable (Auto Updated)
🗓️ Build Date: ${date}
⚙️ Build Target: production
🚀 Node Compatibility: >= 18.x

───────────────────────────────────────────────
🧱 BUILD INFO
───────────────────────────────────────────────
Version Label: ${label}
Build Hash: ${commitHash}
Build Time: ${new Date().toLocaleString()}
Commit Ref: main@v${version}
───────────────────────────────────────────────
`;

    await fs.ensureDir(publicDir);
    await fs.writeFile(versionFile, content.trim() + "\n");

    console.log(chalk.green(`✅ version.txt updated successfully (v${version})`));
  } catch (err) {
    console.error(chalk.red("❌ Failed to update version.txt:"), err);
  }
})();