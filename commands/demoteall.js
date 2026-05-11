// ==============================================
// ⬇️ Azahrabot DemoteAll Command (v6.8 Final Fix)
// Fixes mismatched bot JID + verified live admin status
// ==============================================

const settings = require("../settings");
const secure = require("../lib/small_lib");
const { jidNormalizedUser } = require("@whiskeysockets/baileys"); // ✅ normalize JID

module.exports = async (sock, msg, from) => {
  try {
    // ✅ Must be used inside a group
    if (!from.endsWith("@g.us")) {
      return await sock.sendMessage(from, {
        text: "❌ This command can only be used inside a group.",
      }, { quoted: msg });
    }

    // 🧠 Fetch live group metadata
    const metadata = await sock.groupMetadata(from);
    const participants = metadata.participants || [];
    const sender = msg.key.participant || msg.key.remoteJid;

    // 🧩 Normalize bot JID properly
    const botJid = jidNormalizedUser(sock.user.id);

    // 👑 Find all admins including creator
    const admins = participants
      .filter(p => ["admin", "superadmin"].includes(p.admin))
      .map(p => p.id);

    // 🔐 Check permissions
    const isBotAdmin = admins.includes(botJid);
    const isAdmin = admins.includes(sender) || msg.key.fromMe;

    if (!isAdmin) {
      return await sock.sendMessage(from, {
        text: "❌ Only group admins can use this command.",
      }, { quoted: msg });
    }

    if (!isBotAdmin) {
      return await sock.sendMessage(from, {
        text: "⚠️ I need admin rights to demote members.",
      }, { quoted: msg });
    }

    // 👥 Targets from mentions or reply
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const quotedUser = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const targets = [...new Set([...mentioned, quotedUser].filter(Boolean))];

    if (!targets.length) {
      return await sock.sendMessage(from, {
        text: "👤 Please *mention or reply* to one or more admins to demote.\n\nExample:\n.demoteall @admin1 @admin2",
      }, { quoted: msg });
    }

    // 🧩 Filter out valid admins only
    const validTargets = targets.filter(id => admins.includes(id) && id !== botJid);

    if (!validTargets.length) {
      return await sock.sendMessage(from, {
        text: "⚠️ None of the mentioned users are current admins or valid targets.",
      }, { quoted: msg });
    }

    // ⚙️ Demote each one safely
    const results = [];
    for (const user of validTargets) {
      try {
        await sock.groupParticipantsUpdate(from, [user], "demote");
        results.push(`✅ @${user.split("@")[0]}`);
        await new Promise(r => setTimeout(r, 800)); // prevent flood-ban
      } catch {
        results.push(`❌ @${user.split("@")[0]}`);
      }
    }

    // 💬 Final response
    const text = `
⬇️ *DemoteAll Executed Successfully!*
────────────────────
👑 *By:* @${sender.split("@")[0]}
🧾 *Results:*
${results.join("\n")}
────────────────────
> powered by *${secure.author || "AzarTech"}* ⚡
`.trim();

    await sock.sendMessage(from, {
      text,
      mentions: [sender, ...validTargets],
    }, { quoted: msg });

  } catch (err) {
    console.error("❌ .demoteall error:", err);
    await sock.sendMessage(from, {
      text: `⚠️ Failed to demote admins.\nError: ${err.message}`,
    }, { quoted: msg });
  }
};
