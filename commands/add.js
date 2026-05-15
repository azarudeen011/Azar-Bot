// ==============================================
// 👥 Azahrabot Add Command (v5.0 Secure Edition)
// Admin / Paired Owner (if admin) only
// ==============================================

const { canRunAdminCommand } = require("../lib/guards");

module.exports = async (sock, msg, from, text, args) => {
  try {
    // ✅ Must be a group
    if (!from.endsWith("@g.us"))
      return sock.sendMessage(from, { text: "❗ This command can only be used in groups." }, { quoted: msg });

    // 🔐 Admin check (Manual 'AntiLink trick' for maximum stability)
    const { jidNormalizedUser } = require("@whiskeysockets/baileys");
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
    const isBotAdmin = me ? (me.admin === "admin" || me.admin === "superadmin" || !!me.admin) : true;

    if (!isBotAdmin) {
      return sock.sendMessage(from, { text: "❌ *ERROR:* I need to be a *Group Admin* to add members!" }, { quoted: msg });
    }

    const senderNum = sender.split('@')[0].split(':')[0];
    const isSenderAdmin = participants.some(p => 
      (p.id.includes(senderNum) || (p.lid && p.lid === sender)) && 
      (p.admin === "admin" || p.admin === "superadmin" || !!p.admin)
    );

    const { isSudo } = require("../lib/guards");
    const isSudoUser = await isSudo(sock, msg);

    if (!isSenderAdmin && !isSudoUser) {
      return sock.sendMessage(from, { text: "❌ Only group admins can add members." }, { quoted: msg });
    }

    // ✅ Parse number or tag
    let input = args[0] || "";
    if (!input)
      return sock.sendMessage(from, { text: "📲 *Usage:* .add <number or tag>\n\nExample:\n.add 919876543210\n.add @user" }, { quoted: msg });

    // Clean input
    input = input.replace(/[^0-9]/g, ""); // strip non-numeric
    if (input.length < 8)
      return sock.sendMessage(from, { text: "⚠️ Invalid number. Try again with full country code." }, { quoted: msg });

    const jid = `${input}@s.whatsapp.net`;

    // 🔍 Check if already a member
    const meta = await sock.groupMetadata(from);
    const already = meta.participants.find(p => p.id === jid);
    if (already)
      return sock.sendMessage(from, { text: "✅ That user is already a member of this group." }, { quoted: msg });

    // 🚀 Try to add member
    await sock.groupParticipantsUpdate(from, [jid], "add");
    await sock.sendMessage(from, { text: `✅ Added @${input}`, mentions: [jid] }, { quoted: msg });

  } catch (err) {
    console.error("❌ .add error:", err.message);
    let errorMsg = "⚠️ Failed to add member. This could be because:\n";
    errorMsg += "- The number isn’t on WhatsApp\n";
    errorMsg += "- The user has privacy restrictions\n";
    errorMsg += "- The bot isn’t an admin\n";
    await sock.sendMessage(from, { text: errorMsg }, { quoted: msg });
  }
};
