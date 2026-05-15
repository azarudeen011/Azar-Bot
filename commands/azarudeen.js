// =============================================
// 📣 Azahrabot .azarudeen — Silent TagAll
// One clickable-look text • Admin-only • Silent Menions
// =============================================

const settings = require("../settings");

module.exports = async (sock, msg, from) => {
  try {
    // ✅ Must be in a group
    if (!from.endsWith("@g.us")) {
      return await sock.sendMessage(from, { text: "⚠️ This command only works in groups." });
    }

    // 🧠 Fetch group metadata and participants
    const metadata = await sock.groupMetadata(from);
    const participants = metadata?.participants || [];
    const allIds = participants.map(p => p.id);

    // 👑 check privileges
    const sender = msg.key.participant || msg.key.remoteJid || "";
    const { isSudo } = require("../lib/guards");
    const isSudoUser = await isSudo(sock, msg);
    const isAdmin = participants.some(p => (p.id === sender || p.lid === sender) && p.admin) || isSudoUser || msg.key.fromMe;
    
    if (!isAdmin) {
      return await sock.sendMessage(from, {
        text: "❌ Only group admins can use this command."
      });
    }

    // 💬 Send the exact requested visible text, while secretly tagging everyone
    await sock.sendMessage(from, {
      text: `@azarudeen`,
      mentions: [...allIds]
    });

  } catch (err) {
    console.error("❌ .azarudeen error:", err);
    await sock.sendMessage(from, {
      text: "⚠️ Failed to tag members."
    });
  }
};
