// ==============================================
// 🔨 Azahrabot Ban Command (Block Specific Admin)
// ==============================================

const { addBan } = require("../lib/banManager");
const settings = require("../settings");

// 🚫 JID blocked from using ban/unban
const BLOCKED_BAN_USER = "18718037917841@lid";

module.exports = async (sock, msg, from) => {
  try {

    if (!from.endsWith("@g.us"))
      return sock.sendMessage(from, { text: "❌ This command can only be used in groups." });

    const sender = msg.key.participant || msg.key.remoteJid;

    // ⭐ BLOCK THIS ADMIN
    if (sender === BLOCKED_BAN_USER)
      return sock.sendMessage(from, {
        text: "🚫 You are not allowed to use ban command."
      }, { quoted: msg });

    const { isPairedOwner } = require("../lib/guards");
    const ownerJid = settings.ownerNumber.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
    const ownerLid = settings.ownerLid || "";

    // 🧩 Fetch admin list
    const metadata = await sock.groupMetadata(from);
    const admins = metadata.participants.filter(p => p.admin).map(p => p.id);
    const isAdmin = admins.includes(sender) || isPairedOwner(msg);

    if (!isAdmin)
      return sock.sendMessage(from, {
        text: "❌ Only admins or the bot owner can use this command."
      }, { quoted: msg });

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target = mentioned[0] || msg.message?.extendedTextMessage?.contextInfo?.participant;

    if (!target)
      return sock.sendMessage(from, {
        text: "⚠️ Tag or reply to the user you want to ban."
      }, { quoted: msg });

    if (target === ownerJid || target === ownerLid)
      return sock.sendMessage(from, {
        text: "😎 You can’t ban the bot owner."
      }, { quoted: msg });

    addBan(target);

    await sock.sendMessage(from, {
      text: `🚫 User @${target.split("@")[0]} has been *banned* successfully!`,
      mentions: [target],
    });

  } catch (err) {
    console.error("❌ Ban Command Error:", err);
    await sock.sendMessage(from, {
      text: `⚠️ Failed to ban user: ${err.message}`
    }, { quoted: msg });
  }
};