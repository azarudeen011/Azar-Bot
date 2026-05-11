// ==============================================
// ⚙️ Azahrabot Demote Command (v6.4 Stable)
// Demotes an admin back to member
// Admin-only + Interactive confirmation
// ==============================================

const settings = require("../settings");
const secure = require("../lib/small_lib");

module.exports = async (sock, msg, from) => {
  try {
    // ✅ Ensure it's used in a group
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
      return await sock.sendMessage(from, { text: "❌ *ERROR:* I need to be an *Admin* to demote members!" }, { quoted: msg });
    }

    const senderNum = sender.split('@')[0].split(':')[0];
    const isSenderAdmin = participants.some(p => 
      (p.id.includes(senderNum) || (p.lid && p.lid === sender)) && 
      (p.admin === "admin" || p.admin === "superadmin" || !!p.admin)
    );

    const { isPairedOwner } = require("../lib/guards");
    const isOwner = await isPairedOwner(sock, msg);

    if (!isSenderAdmin && !isOwner) {
      return await sock.sendMessage(from, { text: "❌ Only group admins can demote members." }, { quoted: msg });
    }

    // 👥 Identify target (replied or mentioned)
    const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const target = mention || quoted;

    if (!target) {
      return await sock.sendMessage(from, {
        text: "👤 Please *mention or reply* to the admin you want to demote.\n\nExample:\n.demote @user",
      }, { quoted: msg });
    }

    // 🛑 Prevent self-demotion of bot
    if (target === sock.user.id) {
      return await sock.sendMessage(from, {
        text: "⚠️ I can’t demote myself 😅",
      }, { quoted: msg });
    }

    // 🔧 Demote user
    await sock.groupParticipantsUpdate(from, [target], "demote");

    // 💬 Confirmation message
    const text = `
⚙️ *Member Demoted Successfully!*
────────────────────
👤 *User:* @${target.split("@")[0]}
⬇️ *Demoted By:* @${sender.split("@")[0]}
────────────────────
> powered by *${secure.author || "AzarTech"}* ⚡
`.trim();

    await sock.sendMessage(from, { text, mentions: [target, sender] }, { quoted: msg });

  } catch (err) {
    console.error("❌ .demote error:", err);
    await sock.sendMessage(from, {
      text: `⚠️ Failed to demote member.\nError: ${err.message}`,
    }, { quoted: msg });
  }
};
