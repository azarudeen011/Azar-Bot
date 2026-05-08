// =============================================
// 🔗 Azahrabot .invite — Group Invite Link Command
// Admins & Paired Owner Only • Clean & Secure
// =============================================

const settings = require("../settings");

module.exports = async (sock, msg, from) => {
  try {
    if (!from.endsWith("@g.us")) {
      return await sock.sendMessage(from, {
        text: "⚠️ This command only works in groups."
      });
    }

    const metadata = await sock.groupMetadata(from);
    const participants = metadata?.participants || [];
    const sender = msg.key.participant || msg.key.remoteJid || "";
    const { isPairedOwner } = require("../lib/guards");
    const isOwner = await isPairedOwner(sock, msg);
    const isAdmin = participants.some(p => (p.id === sender || p.lid === sender) && p.admin);

    if (!isAdmin && !isOwner) {
      return await sock.sendMessage(from, {
        text: "❌ Only group admins can run this command."
      });
    }

    // Fetch invite link safely
    const inviteCode = await sock.groupInviteCode(from).catch(() => null);

    if (!inviteCode) {
      return await sock.sendMessage(from, {
        text: "⚠️ Cannot fetch invite link — maybe the group owner disabled it.",
      });
    }

    const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;

    const text = `
🔗 *Group Invite Link Created!*
━━━━━━━━━━━━━━━━━━━
👥 *Group:* ${metadata.subject || "Unnamed Group"}
🧠 *Requested by:* @${sender.split("@")[0]}
📎 *Invite Link:* ${inviteLink}
━━━━━━━━━━━━━━━━━━━
> powered by Azahra ⚡
    `.trim();

    await sock.sendMessage(from, {
      text,
      mentions: [sender],
      contextInfo: {
        externalAdReply: {
          title: `${metadata.subject}`,
          body: "Tap to join or share this invite link.",
          mediaType: 1,
          sourceUrl: inviteLink,
        }
      }
    });

  } catch (err) {
    console.error("❌ .invite error:", err);
    await sock.sendMessage(from, {
      text: `⚠️ Failed to generate invite link.\n${err.message || err}`
    });
  }
};
