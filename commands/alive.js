// ==============================================
// 💚 Azahrabot Alive Command (v5.1 — View Button Added)
// ==============================================

const os = require("os");
const small = require("../lib/small_lib");

module.exports = async (sock, msg, from) => {
  try {
    await sock.sendMessage(from, { react: { text: "💚", key: msg.key } }).catch(() => {});
  } catch {}

  try {
    // Bot & system info
    const botName = small.botName;
    const ownerName = small.ownerName;
    const version = "5.1";
    const author = small.author;

    const uptimeSec = process.uptime();
    const uptimeMin = Math.floor(uptimeSec / 60);
    const uptime =
      uptimeMin > 0
        ? `${uptimeMin}m ${Math.floor(uptimeSec % 60)}s`
        : `${Math.floor(uptimeSec)}s`;

    const usedMem = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
    const cpuModel = os.cpus()[0].model.split(" ").slice(0, 2).join(" ");
    const platform = os.platform();

    const text = `
💚 *${botName} System Alive*
━━━━━━━━━━━━━━━━━━━
🕒 *Uptime:* ${uptime}
💾 *Memory:* ${usedMem} MB
⚙️ *Platform:* ${platform}
💻 *CPU:* ${cpuModel}
━━━━━━━━━━━━━━━━━━━
👑 *Owner:* ${ownerName}
💫 *Version:* ${version}
────────────────────
✅ Bot is running perfectly fine!
> powered by *${author}* ⚡
`.trim();

    // 📌 Native View Channel button (WhatsApp style)
    const newsletterJid = small.channel?.jid;

    await sock.sendMessage(
      from,
      {
        text,
        contextInfo: {
          forwardedNewsletterMessageInfo: {
            newsletterJid: newsletterJid,
            serverMessageId: 1,
            newsletterName: small.channel?.name
          },
          isForwarded: true,
          forwardingScore: 1
        }
      },
      { quoted: msg }
    );

  } catch (err) {
    console.error("❌ Alive command error:", err.message);
    await sock.sendMessage(from, { text: "⚠️ Failed to check bot status." }, { quoted: msg });
  }
};
