// ==============================================
// 🚨 Azahrabot AntiLink-GC Command (v1.0)
// Group Admin Only • Toggle WhatsApp link detection
// ==============================================

const path = require("path");
const anti = require(path.resolve(__dirname, "../lib/small_lib/anti/antilinkgc"));
const secure = require("../lib/small_lib");

module.exports = async (sock, msg, from, text, args) => {
  try {
    if (!from.endsWith("@g.us")) {
      return await sock.sendMessage(from, {
        text: "❌ This command can only be used in groups."
      }, { quoted: msg });
    }

    const metadata = await sock.groupMetadata(from);
    const sender = msg.key.participant || msg.key.remoteJid;
    const isAdmin = metadata.participants.some(p => (p.id === sender || msg.key.fromMe) && p.admin);

    if (!isAdmin) {
      return await sock.sendMessage(from, {
        text: "❌ Only group admins can configure AntiLink-GC."
      }, { quoted: msg });
    }

    const option = (args[0] || "").toLowerCase(); // delete / warn / kick
    const state = (args[1] || "").toLowerCase();  // on / off

    if (!option) {
      const mode = anti.getGroupMode(from);
      const currentStatus = `
🛡️ *AntiLink-GC (WhatsApp Links Only)*
━━━━━━━━━━━━━━━━━━━
🧹 Auto Delete: ${mode.delete ? "✅ ON" : "❌ OFF"}
⚠️ Warn System: ${mode.warn ? "✅ ON" : "❌ OFF"}
🚫 Auto Kick: ${mode.kick ? "✅ ON" : "❌ OFF"}
━━━━━━━━━━━━━━━━━━━
💡 *Usage:*
.antilinkgc delete on/off
.antilinkgc warn on/off
.antilinkgc kick on/off
━━━━━━━━━━━━━━━━━━━
> powered by *${secure.author || "AzarTech"}* ⚡
`.trim();

      return await sock.sendMessage(from, { text: currentStatus }, { quoted: msg });
    }

    if (!["delete", "warn", "kick"].includes(option)) {
      return await sock.sendMessage(from, {
        text: "⚙️ Invalid option. Use: delete / warn / kick"
      }, { quoted: msg });
    }

    if (!["on", "off"].includes(state)) {
      return await sock.sendMessage(from, {
        text: `⚙️ Specify ON or OFF\nExample: \`.antilinkgc ${option} on\``
      }, { quoted: msg });
    }

    const newConfig = {};
    newConfig[option] = state === "on";
    const updated = anti.setGroupMode(from, newConfig);

    const confirmText = `
✅ *AntiLink-GC Settings Updated!*
━━━━━━━━━━━━━━━━━━━
🧩 Mode: ${option.toUpperCase()}
🔘 Status: ${state.toUpperCase()}
━━━━━━━━━━━━━━━━━━━
🧹 Delete: ${updated.delete ? "✅" : "❌"}
⚠️ Warn: ${updated.warn ? "✅" : "❌"}
🚫 Kick: ${updated.kick ? "✅" : "❌"}
━━━━━━━━━━━━━━━━━━━
> System: WA-Link Detection Active
`.trim();

    await sock.sendMessage(from, { text: confirmText }, { quoted: msg });

  } catch (err) {
    console.error("antilinkgc.js error:", err);
    await sock.sendMessage(from, {
      text: "⚠️ Command failed to execute."
    }, { quoted: msg });
  }
};
