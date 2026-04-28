// ==============================================
// 🧹 Azahrabot Clear Command (v2.0 — System Health Edition)
// Frees cache + memory safely and shows system report
// ==============================================

const fs = require("fs");
const os = require("os");
const path = require("path");
const chalk = require("chalk");

module.exports = async (sock, msg, from) => {
  try {
    const sender = msg.key.participant || msg.key.remoteJid;
    const isOwner = msg.key.fromMe;
    if (!isOwner) {
      return await sock.sendMessage(from, { text: "❌ Only the paired bot owner can use `.clear`." }, { quoted: msg });
    }

    await sock.sendMessage(from, { react: { text: "🧹", key: msg.key } });

    // 🧠 Directories to clear (temp and session caches only)
    const dirs = [
      path.join(__dirname, "../temp"),
      path.join(__dirname, "../session"),
    ];

    let cleared = 0;
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;

      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        // 🔐 Skip auth folders
        if (file.includes("auth_info")) continue;

        try {
          if (fs.lstatSync(fullPath).isDirectory()) {
            fs.rmSync(fullPath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(fullPath);
          }
          cleared++;
        } catch {
          console.log(`⚠️ Could not delete: ${fullPath}`);
        }
      }
    }

    // 💾 Clear Node.js require cache
    Object.keys(require.cache).forEach((key) => {
      if (!key.includes("auth_info")) delete require.cache[key];
    });

    // 🧽 Trigger garbage collection if possible
    if (global.gc) global.gc();

    // 🧮 System health data
    const usedMem = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
    const totalMem = (os.totalmem() / 1024 / 1024).toFixed(1);
    const freeMem = (os.freemem() / 1024 / 1024).toFixed(1);
    const uptime = formatUptime(process.uptime());
    const cpuLoad = os.loadavg()[0].toFixed(2);

    let msgText = `
🧹 *Cache & Memory Cleanup Complete!*
────────────────────────
📦 *Files Removed:* ${cleared}
💾 *Memory Usage:* ${usedMem} MB / ${totalMem} MB
💨 *Free Memory:* ${freeMem} MB
⚙️ *CPU Load:* ${cpuLoad}
⏱️ *Uptime:* ${uptime}
────────────────────────
> Bot connection remains safe ✅
> Powered by *AzahraBot* ⚡
    `.trim();

    // 🚨 Restart if memory still high
    if (usedMem > 480) {
      msgText += "\n\n⚠️ *Memory still high!* Restarting to free RAM...";
      await sock.sendMessage(from, { text: msgText }, { quoted: msg });
      console.log(chalk.red(`🚨 Restarting due to high memory (${usedMem} MB)...`));
      process.exit(1);
    } else {
      await sock.sendMessage(from, { text: msgText }, { quoted: msg });
      await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });
    }

  } catch (err) {
    console.error("❌ .clear error:", err);
    await sock.sendMessage(from, { text: `⚠️ Failed to clear cache: ${err.message}` }, { quoted: msg });
  }
};

// 🕒 Uptime formatter
function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}
