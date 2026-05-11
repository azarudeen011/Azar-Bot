// ==============================================
// 👑 Azahrabot Staff Command (v6.7 Stable)
// Tags all current admins of the group
// Works for everyone • Accurate & Clean Output
// ==============================================

const secure = require("../lib/small_lib");

module.exports = async (sock, msg, from) => {
  try {
    // ✅ Must be used inside a group
    if (!from.endsWith("@g.us")) {
      return await sock.sendMessage(from, {
        text: "❌ This command can only be used in a group.",
      }, { quoted: msg });
    }

    // 🧠 Fetch group metadata
    const metadata = await sock.groupMetadata(from);
    const participants = metadata.participants || [];
    const groupName = metadata.subject || "this group";

    // 👑 Filter admins
    const admins = participants
      .filter(p => p.admin === "admin" || p.admin === "superadmin")
      .map(p => p.id);

    if (!admins.length) {
      return await sock.sendMessage(from, {
        text: "⚠️ No admins found in this group (weird but possible).",
      }, { quoted: msg });
    }

    // 🧾 Create a clean admin list
    const adminList = admins
      .map((a, i) => `${i + 1}. @${a.split("@")[0]}`)
      .join("\n");

    // 💬 Final formatted message
    const text = `
👑 *Admin Staff List — ${groupName}*
────────────────────
${adminList}
────────────────────
👥 *Total Admins:* ${admins.length}
> powered by *${secure.author || "AzarTech"}* ⚡
`.trim();

    // ✅ Send message with mentions (not a reply)
    await sock.sendMessage(from, {
      text,
      mentions: admins,
    });

  } catch (err) {
    console.error("❌ .staff error:", err);
    await sock.sendMessage(from, {
      text: `⚠️ Failed to list admins.\nError: ${err.message}`,
    }, { quoted: msg });
  }
};
