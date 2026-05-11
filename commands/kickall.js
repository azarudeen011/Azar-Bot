// ==============================================
// 🦵 Azahrabot KickAll Command (v6.6 Ultra Stable)
// Safe Kick • No Self-Kick • No Admin Kick • Baileys v6 Ready
// ==============================================

const secure = require("../lib/small_lib");
const { jidNormalizedUser } = require("@whiskeysockets/baileys");

module.exports = async (sock, msg, from) => {
  try {
    // 🚫 Must be used in group
    if (!from.endsWith("@g.us")) {
      return await sock.sendMessage(from, {
        text: "❌ This command works only in groups.",
      }, { quoted: msg });
    }

    // 🧠 Fetch metadata
    const meta = await sock.groupMetadata(from);
    const participants = meta.participants || [];
    const sender = jidNormalizedUser(msg.key.participant || msg.key.remoteJid);

    // 👑 Detect all admins (normalized)
    const admins = participants
      .filter(p => ["admin", "superadmin"].includes(p.admin))
      .map(p => jidNormalizedUser(p.id));

    const groupOwner = jidNormalizedUser(
      meta.owner || participants.find(p => p.admin === "superadmin")?.id
    );

    // 🔐 Check if sender is admin
    const isAdmin = admins.includes(sender) || msg.key.fromMe;
    if (!isAdmin) {
      return await sock.sendMessage(from, {
        text: "❌ Only admins can use .kickall",
      }, { quoted: msg });
    }

    // 👥 Collect mentions
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!mentioned.length) {
      return await sock.sendMessage(from, {
        text: "👥 Mention multiple users:\n.kickall @user1 @user2",
      }, { quoted: msg });
    }

    // 🤖 Bot JID normalized
    const botJid = jidNormalizedUser(sock.user.id);

    // 🧹 Filter invalid targets
    const toKick = mentioned
      .map(jid => jidNormalizedUser(jid))
      .filter(jid =>
        jid !== botJid &&          // don't kick bot
        jid !== groupOwner &&      // don't kick owner
        !admins.includes(jid)      // don't kick admins
      );

    if (!toKick.length) {
      return await sock.sendMessage(from, {
        text: "⚠️ No valid users to kick (admins/owner/bot excluded).",
      }, { quoted: msg });
    }

    const results = [];

    // 🔥 Kick one by one
    for (const user of toKick) {
      try {
        await sock.groupParticipantsUpdate(from, [user], "remove");
        results.push(`✅ @${user.split("@")[0]}`);
        await new Promise(r => setTimeout(r, 800)); // prevent rate-limit
      } catch {
        results.push(`❌ @${user.split("@")[0]}`);
      }
    }

    // 📩 Final summary
    const summary = results.join("\n");
    const text = `
🚫 *KickAll Executed!*
────────────────────
👑 *By:* @${sender.split("@")[0]}
🧾 *Results:*
${summary}
────────────────────
> powered by *${secure.author || "AzarTech"}* ⚡
`.trim();

    await sock.sendMessage(from, {
      text,
      mentions: [sender, ...toKick],
    }, { quoted: msg });

  } catch (err) {
    console.error("❌ .kickall error:", err);
    await sock.sendMessage(from, {
      text: `⚠️ KickAll failed: ${err.message}`,
    }, { quoted: msg });
  }
};
