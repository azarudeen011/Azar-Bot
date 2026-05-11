// ==============================================
// 🫥 Azahrabot HideTag Command (v6.4 Stable)
// Sends invisible message tagging all members
// Admins only + no reply to command
// ==============================================

const settings = require("../settings");
const secure = require("../lib/small_lib");

module.exports = async (sock, msg, from) => {
  try {
    // ✅ Must be in a group
    if (!from.endsWith("@g.us")) {
      return await sock.sendMessage(from, {
        text: "❌ This command can only be used inside a group.",
      }, { quoted: msg });
    }

    // 🧠 Fetch metadata
    const metadata = await sock.groupMetadata(from);
    const participants = metadata.participants || [];
    const sender = msg.key.participant || msg.key.remoteJid;

    // 👑 Admin check
    const admins = participants.filter(p => p.admin).map(p => p.id);
    const isAdmin = admins.includes(sender) || msg.key.fromMe;

    if (!isAdmin) {
      return await sock.sendMessage(from, {
        text: "❌ Only group admins can use this command.",
      }, { quoted: msg });
    }

    // 🫥 Invisible (blank) text — Unicode zero-width space
    const invisibleText = "‎".repeat(4000); // long enough for visibility but blank

    // 🧾 Build tag list
    const tagList = participants.map(p => p.id);

    // 🚀 Send blank text tagging all
    await sock.sendMessage(from, {
      text: invisibleText,
      mentions: tagList,
    });

  } catch (err) {
    console.error("❌ .hidetag error:", err);
    await sock.sendMessage(from, {
      text: `⚠️ Failed to send hidden tag.\nError: ${err.message}`,
    }, { quoted: msg });
  }
};
