/**
 * 🚀 Cosmic Dashboard — Asset Deployment Manager (v6.8.4)
 * Handles uploading, syncing, and version tagging of built assets to remote/CDN/local environments.
 */

import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import crypto from "crypto";
import { execSync } from "child_process";
import axios from "axios";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../");
const buildDir = path.join(rootDir, "public");
const versionFile = path.join(rootDir, "version.txt");
const logDir = path.join(rootDir, "logs");
fs.ensureDirSync(logDir);

const DEPLOY_MODE = process.env.DEPLOY_MODE || "local"; // "local" | "github" | "cdn"
const CDN_URL = process.env.CDN_URL || "";
const GITHUB_REPO = process.env.GITHUB_REPO || "uttamsahu/Cosmic-Dashboard-v6.8";
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";

/* -------------------------------------------------------------------------- */
/*                              HELPER FUNCTIONS                              */
/* -------------------------------------------------------------------------- */

function log(msg, type = "info") {
  const timestamp = new Date().toISOString();
  const prefix =
    type === "success"
      ? chalk.green("✔")
      : type === "error"
      ? chalk.red("✖")
      : type === "warn"
      ? chalk.yellow("⚠")
      : chalk.cyan("•");
  console.log(`${prefix} ${chalk.white(msg)}`);
  fs.appendFileSync(
    path.join(logDir, "deploy.log"),
    `[${timestamp}] ${type.toUpperCase()} ${msg}\n`
  );
}

function checksum(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

/* -------------------------------------------------------------------------- */
/*                           DEPLOYMENT IMPLEMENTATIONS                       */
/* -------------------------------------------------------------------------- */

async function deployLocal() {
  log("Deploying to local /dist folder...");
  const targetDir = path.join(rootDir, "dist");
  fs.ensureDirSync(targetDir);

  fs.copySync(buildDir, targetDir, { overwrite: true });
  log(`Copied ${buildDir} → ${targetDir}`, "success");
}

async function deployGithub() {
  if (!TOKEN) {
    log("Missing GitHub token (GH_TOKEN)", "error");
    process.exit(1);
  }

  log(`Deploying to GitHub Pages repository: ${GITHUB_REPO}`);
  const ghPagesDir = path.join(rootDir, ".gh-pages-temp");
  fs.removeSync(ghPagesDir);
  fs.ensureDirSync(ghPagesDir);

  fs.copySync(buildDir, ghPagesDir);

  try {
    execSync(`cd ${ghPagesDir} && git init`);
    execSync(`cd ${ghPagesDir} && git config user.name "cosmic-bot"`);
    execSync(`cd ${ghPagesDir} && git config user.email "bot@cosmic.local"`);
    execSync(`cd ${ghPagesDir} && git add .`);
    execSync(`cd ${ghPagesDir} && git commit -m "Deploy Cosmic Dashboard ${new Date().toISOString()}"`);
    execSync(
      `cd ${ghPagesDir} && git push --force https://x-access-token:${TOKEN}@github.com/${GITHUB_REPO}.git main:gh-pages`
    );

    log("GitHub Pages deployment complete!", "success");
    fs.removeSync(ghPagesDir);
  } catch (err) {
    log(`GitHub deployment failed: ${err.message}`, "error");
  }
}

async function deployCDN() {
  if (!CDN_URL) {
    log("CDN_URL not configured", "error");
    return;
  }

  log(`Deploying assets to CDN endpoint: ${CDN_URL}`);

  const files = fs.readdirSync(buildDir);
  for (const file of files) {
    const fullPath = path.join(buildDir, file);
    if (fs.statSync(fullPath).isFile()) {
      const hash = checksum(fullPath);
      try {
        const response = await axios.post(`${CDN_URL}/upload`, {
          name: file,
          content: fs.readFileSync(fullPath, "base64"),
          checksum: hash,
        });
        if (response.status === 200) log(`Uploaded: ${file}`, "success");
        else log(`Failed to upload ${file}`, "warn");
      } catch (err) {
        log(`Error uploading ${file}: ${err.message}`, "error");
      }
    }
  }

  log("CDN asset sync complete", "success");
}

/* -------------------------------------------------------------------------- */
/*                             VERSION TRACKING                               */
/* -------------------------------------------------------------------------- */

function tagVersion() {
  if (!fs.existsSync(versionFile)) {
    fs.writeFileSync(versionFile, `Cosmic Dashboard v6.8.4\n`);
  }
  const versionTag = fs.readFileSync(versionFile, "utf8").trim();
  log(`Deployment version: ${versionTag}`, "info");
}

/* -------------------------------------------------------------------------- */
/*                               MAIN PROCESS                                 */
/* -------------------------------------------------------------------------- */

async function main() {
  console.log(chalk.magentaBright("\n🚀 Cosmic Dashboard Deployment Started"));
  tagVersion();

  if (!fs.existsSync(buildDir)) {
    log("Build directory missing. Run `npm run build` first.", "error");
    process.exit(1);
  }

  if (DEPLOY_MODE === "local") await deployLocal();
  else if (DEPLOY_MODE === "github") await deployGithub();
  else if (DEPLOY_MODE === "cdn") await deployCDN();
  else log(`Invalid DEPLOY_MODE: ${DEPLOY_MODE}`, "error");

  console.log(chalk.greenBright("\n✅ Deployment Completed Successfully!\n"));
}

main();