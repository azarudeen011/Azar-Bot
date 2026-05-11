// ==============================================
// 🧩 AntiMedia Command Controller
// .antimedia [delete/warn/kick] [on/off]
// Admins only
// ==============================================

const anti = require("../lib/small_lib/anti/antimedia");

module.exports = async (sock, msg, from, text, args) => {
  try {
    const metadata = await sock.groupMetadata(from);
    const sender = msg.key.participant || msg.key.remoteJid;
    const admins = metadata.participants.filter(p => p.admin).map(p => p.id);
    const isAdmin = admins.includes(sender) || msg.key.fromMe;

    if (!isAdmin) {
      return sock.sendMessage(from, {
        text: "❌ Only admins can manage anti-media settings.",
      }, { quoted: msg });
    }

    const type = args[0]?.toLowerCase();
    const value = args[1]?.toLowerCase();

    if (!type || !value)
      return sock.sendMessage(from, {
        text: "🧩 *Usage:*\n.antimedia [delete|warn|kick] [on|off]",
      }, { quoted: msg });

    if (!["delete", "warn", "kick"].includes(type))
      return sock.sendMessage(from, { text: "⚙️ Invalid mode type!" }, { quoted: msg });

    const mode = value === "on" ? type : "off";
    anti.setGroupMode(from, mode);

    await sock.sendMessage(from, {
      text: `✅ *AntiMedia ${mode === "off" ? "disabled" : "activated!"}*\n🔧 *Mode:* ${mode.toUpperCase()}`,
    }, { quoted: msg });
  } catch (err) {
    console.error("❌ .antimedia error:", err);
    await sock.sendMessage(from, { text: `⚠️ Error: ${err.message}` }, { quoted: msg });
  }
};
