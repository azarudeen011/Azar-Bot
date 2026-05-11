// ==============================================
// 👑 Azahrabot Owner Command (v6.4 — Banner + Native Channel Button)
// Clean Banner • Native “View Channel” Button (Mobile + Desktop)
// ==============================================

const secure = require("../lib/small_lib");

module.exports = async (sock, msg, from) => {
  try {
    await sock.sendMessage(from, { react: { text: "👑", key: msg.key } }).catch(() => {});
  } catch (e) {
    console.log("Reaction failed:", e?.message || e);
  }

  const { ownerName, ownerNumber, botName, author, channel, banner } = secure;
  const prefix = ".";
  const version = "6.4";

  // 📇 vCard
  const vcard = `
BEGIN:VCARD
VERSION:3.0
FN:${ownerName}
TEL;type=CELL;type=VOICE;waid=${ownerNumber}:+${ownerNumber}
END:VCARD
  `.trim();

  // 🧾 Owner Info
  const caption = `
👑 ${ownerName} — Official Owner
━━━━━━━━━━━━━━━━━━━
🤖 Bot: ${botName}
📱 Number: wa.me/${ownerNumber}
⚙️ Prefix: ${prefix}
💫 Version: ${version}
━━━━━━━━━━━━━━━━━━━
> Powered by ${author} ⚡
`.trim();

  try {
    // Step 1️⃣: Send contact first
    await sock.sendMessage(from, {
      contacts: { displayName: ownerName, contacts: [{ vcard }] },
    });

    // Step 2️⃣: Send one banner with text + real channel button
    await sock.sendMessage(
      from,
      {
        image: { url: banner || channel.banner }, // ✅ one clean banner
        caption,
        contextInfo: {
          forwardedNewsletterMessageInfo: {
            newsletterJid: channel.jid,
            serverMessageId: 1,
            newsletterName: channel.name,
          },
          isForwarded: true,
          forwardingScore: 1,
        },
      },
      { quoted: msg }
    );
  } catch (err) {
    console.error("❌ Owner command failed:", err?.message || err);
    await sock.sendMessage(from, { text: "⚠️ Failed to send owner info." }, { quoted: msg });
  }
};
