// ==============================================
// ⚙️ Azahrabot PromoteAll Command (v6.5 Stable)
// Promotes multiple mentioned users to admin
// Admin-only • Safe Execution • Interactive Summary
// ==============================================

const settings = require("../settings");
const secure = require("../lib/small_lib");

module.exports = async (sock, msg, from) => {
  try {
    // ✅ Ensure command is used in a group
    if (!from.endsWith("@g.us")) {
      return await sock.sendMessage(from, {
        text: "❌ This command can only be used inside a group.",
      }, { quoted: msg });
    }

    // 🧠 Fetch group data
    const metadata = await sock.groupMetadata(from);
    const participants = metadata.participants || [];
    const sender = msg.key.participant || msg.key.remoteJid;

    // 👑 Verify admin privileges
    const admins = participants.filter(p => p.admin).map(p => p.id);
    const isAdmin = admins.includes(sender) || msg.key.fromMe;
    if (!isAdmin) {
      return await sock.sendMessage(from, {
        text: "❌ Only group admins can use this command.",
      }, { quoted: msg });
    }

    // 👥 Get mentioned users
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!mentioned.length) {
      return await sock.sendMessage(from, {
        text: "👤 Please *mention one or more* members to promote.\n\nExample:\n.promoteall @user1 @user2",
      }, { quoted: msg });
    }

    // 🧩 Filter out current admins or bot itself
    const botJid = sock.user?.id;
    const toPromote = mentioned.filter(id => !admins.includes(id) && id !== botJid);

    if (!toPromote.length) {
      return await sock.sendMessage(from, {
        text: "⚠️ All mentioned users are already admins or invalid.",
      }, { quoted: msg });
    }

    // 🚀 Promote users with delay
    const results = [];
    for (const user of toPromote) {
      try {
        await sock.groupParticipantsUpdate(from, [user], "promote");
        results.push(`✅ @${user.split("@")[0]}`);
        await new Promise(res => setTimeout(res, 800)); // prevent rate-limit ban
      } catch {
        results.push(`❌ @${user.split("@")[0]}`);
      }
    }

    // 🧾 Confirmation summary
    const text = `
⬆️ *PromoteAll Command Executed!*
────────────────────
👑 *By:* @${sender.split("@")[0]}
🧾 *Results:*
${results.join("\n")}
────────────────────
> powered by *${secure.author || "AzarTech"}* ⚡
`.trim();

    await sock.sendMessage(from, { text, mentions: [sender, ...toPromote] }, { quoted: msg });

  } catch (err) {
    console.error("❌ .promoteall error:", err);
    await sock.sendMessage(from, {
      text: `⚠️ Failed to promote users.\nError: ${err.message}`,
    }, { quoted: msg });
  }
};
