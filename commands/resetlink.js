// ==============================================
// ♻️ Azahrabot ResetLink Command (v6.4 Stable)
// Regenerates a new group invite link (admins only)
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

    // 🧠 Fetch group metadata
    const metadata = await sock.groupMetadata(from);
    const participants = metadata.participants || [];
    const sender = msg.key.participant || msg.key.remoteJid;

    // 👑 Check admin permissions
    const admins = participants.filter(p => p.admin).map(p => p.id);
    const isAdmin = admins.includes(sender) || msg.key.fromMe;

    if (!isAdmin) {
      return await sock.sendMessage(from, {
        text: "❌ Only group admins can reset the group link.",
      }, { quoted: msg });
    }

    // ♻️ Reset group invite link
    const newCode = await sock.groupRevokeInvite(from).catch(() => null);
    if (!newCode) {
      return await sock.sendMessage(from, {
        text: "⚠️ Failed to reset group link. Make sure I'm an admin.",
      }, { quoted: msg });
    }

    // ✅ Construct and send new link
    const newLink = `https://chat.whatsapp.com/${newCode}`;

    const text = `
♻️ *Group Invite Link Reset Successfully!*
────────────────────
🔗 *New Link:* ${newLink}
👑 *By:* @${sender.split("@")[0]}
────────────────────
> powered by *${secure.author || "AzarTech"}* ⚡
`.trim();

    await sock.sendMessage(from, { text, mentions: [sender] }, { quoted: msg });

  } catch (err) {
    console.error("❌ .resetlink error:", err);
    await sock.sendMessage(from, {
      text: `⚠️ Failed to reset group link.\nError: ${err.message}`,
    }, { quoted: msg });
  }
};
