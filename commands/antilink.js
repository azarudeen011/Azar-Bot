// ==============================================
// 🚨 Azahrabot AntiLink Command (v1.3)
// Group Admin Only • Delete / Warn / Kick modes per group
// ==============================================

const path = require("path");
const anti = require(path.resolve(__dirname, "../lib/small_lib/anti/antilink"));
const settings = require("../settings");
const secure = require("../lib/small_lib");

module.exports = async (sock, msg, from, text, args) => {
  try {
    // 🧠 Verify group context
    if (!from.endsWith("@g.us")) {
      return await sock.sendMessage(from, {
        text: "❌ This command can only be used inside a group."
      }, { quoted: msg });
    }

    // 🧠 Get sender and group metadata
    const metadata = await sock.groupMetadata(from);
    const participants = metadata.participants || [];
    const sender = msg.key.participant || msg.key.remoteJid;
    const admins = participants.filter(p => p.admin).map(p => p.id);
    const isAdmin = admins.includes(sender) || msg.key.fromMe;

    // 👑 Only admins can modify anti-link settings
    if (!isAdmin) {
      return await sock.sendMessage(from, {
        text: "❌ Only group admins can configure anti-link settings."
      }, { quoted: msg });
    }

    // 🧾 Parse command args
    const option = (args[0] || "").toLowerCase();  // delete / warn / kick
    const state = (args[1] || "").toLowerCase();   // on / off

    if (!option) {
      const mode = anti.getGroupMode(from);
      const currentStatus = `
⚙️ *AntiLink Settings for this Group*
━━━━━━━━━━━━━━━━━━━
🧹 Delete links: ${mode.delete ? "✅ ON" : "❌ OFF"}
⚠️ Warn users: ${mode.warn ? "✅ ON" : "❌ OFF"}
🚫 Kick users: ${mode.kick ? "✅ ON" : "❌ OFF"}
━━━━━━━━━━━━━━━━━━━
💡 Example:
.antilink delete on
.antilink warn off
.antilink kick on
━━━━━━━━━━━━━━━━━━━
> powered by *${secure.author || "AzarTech"}* ⚡
`.trim();

      return await sock.sendMessage(from, { text: currentStatus }, { quoted: msg });
    }

    // 🛑 Invalid option
    if (!["delete", "warn", "kick"].includes(option)) {
      return await sock.sendMessage(from, {
        text: "⚙️ Invalid option.\nUse one of: delete / warn / kick"
      }, { quoted: msg });
    }

    // 🟢 Enable / 🔴 Disable the selected mode
    if (!["on", "off"].includes(state)) {
      return await sock.sendMessage(from, {
        text: "⚙️ Specify ON or OFF\nExample: `.antilink delete on`"
      }, { quoted: msg });
    }

    const newConfig = {};
    newConfig[option] = state === "on";
    const updated = anti.setGroupMode(from, newConfig);

    const confirmText = `
✅ *AntiLink Updated Successfully!*
━━━━━━━━━━━━━━━━━━━
🧩 Option: ${option.toUpperCase()}
🔘 Status: ${state.toUpperCase()}
━━━━━━━━━━━━━━━━━━━
🧹 Delete: ${updated.delete ? "✅" : "❌"}
⚠️ Warn: ${updated.warn ? "✅" : "❌"}
🚫 Kick: ${updated.kick ? "✅" : "❌"}
━━━━━━━━━━━━━━━━━━━
> powered by *${secure.author || "AzarTech"}* ⚡
`.trim();

    await sock.sendMessage(from, { text: confirmText }, { quoted: msg });

  } catch (err) {
    console.error("antilink.js error:", err);
    await sock.sendMessage(from, {
      text: `⚠️ AntiLink command failed.\nError: ${err.message}`
    }, { quoted: msg });
  }
};
