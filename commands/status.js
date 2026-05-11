// ==========================================================
// 💻 Azahrabot System Status v4.9
// Uptime • Memory • CPU • Live Mode • Secure Branding
// ==========================================================

const os = require("os");
const fs = require("fs");
const path = require("path");
const process = require("process");
const { runtime } = require("../lib/functions");
const settings = require("../settings");
const secure = require("../lib/small_lib"); // ✅ locked info (bot name, author, update link)

module.exports = async (sock, msg, from, text, args) => {
  try {
    // 🧠 System Info
    const used = process.memoryUsage();
    const totalRAM = os.totalmem();
    const freeRAM = os.freemem();
    const cpuLoad = os.loadavg()[0].toFixed(2);
    const uptime = runtime(process.uptime());

    // 💾 Format numbers
    const usedMB = (used.rss / 1024 / 1024).toFixed(2);
    const freeMB = (freeRAM / 1024 / 1024).toFixed(2);
    const totalMB = (totalRAM / 1024 / 1024).toFixed(2);
    const usagePercent = ((used.rss / totalRAM) * 100).toFixed(2);

    // ✅ Load live mode from /data/botMode.json
    const modeFile = path.join(__dirname, "../data/botMode.json");
    let currentMode = "public";
    try {
      if (fs.existsSync(modeFile)) {
        const data = JSON.parse(fs.readFileSync(modeFile, "utf8"));
        currentMode = data.mode || "public";
      }
    } catch (err) {
      console.log("⚠️ Mode read error:", err.message);
    }

    // 🧾 Status Report
    const info = `
⚙️ *${secure.botName} — System Status*
━━━━━━━━━━━━━━━━━━━
🕒 *Uptime:* ${uptime}
💾 *Memory:* ${usedMB} / ${totalMB} MB (${usagePercent}%)
🔋 *Free RAM:* ${freeMB} MB
🧠 *CPU Load:* ${cpuLoad}
📦 *Version:* ${settings.version}
👑 *Owner:* ${settings.botOwner}
━━━━━━━━━━━━━━━━━━━
📍 *Mode:* ${currentMode.toUpperCase()}
🌐 *Update:* ${secure.updateZipUrl ? "Available ✅" : "Disabled ❌"}
━━━━━━━━━━━━━━━━━━━
💬 *Status:* Running Smooth ⚡
> powered by ${secure.author} 🚀
    `.trim();

    // 🪄 Send with banner and no ad links
    await sock.sendMessage(
      from,
      {
        text: info,
        contextInfo: {
          externalAdReply: {
            title: `${secure.botName} — System Monitor 💫`,
            body: "Uptime, memory, and version in real time.",
            mediaType: 1,
            renderLargerThumbnail: true,
            thumbnailUrl: secure.channel.banner,
            sourceUrl: secure.repoUrl,
          },
        },
      },
      { quoted: msg }
    );
  } catch (err) {
    console.error("❌ Error in status command:", err);
    await sock.sendMessage(
      from,
      { text: "⚠️ Failed to get system status." },
      { quoted: msg }
    );
  }
};
