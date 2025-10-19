/**
 * 🌌 COSMIC SYNC CORE (V6.8.4)
 * Minecraft Bot Core — Smart Reconnect, Unified Telemetry, Plugin Reload Resilience, and Dashboard Sync Export
 */

const mineflayer = require("mineflayer");
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const minecraftData = require("minecraft-data");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const http = require("http");
const { Server } = require("socket.io");
const logger = require("./logger");
const { loadPlugins, initHotReload } = require("./pluginLoader");
const { safeEmitTelemetryToActive } = require("./web");
const axios = require("axios");

// 🌌 AUTO OPTIMIZATION STARTUP HOOK (v6.8.4)
const { spawn } = require("child_process");
const os = require("os");
(async () => {
  try {
    const mem = os.totalmem() / 1024 / 1024;
    const botConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "settings.json"), "utf8"));
    const shouldOptimize =
      process.env.AUTO_OPTIMIZE === "true" ||
      (botConfig?.advanced?.autoOptimize ?? true);

    if (shouldOptimize && mem > 512) {
      console.log("[SYSTEM] 🔧 Running asset optimizer (AUTO_OPTIMIZE=true)");
      const proc = spawn("node", [path.join("scripts", "optimize-assets.js")], {
        stdio: "inherit",
      });
      proc.on("exit", (code) =>
        console.log(`[SYSTEM] Optimization complete → Exit Code ${code}`)
      );
    } else {
      console.log(
        "[SYSTEM] ⚡ Auto optimization skipped (disabled or low memory device)"
      );
    }
  } catch (err) {
    console.error("[SYSTEM] Auto optimizer error:", err);
  }
})();

/* -------------------------------------------------------------------------- */
/* 📂 Core Globals                                                           */
/* -------------------------------------------------------------------------- */
const SETTINGS_PATH = path.join(__dirname, "settings.json");
const SYNC_EXPORT_PATH = path.join(__dirname, "public", "bot-sync.json"); // ✅ JSON export for dashboard
let settings = {};
let bot = null;
let io = null;
let uptimeStart = null;
let restartTimeout = null;
let lastHealthStatus = "unknown";

/* -------------------------------------------------------------------------- */
/* ⚙️ Load Settings                                                          */
/* -------------------------------------------------------------------------- */
function loadSettings() {
  try {
    settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8"));
    logger.success("✅ Settings loaded successfully.");
  } catch (err) {
    logger.error("❌ Failed to load settings.json — using defaults.");
    settings = {};
  }
}

