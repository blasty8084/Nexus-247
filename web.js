/**
 * 🌌 COSMIC DASHBOARD BACKEND (V6.8.5)
 * Express + Socket.IO + Plugin Telemetry Bridge + Live Dashboard
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");
const logger = require("./logger");
const pluginLoader = require("./pluginLoader");
const { loadPlugins } = pluginLoader;

// ────────────────────────────────────────────────
// 🌟 Version + Security Constants (PATCH ADDED)
// ────────────────────────────────────────────────
const VERSION = "6.8.5-STABLE+";
const publicMode = process.env.PUBLIC_MODE === "true"; // ✅ Safe toggle
const ADMIN_SECRET = process.env.ADMIN_SECRET || "cosmic-secure-default"; // 🔐 Secret token

const allowedOrigins = publicMode
  ? "*"
  : [/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.)/];

// ────────────────────────────────────────────────
// 🚀 Express + Socket.IO Setup
// ────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

global.ioInstance = io;

// Serve static dashboard
app.use(express.static(path.join(__dirname, "public")));
app.use("/logs", express.static(path.join(__dirname, "logs")));

// Health endpoint
app.get("/health", (req, res) => {
  const uptime = process.uptime() * 1000;
  res.json({
    status: "ok",
    uptime: Math.round(uptime),
    version: VERSION,
  });
});

// ────────────────────────────────────────────────
// 🔌 Socket.IO: Dashboard Events
// ────────────────────────────────────────────────
io.on("connection", (socket) => {
  logger.info(`🔗 Dashboard connected: ${socket.id}`);

  socket.emit("versionInfo", {
    core: VERSION,
    web: VERSION,
    status: global.botInstance ? "online" : "offline",
    env: process.env.NODE_ENV || "development",
  });

  // ────────── Plugin Reload (Legacy) ──────────
  socket.on("reloadPlugins", async () => {
    try {
      logger.tag("#WEB", "🔁 Plugin reload requested via dashboard.");
      io.emit("toast", { type: "info", message: "🔄 Reloading all plugins..." });
      io.emit("pluginReloadStatus", { status: "reloading" });

      await loadPlugins(global.botInstance, io, { hotReload: true });

      io.emit("toast", { type: "success", message: "✅ Plugins reloaded successfully!" });
      io.emit("pluginReloadStatus", { status: "done" });
    } catch (err) {
      logger.error(`❌ Plugin reload failed: ${err.message}`);
      io.emit("toast", { type: "error", message: "❌ Plugin reload failed. Check logs." });
      io.emit("pluginReloadStatus", { status: "error" });
    }
  });

  // ────────── 🧩 PATCH: Advanced Plugin Controls ──────────
  socket.on("plugin:reload", async (pluginName) => {
    try {
      const result = await pluginLoader.reloadPlugin(pluginName);
      socket.emit("toast", { msg: `🔁 ${pluginName} reloaded`, type: "success" });
      io.emit("plugins:update", pluginLoader.listPlugins());
    } catch (err) {
      socket.emit("toast", { msg: `❌ Failed to reload ${pluginName}: ${err.message}`, type: "error" });
    }
  });

  socket.on("plugin:toggle", async ({ name, enabled }) => {
    try {
      if (enabled) await pluginLoader.enablePlugin(name);
      else await pluginLoader.disablePlugin(name);

      io.emit("plugins:update", pluginLoader.listPlugins());
      socket.emit("toast", {
        msg: `${enabled ? "✅ Enabled" : "🚫 Disabled"} ${name}`,
        type: "success",
      });
    } catch (err) {
      socket.emit("toast", { msg: `⚠️ Failed to toggle ${name}: ${err.message}`, type: "error" });
    }
  });

  // ────────── Feedback Logging ──────────
  socket.on("sendFeedback", (data) => {
    if (fs.existsSync("./settings.json")) {
      const settings = JSON.parse(fs.readFileSync("./settings.json", "utf8"));
      if (settings.feedbackEnabled) {
        const logLine = `[${new Date().toISOString()}] ${JSON.stringify(data)}\n`;
        fs.appendFileSync("./logs/feedback.log", logLine);
        logger.tag("#WEB", "💬 Feedback received.");
        socket.emit("toast", { type: "success", message: "✅ Feedback stored successfully!" });
      }
    }
  });
});

// ────────── Auto Broadcast on Plugin Change ──────────
if (pluginLoader.on) {
  pluginLoader.on("pluginChanged", () => {
    io.emit("plugins:update", pluginLoader.listPlugins());
  });
}

// Socket error handling
io.engine.on("connection_error", (err) => {
  logger.warn(`⚠️ Dashboard socket error: ${err.code} (${err.message})`);
});

// ────────────────────────────────────────────────
// 🌐 Start Server
// ────────────────────────────────────────────────
const port = process.env.PORT || (
  fs.existsSync("./settings.json")
    ? JSON.parse(fs.readFileSync("./settings.json")).dashboard?.port || 3000
    : 3000
);
server.listen(port, () => {
  logger.success(`🌐 Dashboard live on port ${port} (v${VERSION})`);
});

module.exports = { io };