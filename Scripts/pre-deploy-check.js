/**
 * 🚀 Cosmic Dashboard — Pre-Deploy Check (v6.8.4)
 * Ensures system readiness, security configuration, and plugin integrity before deployment.
 */

import fs from "fs-extra";
import path from "path";
import os from "os";
import chalk from "chalk";
import net from "net";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../");
const configPath = path.join(rootDir, "config.json");
const pluginDir = path.join(rootDir, "plugins");
const publicDir = path.join(rootDir, "public");

let success = true;

/* -------------------------------------------------------------------------- */
/*                              UTILITY HELPERS                               */
/* -------------------------------------------------------------------------- */

function section(title) {
  console.log(chalk.cyanBright(`\n🔹 ${title}`));
}

function logPass(msg) {
  console.log(chalk.green(`✅ ${msg}`));
}

function logWarn(msg) {
  console.log(chalk.yellow(`⚠️ ${msg}`));
}

function logFail(msg) {
  console.log(chalk.red(`❌ ${msg}`));
  success = false;
}

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(port, "0.0.0.0");
  });
}

/* -------------------------------------------------------------------------- */
/*                             ENVIRONMENT CHECK                              */
/* -------------------------------------------------------------------------- */

section("System Environment");

try {
  const nodeVersion = process.versions.node;
  const major = parseInt(nodeVersion.split(".")[0]);
  if (major < 18) {
    logFail(`Node.js ${nodeVersion} is too old. Requires v18+.`);
  } else {
    logPass(`Node.js version OK (${nodeVersion})`);
  }

  const npmVersion = execSync("npm -v").toString().trim();
  logPass(`NPM version OK (${npmVersion})`);

  const freeMem = (os.freemem() / 1024 / 1024).toFixed(0);
  if (freeMem < 512) logWarn(`Low system memory: ${freeMem} MB`);
  else logPass(`Memory OK (${freeMem} MB free)`);

  logPass(`Platform: ${os.platform()} ${os.arch()}`);
} catch (err) {
  logFail(`Failed to check environment: ${err.message}`);
}

/* -------------------------------------------------------------------------- */
/*                              NETWORK CHECK                                 */
/* -------------------------------------------------------------------------- */

section("Network & Port Availability");

const portsToCheck = [3000, 8080, 25565];
for (const port of portsToCheck) {
  const available = await checkPort(port);
  if (available) logPass(`Port ${port} available`);
  else logWarn(`Port ${port} already in use`);
}

/* -------------------------------------------------------------------------- */
/*                            CONFIGURATION CHECK                             */
/* -------------------------------------------------------------------------- */

section("Configuration Validation");

if (fs.existsSync(configPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (!config.server || !config.server.port)
      logFail("config.json missing 'server.port' field");
    else logPass(`Config port: ${config.server.port}`);

    if (!config.dashboard?.cors)
      logWarn("CORS not defined in config.json — defaults may apply");
    else logPass(`CORS policy: ${config.dashboard.cors}`);

    if (!config.plugins)
      logWarn("Plugin section missing — optional but recommended");
  } catch {
    logFail("Invalid JSON structure in config.json");
  }
} else {
  logFail("Missing config.json file");
}

/* -------------------------------------------------------------------------- */
/*                               PLUGIN CHECK                                 */
/* -------------------------------------------------------------------------- */

section("Plugin Integrity");

if (fs.existsSync(pluginDir)) {
  const plugins = fs.readdirSync(pluginDir).filter((f) => f.endsWith(".js"));
  if (plugins.length === 0) {
    logWarn("No plugins found in /plugins directory");
  } else {
    plugins.forEach((plugin) => {
      const filePath = path.join(pluginDir, plugin);
      const stats = fs.statSync(filePath);
      if (stats.size > 100 * 1024)
        logWarn(`${plugin} is large (${(stats.size / 1024).toFixed(1)} KB)`);
      else logPass(`Plugin verified: ${plugin}`);
    });
  }
} else {
  logWarn("Missing /plugins directory — creating empty folder...");
  fs.ensureDirSync(pluginDir);
}

/* -------------------------------------------------------------------------- */
/*                              SECURITY CHECKS                               */
/* -------------------------------------------------------------------------- */

section("Security & SSL Check");

if (fs.existsSync(path.join(rootDir, "ssl/cert.pem"))) {
  logPass("SSL certificate found");
} else {
  logWarn("SSL not configured — HTTP mode only");
}

if (process.env.NODE_ENV !== "production") {
  logWarn(`NODE_ENV=${process.env.NODE_ENV} (consider setting 'production')`);
} else {
  logPass("Running in production mode");
}

/* -------------------------------------------------------------------------- */
/*                                PWA CHECK                                   */
/* -------------------------------------------------------------------------- */

section("PWA & Manifest Validation");

const manifestPath = path.join(publicDir, "manifest.json");
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (!manifest.name || !manifest.start_url)
      logFail("Manifest missing name/start_url");
    else logPass("Manifest valid");
  } catch {
    logFail("Invalid manifest.json structure");
  }
} else {
  logFail("Missing public/manifest.json");
}

/* -------------------------------------------------------------------------- */
/*                             SUMMARY REPORT                                 */
/* -------------------------------------------------------------------------- */

section("Pre-Deployment Summary");

if (success) {
  console.log(chalk.greenBright("\n✅ All pre-deploy checks passed successfully!"));
  console.log(chalk.white("System is ready for deployment.\n"));
} else {
  console.log(chalk.redBright("\n❌ Some checks failed. Review above before deploying.\n"));
  process.exit(1);
}