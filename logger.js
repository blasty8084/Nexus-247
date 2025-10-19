// logger.js — V6.8.4 Cosmic Gradient+
// 🌌 Unified async logger with gradient headers, live dashboard replay,
// smart rotation, plugin hot reload tags, and telemetry bridge

const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const { EventEmitter } = require("events");
const os = require("os");

/* -------------------------------------------------------------------------- */
/* 📁 Directory Setup                                                        */
/* -------------------------------------------------------------------------- */
const ROOT = __dirname;
const LOG_DIR = path.join(ROOT, "logs");
const DATA_DIR = path.join(ROOT, "data", "logs");

for (const dir of [LOG_DIR, DATA_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const MAIN_LOG = path.join(LOG_DIR, "latest.log");

/* -------------------------------------------------------------------------- */
/* 🎨 Color Styles + Icons                                                   */
/* -------------------------------------------------------------------------- */
const COLORS = {
  info: chalk.cyanBright,
  success: chalk.greenBright,
  warn: chalk.yellowBright,
  error: chalk.redBright,
  debug: chalk.magentaBright,
};

const ICONS = {
  info: "ℹ️",
  success: "✅",
  warn: "⚠️",
  error: "❌",
  debug: "🐞",
};

/* -------------------------------------------------------------------------- */
/* 📡 Live Dashboard + Replay Cache                                          */
/* -------------------------------------------------------------------------- */
const logEmitter = new EventEmitter();
const replayCache = [];
const MAX_CACHE = 100;

/* -------------------------------------------------------------------------- */
/* ⚙️ Logger Class                                                           */
/* -------------------------------------------------------------------------- */
class Logger {
  constructor(context = "CORE") {
    this.context = context.toUpperCase();
  }

  _timestamp() {
    return new Date().toISOString();
  }

  _today() {
    return new Date().toISOString().split("T")[0];
  }

  _format(level, message) {
    const time = new Date().toLocaleTimeString("en-US", { hour12: false });
    const color = COLORS[level] || ((x) => x);
    const icon = ICONS[level] || "";
    const ctx = chalk.white.bold(`[${this.context}]`);
    return `${chalk.gray(time)} ${ctx} ${color(`${icon} ${level.toUpperCase()}`)} ${message}`;
  }

  async _write(level, message) {
    const timestamp = this._timestamp();
    const formatted = this._format(level, message);
    const line = `[${timestamp}] [${this.context}] [${level}] ${message}${os.EOL}`;

    // Console output
    console.log(formatted);

    // Replay cache
    replayCache.push({ level, message, context: this.context, timestamp });
    if (replayCache.length > MAX_CACHE) replayCache.shift();

    // Emit live to dashboard
    logEmitter.emit("log", { level, message, context: this.context, timestamp });

    // Async file write
    const dailyPath = path.join(DATA_DIR, `${level}-${this._today()}.log`);
    try {
      await Promise.all([
        fs.promises.appendFile(MAIN_LOG, line),
        fs.promises.appendFile(dailyPath, line),
      ]);
    } catch (err) {
      console.error(chalk.redBright(`⚠️ Logger write error: ${err.message}`));
    }
  }

  info(msg) {
    this._write("info", msg);
  }
  success(msg) {
    this._write("success", msg);
  }
  warn(msg) {
    this._write("warn", msg);
  }
  error(msg) {
    this._write("error", msg);
  }
  debug(msg) {
    if (process.env.DEBUG_MODE === "true") this._write("debug", msg);
  }

  header(title, color = "cyan") {
    const gradient = chalk.hex("#6a11cb").bgHex("#2575fc");
    const divider = chalk.gray("─".repeat(60));
    console.log(`\n${divider}\n${gradient.bold(` ${title} `)}\n${divider}`);
  }

  tag(tag, msg) {
    let prefix;
    switch (tag) {
      case "#PLUGINS":
        prefix = chalk.magenta("[PLUGINS]");
        break;
      case "#HOT":
        prefix = chalk.yellowBright("[HOT]");
        break;
      case "#TELEMETRY":
        prefix = chalk.cyanBright("[TELEMETRY]");
        break;
      default:
        prefix = chalk.hex("#9b5de5")(`[${tag}]`);
    }

    const time = chalk.gray(new Date().toLocaleTimeString("en-US", { hour12: false }));
    console.log(`${time} ${prefix} ${msg}`);
    this._write("info", `${tag} ${msg}`);
  }

  child(context) {
    return new Logger(context);
  }
}

/* -------------------------------------------------------------------------- */
/* 🧹 Log Rotation                                                           */
/* -------------------------------------------------------------------------- */
function cleanOldLogs(days = 2) {
  const now = Date.now();
  const retention = days * 86400000;

  fs.readdir(DATA_DIR, (err, files) => {
    if (err) return;
    for (const file of files) {
      const filePath = path.join(DATA_DIR, file);
      fs.stat(filePath, (err, stats) => {
        if (!err && now - stats.mtimeMs > retention) {
          fs.unlink(filePath, () => console.log(chalk.gray(`🧹 Deleted old log: ${file}`)));
        }
      });
    }
  });
}

setInterval(() => cleanOldLogs(2), 30 * 60 * 1000);
cleanOldLogs(2);

/* -------------------------------------------------------------------------- */
/* 🌐 Dashboard Integration + Telemetry Bridge                               */
/* -------------------------------------------------------------------------- */
try {
  const { io } = require("./web");

  // Emit new logs live
  logEmitter.on("log", (data) => {
    if (io) io.emit("log", data);
  });

  // Replay cache when a client connects
  if (io) {
    io.on("connection", (socket) => {
      replayCache.forEach((log) => socket.emit("log", log));

      // 🛰️ Telemetry Hook (optional)
      socket.on("telemetry", (data) => {
        if (data?.status) {
          const ping = data.ping ?? "N/A";
          const mem = data.memory ?? "N/A";
          const status = data.status ?? "unknown";
          const msg = `📡 Ping: ${ping}ms | RAM: ${mem}MB | Status: ${status}`;
          logger.tag("#TELEMETRY", msg);
        }
      });
    });
  }
} catch {
  // Ignore if web.js not initialized yet
}

/* -------------------------------------------------------------------------- */
/* 🚀 Export + Init                                                          */
/* -------------------------------------------------------------------------- */
const logger = new Logger("SYSTEM");
module.exports = logger;
module.exports.Logger = Logger;
module.exports.logEmitter = logEmitter;

logger.header("🪵 LOGGER READY — V6.8.4 Cosmic Gradient+", "blue");
logger.success("Logger initialized → writing to /logs/latest.log + /data/logs/");