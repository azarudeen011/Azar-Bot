// ==============================================
// 🧩 Azahrabot AntiMention Command
// Admin-only configuration (delete / warn / kick / off)
// ==============================================

const anti = require("../lib/small_lib/anti/antimention");

module.exports = async (sock, msg, from, text, args) => {
  try {
    if (!from.endsWith("@g.us")) {
      return sock.sendMessage(from, { text: "❌ Use this command inside a group." }, { quoted: msg });
    }

    const metadata = await sock.groupMetadata(from);
    const participants = metadata.participants || [];
    const sender = msg.key.participant || msg.key.remoteJid;
    const admins = participants.filter(p => p.admin).map(p => p.id);
    const isAdmin = admins.includes(sender) || msg.key.fromMe;

    if (!isAdmin)
      return sock.sendMessage(from, { text: "❌ Only group admins can control AntiMention." }, { quoted: msg });

    const mode = args[0]?.toLowerCase();
    const state = args[1]?.toLowerCase();

    if (!["delete", "warn", "kick"].includes(mode))
      return sock.sendMessage(from, {
        text: "⚙️ Usage:\n.antimention delete on\n.antimention warn on\n.antimention kick on",
      }, { quoted: msg });

    if (["on", "off"].includes(state)) {
      anti.setGroupMode(from, "antimention", state === "on" ? mode : "off");
      await sock.sendMessage(from, {
        text: `✅ AntiMention ${state === "on" ? `*enabled* (${mode})` : "*disabled*"} successfully.`,
      }, { quoted: msg });
    } else {
      await sock.sendMessage(from, {
        text: "⚙️ Usage:\n.antimention delete on/off\n.antimention warn on/off\n.antimention kick on/off",
      }, { quoted: msg });
    }
  } catch (err) {
    console.error("❌ .antimention error:", err);
    await sock.sendMessage(from, { text: `⚠️ Error: ${err.message}` }, { quoted: msg });
  }
};
