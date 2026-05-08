// ==============================================
// 🖼️ Azahrabot SetPPGC Command (v6.1 — Admin Only)
// Sets the group profile picture from a replied image
// Works only in groups • Only for admins / paired owner
// ==============================================

const settings = require("../settings");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const P = require("pino");

module.exports = async (sock, msg, from) => {
  try {
    // 🚫 Only groups
    if (!from.endsWith("@g.us")) {
      return await sock.sendMessage(from, { text: "❌ This command can only be used in groups." }, { quoted: msg });
    }

    // 📦 Fetch group metadata
    const metadata = await sock.groupMetadata(from);
    const participants = metadata.participants || [];

    // 🔍 Identify sender
    const sender = msg.key.participant || msg.key.remoteJid;
    const { isPairedOwner } = require("../lib/guards");
    const isOwner = await isPairedOwner(sock, msg);
    const isAdmin = participants.some(p => (p.id === sender || p.lid === sender) && p.admin);

    // 🔐 Restrict access
    if (!isAdmin && !isOwner) {
      return await sock.sendMessage(
        from,
        { text: "❌ Only group admins can use this command." },
        { quoted: msg }
      );
    }

    // 🧾 Must reply to an image
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imageMsg =
      quotedMsg?.imageMessage || quotedMsg?.viewOnceMessage?.message?.imageMessage;

    if (!imageMsg) {
      return await sock.sendMessage(
        from,
        { text: "🖼️ Reply to an image with `.setppgc` to set it as the group profile picture." },
        { quoted: msg }
      );
    }

    // 📥 Download the image
    const buffer = await downloadMediaMessage(
      { message: { imageMessage: imageMsg } },
      "buffer",
      {},
      { logger: P({ level: "silent" }) }
    );

    // 🖼️ Set group profile picture
    try {
      await sock.updateProfilePicture(from, buffer);
    } catch (err) {
      console.error("⚠️ Failed to update group picture:", err);
      return await sock.sendMessage(
        from,
        { text: "⚠️ Failed to update group picture. Ensure bot is admin." },
        { quoted: msg }
      );
    }

    // ✅ Success message
    await sock.sendMessage(
      from,
      {
        text: `✅ *Group profile picture updated successfully!*\n> powered by *${settings.author || "AzarTech"}* ⚡`,
      },
      { quoted: msg }
    );
  } catch (err) {
    console.error("❌ .setppgc error:", err);
    await sock.sendMessage(from, { text: "⚠️ Error: Unable to update group picture." }, { quoted: msg });
  }
};
