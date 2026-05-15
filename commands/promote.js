// ==============================================
// 👑 Azahrabot Promote Command (v6.4 Stable)
// Promotes tagged/replied member to admin
// Admin-only + Interactive confirmation
// ==============================================

const settings = require("../settings");
const secure = require("../lib/small_lib");

module.exports = async (sock, msg, from) => {
  try {
    // ✅ Ensure it's a group
    if (!from.endsWith("@g.us")) {
      return await sock.sendMessage(from, {
        text: "❌ This command can only be used inside a group.",
      }, { quoted: msg });
    }

    // 🔐 Admin check (Manual 'AntiLink trick' for maximum stability)
    const { jidNormalizedUser } = require("@whiskeysockets/baileys");
    const sender = msg.key.participant || msg.key.remoteJid;
    const metadata = await sock.groupMetadata(from);
    const participants = metadata.participants || [];
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
      return await sock.sendMessage(from, { text: "❌ *ERROR:* I need to be an *Admin* to promote members!" }, { quoted: msg });
    }

    const senderNum = sender.split('@')[0].split(':')[0];
    const isSenderAdmin = participants.some(p => 
      (p.id.includes(senderNum) || (p.lid && p.lid === sender)) && 
      (p.admin === "admin" || p.admin === "superadmin" || !!p.admin)
    );

    const { isSudo } = require("../lib/guards");
    const isSudoUser = await isSudo(sock, msg);

    if (!isSenderAdmin && !isSudoUser) {
      return await sock.sendMessage(from, { text: "❌ Only group admins can promote members." }, { quoted: msg });
    }


    // 🧍 Identify target user (replied or mentioned)
    const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const target = mention || quoted;

    if (!target) {
      return await sock.sendMessage(from, {
        text: "👤 Please *mention or reply* to the user you want to promote.\n\nExample:\n.promote @user",
      }, { quoted: msg });
    }

    // 🏆 Promote member
    await sock.groupParticipantsUpdate(from, [target], "promote");

    // 💬 Interactive confirmation
    const text = `
🎉 *Member Promoted Successfully!*
────────────────────
👤 *User:* @${target.split("@")[0]}
👑 *Promoted By:* @${sender.split("@")[0]}
────────────────────
> powered by *${secure.author || "AzarTech"}* ⚡
`.trim();

    await sock.sendMessage(from, { text, mentions: [target, sender] }, { quoted: msg });

  } catch (err) {
    console.error("❌ .promote error:", err);
    await sock.sendMessage(from, {
      text: `⚠️ Failed to promote member.\nError: ${err.message}`,
    }, { quoted: msg });
  }
};
