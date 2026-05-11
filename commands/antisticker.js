// ==============================================
// ⚙️ Azahrabot AntiSticker Command
// Admins can turn on/off sticker auto-delete
// ==============================================

const antiSticker = require("../lib/small_lib/anti/antisticker");

module.exports = async (sock, msg, from, text, args) => {
  try {
    if (!from.endsWith("@g.us")) {
      return await sock.sendMessage(from, { text: "❗ This command is for groups only." }, { quoted: msg });
    }

    const metadata = await sock.groupMetadata(from);
    const participants = metadata.participants || [];
    const sender = msg.key.participant || msg.key.remoteJid;
    const admins = participants.filter(p => p.admin).map(p => p.id);
    const isAdmin = admins.includes(sender) || msg.key.fromMe;

    if (!isAdmin) {
      return await sock.sendMessage(from, { text: "❌ Only group admins can use this command." }, { quoted: msg });
    }

    const arg = (args[0] || "").toLowerCase();
    if (!arg || !["on", "off"].includes(arg)) {
      const state = antiSticker.getGroupMode(from).enabled;
      return await sock.sendMessage(from, {
        text: `🩶 *AntiSticker Status*\n\n📦 *Current:* ${state ? "ON ✅" : "OFF ❌"}\n\nUse:\n.antisticker on — Enable\n.antisticker off — Disable`
      }, { quoted: msg });
    }

    const state = arg === "on";
    antiSticker.setGroupMode(from, state);

    await sock.sendMessage(from, {
      text: `✅ *AntiSticker ${state ? "Enabled" : "Disabled"}!* \n> Stickers will ${state ? "now be deleted automatically" : "no longer be deleted"}.\n> powered by AzarTech ⚡`
    }, { quoted: msg });

  } catch (err) {
    console.error("❌ .antisticker error:", err);
    await sock.sendMessage(from, { text: `⚠️ Failed: ${err.message}` }, { quoted: msg });
  }
};
