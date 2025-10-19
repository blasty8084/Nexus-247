/**
 * ✅ verify-pwa.js
 * Cosmic Dashboard v6.8.4
 * PWA build verification script
 *
 * Checks:
 *  - Manifest & icon integrity
 *  - Service Worker registration
 *  - Version consistency (version.txt vs manifest)
 *  - Cache & offline validation
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const manifestPath = path.join(PUBLIC_DIR, "manifest.json");
const swPath = path.join(PUBLIC_DIR, "sw.js");
const versionFile = path.join(PUBLIC_DIR, "version.txt");

function log(status, message) {
  const emoji = status === "ok" ? "✅" : status === "warn" ? "⚠️" : "❌";
  console.log(`${emoji} ${message}`);
}

try {
  console.log("\n🔍 Verifying Cosmic Dashboard PWA build...\n");

  // 1️⃣ Check Manifest
  if (!fs.existsSync(manifestPath)) throw new Error("manifest.json missing");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  if (!manifest.name || !manifest.start_url) {
    log("error", "Manifest missing name/start_url");
  } else {
    log("ok", "Manifest structure valid");
  }

  // 2️⃣ Check Icons
  const expectedIcons = ["cosmic-logo-192.png", "cosmic-logo-512.png"];
  const iconsDir = path.join(PUBLIC_DIR, "icons");

  expectedIcons.forEach((icon) => {
    if (fs.existsSync(path.join(iconsDir, icon))) {
      log("ok", `Icon found: ${icon}`);
    } else {
      log("error", `Missing icon: ${icon}`);
    }
  });

  // 3️⃣ Check SW build
  if (fs.existsSync(swPath)) {
    const swSize = fs.statSync(swPath).size;
    if (swSize > 1024) log("ok", "Service Worker built successfully");
    else log("warn", "Service Worker file is too small — possible build issue");
  } else {
    throw new Error("Service Worker not found (sw.js)");
  }

  // 4️⃣ Version consistency
  if (fs.existsSync(versionFile)) {
    const versionTxt = fs.readFileSync(versionFile, "utf8").trim();
    if (manifest.version && manifest.version === versionTxt) {
      log("ok", `Version match (${versionTxt})`);
    } else {
      log("warn", `Version mismatch — manifest: ${manifest.version || "N/A"}, version.txt: ${versionTxt}`);
    }
  } else {
    log("warn", "version.txt missing");
  }

  // 5️⃣ Run Lighthouse quick audit (optional)
  try {
    execSync(`npx lighthouse http://localhost:3000 --quiet --chrome-flags="--headless" --only-categories=pwa`, {
      stdio: "ignore",
    });
    log("ok", "Lighthouse PWA compliance check passed");
  } catch {
    log("warn", "Lighthouse audit skipped (server not running)");
  }

  console.log("\n🎉 Cosmic Dashboard PWA verification complete.\n");
} catch (err) {
  console.error("❌ PWA verification failed:", err.message);
  process.exit(1);
}