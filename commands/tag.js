// ==============================================
// 🏷️ Azahrabot Tag Command (v8.0 — Reply + Text Support)
// Tags all members using:
// • .tag <text>
// • Reply to a message → tags with that text
// Admin-only • Emoji-safe • No bugs
// ==============================================

const settings = require("../settings");
const secure = require("../lib/small_lib");

module.exports = async (sock, msg, from, text, args) => {
  try {
    // 🚫 Only works in groups
    if (!from.endsWith("@g.us")) {
      return await sock.sendMessage(from, { 
        text: "❌ This command only works in groups." 
      }, { quoted: msg });
    }

    // 🧠 Load metadata
    const meta = await sock.groupMetadata(from);
    const participants = meta.participants || [];

    // 👑 Admin check
    const sender = msg.key.participant || msg.key.remoteJid;
    const admins = participants.filter(p => p.admin).map(p => p.id);
    const isAdmin = admins.includes(sender) || msg.key.fromMe;

    if (!isAdmin) {
      return await sock.sendMessage(from, { 
        text: "❌ Only group admins can use `.tag`." 
      }, { quoted: msg });
    }

    // -----------------------------------------
    // 📝 1️⃣ Extract text from command
    // -----------------------------------------
    let tagText = args.join(" ").trim();

    // -----------------------------------------
    // 📝 2️⃣ If no text → check if replying
    // -----------------------------------------
    const reply = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const replyText =
      reply?.conversation ||
      reply?.extendedTextMessage?.text ||
      reply?.imageMessage?.caption ||
      reply?.videoMessage?.caption ||
      null;

    if (!tagText && replyText) {
      tagText = replyText.trim();
    }

    // -----------------------------------------
    // 📝 3️⃣ If still empty → show usage
    // -----------------------------------------
    if (!tagText) {
      return await sock.sendMessage(from, {
        text: "💬 Usage:\n• *.tag Hello guys*\n• Reply to a message → *.tag*"
      }, { quoted: msg });
    }

    // 👥 Build mention list
    const mentionList = participants.map(p => p.id);

    // 🚀 Send message with tags
    await sock.sendMessage(from, {
      text: tagText,
      mentions: mentionList,
    });

  } catch (err) {
    console.error("❌ .tag error:", err);
    await sock.sendMessage(from, { 
      text: `⚠️ Failed to tag members.\n${err.message}` 
    }, { quoted: msg });
  }
};
