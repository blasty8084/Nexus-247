// pluginLoader.js (V6.8.4-COSMIC SYNC CORE+)
// 🚀 Advanced Plugin Loader — Async, Config-Aware, Hot Reload, Live Dashboard Sync + Cosmic Heartbeat

const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const { EventEmitter } = require("events");
const logger = require("./logger");

const PLUGIN_DIR = path.join(__dirname, "plugins");
const SETTINGS_PATH = path.join(__dirname, "settings.json");

// 🌐 Global Emitter Bridge
const pluginEmitter = new EventEmitter();
global.pluginLoaderEmitter = pluginEmitter;

// 🧩 Ensure plugin directory exists
if (!fs.existsSync(PLUGIN_DIR)) fs.mkdirSync(PLUGIN_DIR, { recursive: true });

/* -------------------------------------------------------------------------- */
/* 🧩 Example Plugin Generator                                                */
/* -------------------------------------------------------------------------- */
function ensureExamplePlugin() {
  const files = fs.readdirSync(PLUGIN_DIR).filter((f) => f.endsWith(".js"));
  if (files.length === 0) {
    const examplePlugin = `
    /* examplePlugin.js — 🧩 Basic Example Plugin for Cosmic Core */
    module.exports = (bot, config, logger, io) => {
      logger.info("🧩 Example plugin loaded.");
      bot.once("spawn", () => logger.success("🎉 Example plugin active!"));
    };
    `;
    fs.writeFileSync(path.join(PLUGIN_DIR, "examplePlugin.js"), examplePlugin.trim(), "utf8");
    logger.info("🧩 Created example plugin: examplePlugin.js");
  }
}
ensureExamplePlugin();

logger.header("🧩 Plugin Loader Ready — V6.8.4 COSMIC SYNC CORE+", "magenta");

/* -------------------------------------------------------------------------- */
/* 🧠 Safe Require Utility                                                    */
/* -------------------------------------------------------------------------- */
function safeRequire(filePath) {
  try {
    delete require.cache[require.resolve(filePath)];
    return require(filePath);
  } catch (err) {
    logger.error(`❌ Failed to require: ${path.basename(filePath)} — ${err.message}`);
    console.error(err.stack || err);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* 🔌 Plugin Loader Core (V2-R13 – Hot Reload Bridge)                         */
/* -------------------------------------------------------------------------- */
async function loadPlugins(bot, io, opts = {}) {
  const pluginFiles = fs.readdirSync(PLUGIN_DIR).filter((f) => f.endsWith(".js"));
  logger.tag("#PLUGINS", `🧩 Loading ${pluginFiles.length} plugins...`);

  let settings = {};
  if (fs.existsSync(SETTINGS_PATH)) {
    try {
      settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8")) || {};
    } catch (err) {
      logger.error(`⚠️ Failed to parse settings.json: ${err.message}`);
    }
  }

  let results = [];
  let disabled = 0;

  for (const file of pluginFiles) {
    const name = file.replace(".js", "");
    const pluginPath = path.join(PLUGIN_DIR, file);

    if (settings.plugins && settings.plugins[name] === false) {
      logger.info(`🚫 Plugin disabled: ${name}`);
      disabled++;
      continue;
    }

    try {
      const plugin = safeRequire(pluginPath);
      if (!plugin) continue;

      const start = Date.now();

      if (typeof plugin === "function") {
        await plugin(bot, settings[name] || {}, logger.child(name), io);
      } else if (typeof plugin === "object" && typeof plugin.run === "function") {
        await plugin.run(bot, settings[name] || {}, logger.child(name), io);
      } else {
        logger.warn(`⚠️ Invalid plugin format: ${name}`);
        continue;
      }

      const time = Date.now() - start;
      results.push({ name, time });
      logger.success(`🔌 Loaded plugin: ${chalk.bold(name)} (${time}ms)`);

    } catch (err) {
      logger.error(`❌ Error in plugin "${file}": ${err.message}`);
      console.error(err.stack || err);
      if (settings.plugins) settings.plugins[name] = false;
      fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
      io?.emit("toast", { type: "error", message: `Plugin ${name} crashed and was auto-disabled` });
    }
  }

  const summary = {
    total: pluginFiles.length,
    loaded: results.length,
    disabled,
    list: results.map((p) => p.name),
  };

  logger.info(
    chalk.cyanBright(
      `\n📦 Plugin Summary
──────────────────────────────
Total:    ${summary.total}
Loaded:   ${summary.loaded}
Disabled: ${summary.disabled}
Active:   ${summary.list.join(", ") || "none"}\n`
    )
  );

  // 🌐 Notify dashboard
  if (!opts.silent && io) {
    io.emit("pluginStatus", summary);
    io.emit("toast", {
      type: "success",
      message: `🧩 Loaded ${results.length} plugins in ${results.reduce((a, b) => a + b.time, 0)}ms`,
    });
    io.emit("heartbeat", { time: Date.now(), status: "plugin_sync" });
  }

  pluginEmitter.emit("pluginsUpdated", summary);
  return summary;
}

/* -------------------------------------------------------------------------- */
/* 🔁 Hot Reload Logic                                                       */
/* -------------------------------------------------------------------------- */
pluginEmitter.on("reloadPlugins", async () => {
  logger.header("♻️ Hot Reloading Plugins...");
  try {
    await loadPlugins(global.botInstance, global.ioInstance, { hotReload: true });
    global.ioInstance?.emit("toast", {
      type: "success",
      message: "✅ Plugins reloaded successfully (Hot Bridge)",
    });
  } catch (err) {
    logger.error(`❌ Plugin Hot Reload Failed: ${err.message}`);
  }
});

/* -------------------------------------------------------------------------- */
/* 🌌 Cosmic Hot Reload — Watch for Changes                                  */
/* -------------------------------------------------------------------------- */
function initHotReload() {
  fs.watch(PLUGIN_DIR, (event, filename) => {
    if (filename && filename.endsWith(".js")) {
      logger.tag("#HOT", `♻️ Detected change in ${filename}, reloading plugins...`);
      pluginEmitter.emit("reloadPlugins");
    }
  });
  logger.info("🌌 Cosmic Hot Reload active — watching for plugin updates...");
}

/* -------------------------------------------------------------------------- */
/* 🚀 Export                                                                */
/* -------------------------------------------------------------------------- */
module.exports = {
  loadPlugins,
  initHotReload,
  loaderEmitter: pluginEmitter,
};