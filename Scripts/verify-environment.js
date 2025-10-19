/**
 * 🧪 Cosmic Environment Validator (v6.8.4)
 * Checks system readiness before build/start.
 * Ensures required files, directories, and configurations exist.
 */

import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../");

// Load environment variables if present
dotenv.config({ path: path.join(rootDir, ".env") });

const REQUIRED_NODE_VERSION = 22;
const REQUIRED_DIRS = [
  "public",
  "logs",
  "plugins",
  "telemetry",
  "scripts",
];
const REQUIRED_FILES = [
  "index.js",
  "web.js",
  "pluginLoader.js",
  "logger.js",
  "settings.json",
  "package.json",
];
const REQUIRED_PUBLIC_FILES = [
  "index.html",
  "manifest.json",
  "style.css",
  "script.js",
  "version.txt",
];
const CRITICAL_ASSETS = [
  "icons/cosmic-logo-192.png",
  "icons/cosmic-logo-512.png",
  "icons/favicon.ico",
];

/* -------------------------------------------------------------------------- */
/*                             UTILITY FUNCTIONS                              */
/* -------------------------------------------------------------------------- */
function checkNodeVersion() {
  const version = parseInt(process.versions.node.split(".")[0], 10);
  if (version < REQUIRED_NODE_VERSION) {
    console.error(
      chalk.redBright(
        `❌ Node.js v${REQUIRED_NODE_VERSION}+ required, found v${version}`
      )
    );
    process.exit(1);
  } else {
    console.log(chalk.green(`✅ Node.js v${version} is compatible.`));
  }
}

async function checkDirectories() {
  console.log(chalk.cyan("\n📂 Checking required directories..."));
  for (const dir of REQUIRED_DIRS) {
    const dirPath = path.join(rootDir, dir);
    if (!(await fs.pathExists(dirPath))) {
      await fs.mkdirp(dirPath);
      console.log(chalk.yellow(`⚠️ Created missing directory: ${dir}`));
    } else {
      console.log(chalk.green(`✅ Directory found: ${dir}`));
    }
  }
}

async function checkFiles() {
  console.log(chalk.cyan("\n🧩 Checking required files..."));
  for (const file of REQUIRED_FILES) {
    const filePath = path.join(rootDir, file);
    if (!(await fs.pathExists(filePath))) {
      console.error(chalk.red(`❌ Missing required file: ${file}`));
      process.exit(1);
    } else {
      console.log(chalk.green(`✅ File exists: ${file}`));
    }
  }
}

async function checkPublicAssets() {
  const publicDir = path.join(rootDir, "public");
  console.log(chalk.cyan("\n🌐 Checking public assets..."));

  for (const file of REQUIRED_PUBLIC_FILES) {
    const filePath = path.join(publicDir, file);
    if (!(await fs.pathExists(filePath))) {
      console.error(chalk.red(`❌ Missing frontend file: public/${file}`));
      process.exit(1);
    } else {
      console.log(chalk.green(`✅ Found: public/${file}`));
    }
  }

  for (const asset of CRITICAL_ASSETS) {
    const assetPath = path.join(publicDir, asset);
    if (!(await fs.pathExists(assetPath))) {
      console.error(chalk.red(`❌ Missing icon/asset: ${asset}`));
      process.exit(1);
    } else {
      console.log(chalk.green(`🖼️  Verified: ${asset}`));
    }
  }
}

async function checkPermissions() {
  console.log(chalk.cyan("\n🔐 Checking permissions..."));
  const testFile = path.join(rootDir, "logs", "permission-test.tmp");

  try {
    await fs.writeFile(testFile, "ok");
    await fs.remove(testFile);
    console.log(chalk.green("✅ Write permissions OK for logs folder."));
  } catch (err) {
    console.error(
      chalk.red(
        "❌ Log folder not writable. Check permissions or run with elevated access."
      )
    );
    process.exit(1);
  }
}

function checkEnvVariables() {
  console.log(chalk.cyan("\n⚙️ Checking environment variables..."));

  const requiredEnv = ["PORT", "BOT_NAME", "SERVER_IP"];
  const missing = requiredEnv.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.warn(
      chalk.yellow(
        `⚠️ Missing .env variables: ${missing.join(", ")} (using defaults)`
      )
    );
  } else {
    console.log(chalk.green("✅ All required .env variables are present."));
  }
}

/* -------------------------------------------------------------------------- */
/*                              MAIN EXECUTION                                */
/* -------------------------------------------------------------------------- */
(async () => {
  console.log(chalk.magentaBright("\n🌌 Cosmic Dashboard Environment Check (v6.8.4)\n"));

  checkNodeVersion();
  await checkDirectories();
  await checkFiles();
  await checkPublicAssets();
  await checkPermissions();
  checkEnvVariables();

  console.log(chalk.bold.greenBright("\n✅ Environment verified successfully — ready to build or start!\n"));
})();