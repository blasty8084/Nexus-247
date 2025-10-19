/**
 * 🧩 Test Plugin — V6.8.5
 * Purpose: Demonstrate plugin loading, bot interaction, and dashboard logs.
 */

module.exports = async (bot, config, logger, io) => {
  logger.info("🧩 Test Plugin loaded.");

  // Trigger on bot spawn
  bot.once("spawn", () => {
    logger.success("🎉 Test Plugin active! Bot has spawned.");
  });

  // Periodic action every 10 seconds
  const interval = setInterval(() => {
    if (!bot || !bot.entity) return;
    const pos = bot.entity.position;
    logger.info(`📍 Bot position check: x=${pos.x.toFixed(1)}, y=${pos.y.toFixed(1)}, z=${pos.z.toFixed(1)}`);

    // Emit to dashboard if connected
    io?.emit("plugin:event", {
      plugin: "testPlugin",
      message: `Position check: x=${pos.x.toFixed(