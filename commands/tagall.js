// ==============================================
// 📢 Azahrabot TagAll Command (v6.0 — View More Edition)
// Tags all members compactly with "View more" folding
// ==============================================

const settings = require("../settings");

module.exports = async (sock, msg, from) => {
  try {
    // ✅ Works only in groups
    if (!from.endsWith("@g.us"))
      return await sock.sendMessage(from, { text: "❌ This command only works in groups." }, { quoted: msg });

    // 📦 Fetch group metadata
    const metadata = await sock.groupMetadata(from);
    const members = metadata.participants || [];
    const sender = msg.key.participant || msg.key.remoteJid;
    const { jidNormalizedUser } = require("@whiskeysockets/baileys");
    const { isPairedOwner } = require("../lib/guards");
    
    const isOwner = await isPairedOwner(sock, msg);
    const isAdmin = members.some(m => 
      (m.id === sender || m.lid === sender || jidNormalizedUser(m.id) === jidNormalizedUser(sender)) && 
      (m.admin === "admin" || m.admin === "superadmin")
    );

    if (!isAdmin && !isOwner)
      return await sock.sendMessage(
        from,
        { text: "❌ Only group admins can use .tagall." },
        { quoted: msg }
      );

    if (members.length === 0)
      return await sock.sendMessage(from, { text: "⚠️ No members found." }, { quoted: msg });

    // 🧩 Build message in chunks to trigger WhatsApp “View More”
    const memberIds = members.map((m) => m.id);
    const chunkSize = 50; // WhatsApp usually folds after ~50-60 mentions
    const chunks = [];

    for (let i = 0; i < memberIds.length; i += chunkSize) {
      const slice = memberIds.slice(i, i + chunkSize);
      const tagList = slice
        .map((jid, idx) => `👤 @${jid.split("@")[0]}`)
        .join("\n");

      const message = `📋 *Group Taglist*\n────────────────\n${tagList}\n────────────────\n> powered by *Azahra Bot ⚡*`;
      chunks.push({ text: message, mentions: slice });
    }

    // ✨ Send only one message if small group
    if (chunks.length === 1) {
      await sock.sendMessage(from, chunks[0], { quoted: msg });
      return;
    }

    // 💬 If large group, send the first chunk as visible + merge others silently
    let combinedText = "";
    let allMentions = [];
    chunks.forEach((chunk) => {
      combinedText += chunk.text + "\n\n";
      allMentions.push(...chunk.mentions);
    });

    const finalMsg = {
      text: combinedText.trim(),
      mentions: allMentions,
    };

    await sock.sendMessage(from, finalMsg, { quoted: msg });
  } catch (err) {
    console.error("❌ .tagall error:", err);
    await sock.sendMessage(from, { text: `⚠️ TagAll failed: ${err.message}` }, { quoted: msg });
  }
};