// commands/antireset.js
// usage: .antireset @user  OR .antireset all

const antilink = require("../lib/small_lib/anti/antilink");
const settings = require("../settings");

module.exports = async (sock, msg, from, text, args) => {
  try {
    // must be in group
    if (!from.endsWith("@g.us")) {
      return await sock.sendMessage(from, { text: "❗ Use this command in a group." }, { quoted: msg });
    }

    // admin check: only admins can reset warns
    const metadata = await sock.groupMetadata(from);
    const participants = metadata.participants || [];
    const sender = msg.key.participant || msg.key.remoteJid;
    const admins = participants.filter(p => p.admin).map(p => p.id);
    const isAdmin = admins.includes(sender) || msg.key.fromMe;
    if (!isAdmin) {
      return await sock.sendMessage(from, { text: "❌ Only group admins can reset warns." }, { quoted: msg });
    }

    // target detection: mention or reply or "all"
    const mentioned = (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) || [];
    const reply = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
      ? (msg.message.extendedTextMessage.contextInfo.participant || null)
      : null;

    if (args[0] && args[0].toLowerCase() === "all") {
      antilink.resetWarns(from, null);
      return await sock.sendMessage(from, { text: "✅ All warns reset for this group." }, { quoted: msg });
    }

    let target = null;
    if (mentioned.length) target = mentioned[0];
    else if (reply) target = reply;
    else if (args[0]) {
      // try parse bare number to jid
      const num = args[0].replace(/\D/g, "");
      if (num) target = `${num}@s.whatsapp.net`;
    }

    if (!target) {
      return await sock.sendMessage(from, { text: "❗ Reply to a user or mention them or use `.antireset all`." }, { quoted: msg });
    }

    antilink.resetWarns(from, target);
    await sock.sendMessage(from, {
      text: `✅ Warnings Reset Successfully!\n\n👤 Mention: @${target.split("@")[0]}\n> powered by AzarTech ⚡`,
      mentions: [target],
    }, { quoted: msg });

  } catch (err) {
    console.error(".antireset error:", err);
    await sock.sendMessage(from, { text: `⚠️ Failed to reset: ${err.message}` }, { quoted: msg });
  }
};
