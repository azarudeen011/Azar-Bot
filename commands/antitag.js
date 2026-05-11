// ==============================================
// ⚙️ Azahrabot AntiTag Command (v3.1 — Stable)
// Admins can toggle actions for tag-related messages
// ==============================================

const antiTag = require("../lib/small_lib/anti/antitag");
const secure = require("../lib/small_lib");
const settings = require("../settings");

module.exports = async (sock, msg, from, text, args) => {
  try {
    // ✅ Check if in group
    if (!from.endsWith("@g.us")) {
      return await sock.sendMessage(from, {
        text: "❌ This command can only be used in a group."
      }, { quoted: msg });
    }

    // 🧠 Fetch group metadata
    const metadata = await sock.groupMetadata(from);
    const participants = metadata.participants || [];
    const sender = msg.key.participant || msg.key.remoteJid;

    // 👑 Verify admin privileges
    const admins = participants.filter(p => p.admin).map(p => p.id);
    const isAdmin = admins.includes(sender) || msg.key.fromMe;
    if (!isAdmin) {
      return await sock.sendMessage(from, {
        text: "❌ Only group admins can configure AntiTag settings."
      }, { quoted: msg });
    }

    const subCmd = (args[0] || "").toLowerCase();
    const state = (args[1] || "").toLowerCase();

    if (!["delete", "warn", "kick", "status"].includes(subCmd)) {
      return await sock.sendMessage(from, {
        text: `
⚙️ *AntiTag Configuration*
━━━━━━━━━━━━━━━━━━━
🧩 *Available Actions:*
• delete  → auto delete tag messages
• warn    → warn tag users (3 = kick)
• kick    → instant kick on tag

💡 *Usage:*
.antitag delete on/off  
.antitag warn on/off  
.antitag kick on/off  
.antitag status
━━━━━━━━━━━━━━━━━━━
> powered by *${secure.author} ⚡*
        `.trim()
      }, { quoted: msg });
    }

    const config = antiTag.getGroupMode(from);

    // 📜 Show current settings
    if (subCmd === "status") {
      const statusMsg = `
📊 *AntiTag Status*
━━━━━━━━━━━━━━━━━━━
🗑️ Delete: ${config.delete ? "✅ ON" : "❌ OFF"}
⚠️ Warn: ${config.warn ? "✅ ON" : "❌ OFF"}
🚫 Kick: ${config.kick ? "✅ ON" : "❌ OFF"}
━━━━━━━━━━━━━━━━━━━
> Configured by *${secure.author}*
      `.trim();

      return await sock.sendMessage(from, { text: statusMsg }, { quoted: msg });
    }

    // 🧩 Toggle settings
    const newValue = state === "on";
    antiTag.setGroupMode(from, { [subCmd]: newValue });

    const confirmMsg = `
✅ *AntiTag Updated Successfully!*
━━━━━━━━━━━━━━━━━━━
🔧 *Action:* ${subCmd.toUpperCase()}
📜 *Status:* ${newValue ? "✅ ON" : "❌ OFF"}
━━━━━━━━━━━━━━━━━━━
> powered by *${secure.author} ⚡*
    `.trim();

    await sock.sendMessage(from, { text: confirmMsg }, { quoted: msg });

  } catch (err) {
    console.error("❌ .antitag error:", err);
    await sock.sendMessage(from, {
      text: `⚠️ Failed to update AntiTag settings.\nError: ${err.message}`
    }, { quoted: msg });
  }
};
