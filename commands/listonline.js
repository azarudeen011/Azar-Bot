// ==============================================
// 🟢 Azahrabot — Real Active Members (v2.0)
// Uses activityTracker.js for accurate presence
// ==============================================

const settings = require("../settings");
const { getActiveMembers } = require("../lib/activityTracker");

module.exports = async (sock, msg, from, text, args) => {
  try {
    if (!from.endsWith("@g.us")) {
      return await sock.sendMessage(from, { text: "❌ This command works only in groups." }, { quoted: msg });
    }

    const meta = await sock.groupMetadata(from);
    const sender = msg.key.participant || msg.key.remoteJid;
    const { isPairedOwner } = require("../lib/guards");
    const isOwner = await isPairedOwner(sock, msg);
    const isAdmin = meta.participants.some(p => (p.id === sender || p.lid === sender) && p.admin);

    if (!isAdmin && !isOwner) {
      return await sock.sendMessage(from, { text: "❌ Only admins can use this command." }, { quoted: msg });
    }

    const activeMembers = getActiveMembers(from, meta, 10); // last 10 minutes
    if (!activeMembers.length) {
      return await sock.sendMessage(from, { text: "📴 No one active recently." }, { quoted: msg });
    }

    const tagList = activeMembers.map((u) => `@${u.split("@")[0]}`).join("\n");
    const result = `
🟢 *Active Members*  
────────────────────
${tagList}
────────────────────
👥 *Total:* ${activeMembers.length}
> powered by *${settings.author || "AzarTech"}* ⚡
    `.trim();

    await sock.sendMessage(from, { text: result, mentions: activeMembers }, { quoted: msg });
  } catch (err) {
    console.error("❌ .listonline error:", err);
    await sock.sendMessage(from, { text: `⚠️ Error: ${err.message}` }, { quoted: msg });
  }
};