/* -------------------------------------------------------------------------- */
/* 🤖 Create Bot Function                                                    */
/* -------------------------------------------------------------------------- */
function createBot() {
  if (bot) {
    logger.warn("⚠️ Destroying existing bot instance...");
    bot.removeAllListeners();
    bot.quit("Restarting");
  }

  const { username, password, type } = settings["bot-account"] || {};
  const { ip, port, version } = settings.server || {};

  logger.header("🚀 Launching Cosmic Bot...", "cyan");
  bot = mineflayer.createBot({
    host: ip || "localhost",
    port: port || 25565,
    username: username || "CosmicBot",
    password,
    auth: type || "microsoft",
    version,
  });

  global.botInstance = bot;

  /* ---------------------------------------------------------------------- */
  /* 🧭 Pathfinder Setup                                                    */
  /* ---------------------------------------------------------------------- */
  bot.loadPlugin(pathfinder);
  const mcData = minecraftData(bot.version);
  const defaultMovements = new Movements(bot, mcData);
  bot.once("spawn", () => bot.pathfinder.setMovements(defaultMovements));

  /* ---------------------------------------------------------------------- */
  /* 📡 Core Events                                                        */
  /* ---------------------------------------------------------------------- */
  bot.once("spawn", async () => {
    uptimeStart = Date.now();
    logger.success(`🌍 Bot spawned on ${ip}:${port}`);
    io?.emit("botStatus", { status: "online", username, ip, version });
    await loadPlugins(bot, io);
    exportSyncState(); // ✅ Export JSON for dashboard
  });

  bot.on("end", () => handleBotEnd("disconnected"));
  bot.on("kicked", (reason) => handleBotEnd("kicked", reason));
  bot.on("error", (err) => handleBotEnd("error", err.message));

  /* ---------------------------------------------------------------------- */
  /* 🧠 Unified Heartbeat Telemetry                                        */
  /* ---------------------------------------------------------------------- */
  setInterval(() => {
    if (!bot || !bot.player) return;
    const uptime = uptimeStart ? Date.now() - uptimeStart : 0;
    const ping = bot.player?.ping ?? 0;
    const memory = +(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

    const state = {
      status: "online",
      uptime,
      ping,
      memory,
      position: bot.entity?.position,
      username: bot.username,
      timestamp: new Date().toISOString(),
    };

    safeEmitTelemetryToActive("botHeartbeat", state);
    exportSyncState(state);
  }, 2000);
}

/* -------------------------------------------------------------------------- */
/* 💾 Clean JSON Export for Dashboard Sync                                   */
/* -------------------------------------------------------------------------- */
function exportSyncState(extra = {}) {
  try {
    const data = {
      username: bot?.username || "N/A",
      status: bot ? "online" : "offline",
      memory: +(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
      uptime: uptimeStart ? Date.now() - uptimeStart : 0,
      timestamp: new Date().toISOString(),
      ...extra,
    };
    fs.writeFileSync(SYNC_EXPORT_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    logger.warn("⚠️ Failed to export sync state JSON: " + err.message);
  }
}

/* -------------------------------------------------------------------------- */
/* 💀 Auto-Safe Restart Patch                                               */
/* -------------------------------------------------------------------------- */
function handleBotEnd(reason, details) {
  logger.warn(`⚠️ Bot ended: ${reason} ${details || ""}`);
  io?.emit("botStatus", { status: "offline", reason });

  if (restartTimeout) clearTimeout(restartTimeout);

  if (settings.reconnect?.onCrashRestart) {
    const delay = settings.reconnect?.delayBase || 5000;
    logger.info(`♻️ Restarting bot safely in ${delay / 1000}s...`);
    restartTimeout = setTimeout(() => {
      createBot();
      io?.emit("systemEvent", { type: "restart", message: "Bot restarted automatically" });
    }, delay);
  }
}

/* -------------------------------------------------------------------------- */
/* 🛰️ Dashboard Bridge + Plugin Reload Resilience                           */
/* -------------------------------------------------------------------------- */
function startDashboard() {
  const server = http.createServer();
  io = new Server(server, {
    cors: {
      origin: [/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.)/],
      methods: ["GET", "POST"],
    },
  });

  global.ioInstance = io;

  io.on("connection", (socket) => {
    logger.info(`🔗 Dashboard connected: ${socket.id}`);
    socket.emit("versionInfo", {
      core: "V6.8.4",
      web: "V6.8.4",
      status: bot ? "online" : "offline",
      env: process.env.NODE_ENV || "development",
    });

    socket.on("reloadPlugins", async () => {
      try {
        logger.tag("#WEB", "🔁 Plugin reload requested via dashboard.");
        io.emit("toast", { type: "info", message: "🔄 Reloading all plugins..." });
        io.emit("pluginReloadStatus", { status: "reloading" });

        await loadPlugins(bot, io, { hotReload: true });
        exportSyncState();

        io.emit("toast", { type: "success", message: "✅ Plugins reloaded successfully!" });
        io.emit("pluginReloadStatus", { status: "done" });
      } catch (err) {
        logger.error(`❌ Plugin reload failed: ${err.message}`);
        io.emit("toast", { type: "error", message: "❌ Plugin reload failed. Check logs." });
        io.emit("pluginReloadStatus", { status: "error" });
      }
    });

    socket.on("sendFeedback", (data) => {
      if (settings.feedbackEnabled) {
        const logLine = `[${new Date().toISOString()}] ${JSON.stringify(data)}\n`;
        fs.appendFileSync("./logs/feedback.log", logLine);
        logger.tag("#WEB", "💬 Feedback received.");
        socket.emit("toast", { type: "success", message: "✅ Feedback stored successfully!" });
      }
    });
  });

  io.engine.on("connection_error", (err) => {
    logger.warn(`⚠️ Dashboard socket error: ${err.code} (${err.message})`);
  });

  const port = settings.dashboard?.port || 3000;
  server.listen(port, () => {
    logger.success(`🌐 Dashboard live on port ${port}`);
  });
}

/* -------------------------------------------------------------------------- */
/* ❤️ Health Monitor for Docker & Web.js                                     */
/* -------------------------------------------------------------------------- */
async function monitorHealth() {
  const healthURL = process.env.WEB_HEALTH_URL || "http://localhost:3000/health";

  try {
    const res = await axios.get(healthURL, { timeout: 2000 });
    if (res.status === 200 && res.data?.uptime >= 0) {
      if (lastHealthStatus !== "healthy") {
        logger.success(`💚 Web health OK — version ${res.data.version}`);
        lastHealthStatus = "healthy";
      }
    } else {
      logger.warn("⚠️ Unexpected health response.");
      lastHealthStatus = "degraded";
    }
  } catch (err) {
    if (lastHealthStatus !== "down") {
      logger.error("🚨 Web health endpoint not responding!");
      lastHealthStatus = "down";
    }
  }
}

/* -------------------------------------------------------------------------- */
/* 🚀 Initialize Cosmic Core                                                */
/* -------------------------------------------------------------------------- */
(async () => {
  loadSettings();
  startDashboard();
  createBot();
  initHotReload();
  setInterval(monitorHealth, 10000);
  logger.info(`🌌 Environment: ${process.env.NODE_ENV || "development"}`);
})();