// ==============================================
// 🦵 Azahrabot Kick Command (v5.2 Ultra Stable)
// Baileys v6 Safe • Anti Self-Kick • Admin Only
// ==============================================

const { canRunAdminCommand } = require("../lib/guards");
const { jidNormalizedUser } = require("@whiskeysockets/baileys");

module.exports = async (sock, msg, from, text, args) => {
  try {
    if (!from.endsWith("@g.us")) {
      return sock.sendMessage(from, { text: "❗ This command only works in groups." }, { quoted: msg });
    }

    // 🔐 Admin check (Manual 'AntiLink trick' for maximum stability)
    const metadata = await sock.groupMetadata(from);
    const participants = metadata.participants || [];
    const sender = msg.key.participant || msg.key.remoteJid;
    const botId = jidNormalizedUser(sock.user.id);

    // 🕵️ Find the bot in participants list
    const me = participants.find(p =>
      jidNormalizedUser(p.id) === botId ||
      p.id.includes(botId.split('@')[0]) ||
      (p.lid && p.lid === botId)
    );

    // 🛡️ Permissive check: If we can't find the bot in metadata, assume it MIGHT be admin
    // This handles cases where groupMetadata is stale/incomplete.
    const isBotAdmin = me ? (me.admin === "admin" || me.admin === "superadmin" || !!me.admin) : true;

    if (!isBotAdmin) {
      return sock.sendMessage(from, { text: "❌ *ERROR:* I need to be a *Group Admin* to kick members!" }, { quoted: msg });
    }

    const senderNum = sender.split('@')[0].split(':')[0];
    const isSenderAdmin = participants.some(p =>
      (p.id.includes(senderNum) || (p.lid && p.lid === sender)) &&
      (p.admin === "admin" || p.admin === "superadmin" || !!p.admin)
    );

    const { isSudo } = require("../lib/guards");
    const isOwner = await isSudo(sock, msg);

    if (!isSenderAdmin && !isOwner) {
      return sock.sendMessage(from, { text: "❌ Only group admins can run this command." }, { quoted: msg });
    }
    const ctx = msg.message?.extendedTextMessage?.contextInfo || {};
    const mentioned = ctx.mentionedJid || [];
    const quoted = ctx.participant || null;

    let targets = [];

    if (mentioned.length) targets = mentioned;
    else if (quoted) targets = [quoted];
    else if (args[0]) {
      const num = args[0].replace(/[^0-9]/g, "");
      if (num.length < 8) {
        return sock.sendMessage(from, { text: "⚠️ Invalid number. Use `.kick @user` or reply to a message." }, { quoted: msg });
      }
      targets = [`${num}@s.whatsapp.net`];
    }

    if (!targets.length) {
      return sock.sendMessage(from, { text: "❗ Mention or reply to the member you want to remove." }, { quoted: msg });
    }

    // 🛑 Prevent bot from kicking itself
    const botJid = jidNormalizedUser(sock.user.id);
    targets = targets.filter(jid => jidNormalizedUser(jid) !== botJid);

    if (!targets.length) {
      return sock.sendMessage(from, { text: "⚠️ I can't kick myself, bro 😭" }, { quoted: msg });
    }

    // 🚀 Remove each target
    for (const jid of targets) {
      try {
        const normalizedJid = jidNormalizedUser(jid);
        await sock.groupParticipantsUpdate(from, [normalizedJid], "remove");

        await sock.sendMessage(from, {
          text: `✅ Removed @${jid.split("@")[0]}`,
          mentions: [jid]
        }, { quoted: msg });

      } catch (err) {
        console.error(`Kick failed for ${jid}:`, err.message);

        await sock.sendMessage(from, {
          text: `⚠️ Couldn't remove @${jid.split("@")[0]} — maybe they already left or have privacy lock.`,
          mentions: [jid]
        }, { quoted: msg });
      }
    }

  } catch (err) {
    console.error(".kick error:", err);
    await sock.sendMessage(from, { text: "⚠️ Kick failed. Make sure I have admin rights." }, { quoted: msg });
  }
};
