// ==============================================
// 🔗 Azahrabot LinkGC Command (v6.4 Stable)
// Fetches current group invite link (admins only)
// ==============================================

const settings = require("../settings");
const secure = require("../lib/small_lib");

module.exports = async (sock, msg, from) => {
  try {
    // ✅ Ensure command used in group
    if (!from.endsWith("@g.us")) {
      return await sock.sendMessage(from, {
        text: "❌ This command can only be used in a group.",
      }, { quoted: msg });
    }

    // 🧠 Fetch metadata
    const metadata = await sock.groupMetadata(from);
    const participants = metadata.participants || [];
    const sender = msg.key.participant || msg.key.remoteJid;
    const admins = participants.filter(p => p.admin).map(p => p.id);
    const isAdmin = admins.includes(sender) || msg.key.fromMe;

    // ❌ Only admins can get the group link
    if (!isAdmin) {
      return await sock.sendMessage(from, {
        text: "❌ Only group admins can get the group link.",
      }, { quoted: msg });
    }

    // 🔗 Fetch group invite code
    const inviteCode = await sock.groupInviteCode(from).catch(() => null);

    if (!inviteCode) {
      return await sock.sendMessage(from, {
        text: "⚠️ Unable to fetch group link. The group might be invite-only or I’m not admin.",
      }, { quoted: msg });
    }

    // ✅ Construct link
    const link = `https://chat.whatsapp.com/${inviteCode}`;

    const text = `
🔗 *Group Invite Link — ${metadata.subject || "This Group"}*
────────────────────
📎 *Link:* ${link}
👑 *Requested by:* @${sender.split("@")[0]}
────────────────────
> powered by *${secure.author || "AzarTech"}* ⚡
`.trim();

    await sock.sendMessage(from, { text, mentions: [sender] }, { quoted: msg });

  } catch (err) {
    console.error("❌ .linkgc error:", err);
    await sock.sendMessage(from, {
      text: `⚠️ Failed to get group link.\nError: ${err.message}`,
    }, { quoted: msg });
  }
};
