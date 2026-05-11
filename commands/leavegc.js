// =============================================
// 🚪 Azahrabot .leavegc — Safe Self-Leave (v6.1 Final)
// User leaves instantly • No bot self-kick • Baileys v6 safe
// =============================================

const { jidNormalizedUser } = require("@whiskeysockets/baileys");

module.exports = async (sock, msg, from) => {
  try {
    // 🚫 Must be inside a group
    if (!from.endsWith("@g.us")) {
      return await sock.sendMessage(from, {
        text: "⚠️ This command only works inside group chats."
      });
    }

    // 🧠 Normalized JIDs (safe for Baileys v6)
    const sender = jidNormalizedUser(
      msg.key.participant || msg.key.remoteJid
    );

    const botJid = jidNormalizedUser(sock.user.id);

    // 🛑 Don't allow bot to leave itself
    if (sender === botJid) {
      return await sock.sendMessage(from, {
        text: "😅 Bro I can't leave a group by kicking myself."
      });
    }

    // 🗣 Announce exit
    await sock.sendMessage(from, {
      text: `👋 *@${sender.split("@")[0]}* has chosen to leave this group.`,
      mentions: [sender],
    });

    // ⏳ Natural delay
    await new Promise(res => setTimeout(res, 1800));

    // 🚪 Kick the sender (self-leave)
    await sock.groupParticipantsUpdate(from, [sender], "remove");

    console.log(`📤 User ${sender} left: ${from}`);

  } catch (err) {
    console.error("❌ .leavegc error:", err);
    await sock.sendMessage(from, {
      text: `⚠️ Couldn't remove user.\n${err.message || err}`
    });
  }
};
