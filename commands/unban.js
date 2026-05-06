// ==============================================
// 🔓 Azahrabot Unban Command (Block Specific Admin)
// ==============================================

const { removeBan, isBanned } = require("../lib/banManager");
const settings = require("../settings");

// 🚫 JID blocked from using ban/unban
const BLOCKED_BAN_USER = "18718037917841@lid";

module.exports = async (sock, msg, from) => {
  try {

    if (!from.endsWith("@g.us"))
      return sock.sendMessage(from, {
        text: "❌ This command can only be used in groups."
      });

    const sender = msg.key.participant || msg.key.remoteJid;

    // ⭐ BLOCK THIS ADMIN
    if (sender === BLOCKED_BAN_USER)
      return sock.sendMessage(from, {
        text: "🚫 You are not allowed to use unban command."
      }, { quoted: msg });

    const { isPairedOwner } = require("../lib/guards");

    // 🧩 Fetch admins
    const metadata = await sock.groupMetadata(from);
    const admins = metadata.participants.filter(p => p.admin).map(p => p.id);
    const isAdmin = admins.includes(sender) || (await isPairedOwner(sock, msg));

    if (!isAdmin)
      return sock.sendMessage(from, {
        text: "❌ Only admins or the bot owner can use this command."
      }, { quoted: msg });

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const target = mentioned[0] || msg.message?.extendedTextMessage?.contextInfo?.participant;

    if (!target)
      return sock.sendMessage(from, {
        text: "⚠️ Tag or reply to the user you want to unban."
      }, { quoted: msg });

    if (!isBanned(target))
      return sock.sendMessage(from, {
        text: `✅ @${target.split("@")[0]} is not banned.`,
        mentions: [target],
      }, { quoted: msg });

    removeBan(target);

    await sock.sendMessage(from, {
      text: `🔓 User @${target.split("@")[0]} has been *unbanned successfully!* 🎉`,
      mentions: [target],
    }, { quoted: msg });

  } catch (err) {
    console.error("❌ Unban Command Error:", err);
    await sock.sendMessage(from, {
      text: `⚠️ Failed to unban user: ${err.message}`
    }, { quoted: msg });
  }
};