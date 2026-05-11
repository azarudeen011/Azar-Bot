// ==============================================
// 🔒 Azahrabot LockGC Command (v6.4 Stable)
// Mutes group (admins only) — Safe & Confirmed
// ==============================================

const settings = require("../settings");
const secure = require("../lib/small_lib");

module.exports = async (sock, msg, from) => {
  try {
    // ✅ Ensure command is in a group
    if (!from.endsWith("@g.us")) {
      return await sock.sendMessage(from, {
        text: "❌ This command can only be used in a group.",
      }, { quoted: msg });
    }

    // 🧠 Fetch group metadata
    const metadata = await sock.groupMetadata(from);
    const participants = metadata.participants || [];
    const sender = msg.key.participant || msg.key.remoteJid;

    // 👑 Verify admin access
    const admins = participants.filter(p => p.admin).map(p => p.id);
    const isAdmin = admins.includes(sender) || msg.key.fromMe;
    if (!isAdmin) {
      return await sock.sendMessage(from, {
        text: "❌ Only group admins can lock the group.",
      }, { quoted: msg });
    }

    // 🔒 Lock the group (set to admin-only)
    await sock.groupSettingUpdate(from, "announcement");

    // ✅ Confirmation message
    const text = `
🔒 *Group Locked Successfully!*
────────────────────
📢 *Chat Mode:* Admins Only
👑 *By:* @${sender.split("@")[0]}
────────────────────
> powered by *${secure.author || "AzarTech"}* ⚡
`.trim();

    await sock.sendMessage(from, {
      text,
      mentions: [sender],
    }, { quoted: msg });

  } catch (err) {
    console.error("❌ .lockgc error:", err);
    await sock.sendMessage(from, {
      text: `⚠️ Failed to lock the group.\nError: ${err.message}`,
    }, { quoted: msg });
  }
};
