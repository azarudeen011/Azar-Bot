// =============================================
// 🏛 Azahrabot — Group Description → Rules Card (v11.0)
// Always formats as “Rules & Regulations” card
// =============================================

const { delay } = require("@whiskeysockets/baileys");

module.exports = async (sock, msg, from) => {
  try {
    // ✅ Only works in groups
    if (!from.endsWith("@g.us")) {
      return await sock.sendMessage(from, { text: "❌ This command only works in group chats." }, { quoted: msg });
    }

    // 🧠 Get group metadata
    const meta = await sock.groupMetadata(from);
    const groupName = meta.subject || "Unnamed Group";
    const groupDesc = meta.desc || "No description available.";
    const ownerJid = meta.owner || meta.participants.find(p => p.admin === "superadmin")?.id || "Unknown";
    const participants = meta.participants || [];
    const memberCount = participants.length;

    // 🕒 Group creation date
    const creationDate = new Date(meta.creation * 1000).toLocaleString();

    // 👑 Group owner
    const ownerNum = ownerJid.replace("@s.whatsapp.net", "");
    const ownerMention = ownerJid !== "Unknown" ? `@${ownerNum}` : "—";

    // 🖼 Try fetching group icon
    let gcIcon;
    try {
      gcIcon = await sock.profilePictureUrl(from, "image");
    } catch {
      gcIcon = "https://i.ibb.co/dkzXcq9/group-default.jpg";
    }

    // 🧾 Make full card
    const caption = `
╭━━━〔 *📘 Rules & Regulations of ${groupName}* 〕━━━╮
│ 👑 *Owner:* ${ownerMention}
│ 👥 *Total Members:* ${memberCount}
│ 🕒 *Created On:* ${creationDate}
│───────────────────────
│ 📜 *Group Guidelines:*
│ ${groupDesc.length > 1000 ? groupDesc.slice(0, 1000) + "..." : groupDesc}
│───────────────────────
│ 🧠 *Note:*
│ All members are expected to follow these rules strictly.
│ Violation may result in a warning or removal from the group.
╰━━━━━━━━━━━━━━━━━━━━━━╯
> powered by *Azahra Bot* ⚡
`.trim();

    // 📩 Send formatted message
    await sock.sendMessage(from, {
      image: { url: gcIcon },
      caption,
      mentions: [ownerJid],
      footer: `💫 ${groupName}`,
      buttons: [
        { buttonId: "view_group", buttonText: { displayText: "🔗 View Group" }, type: 1 }
      ],
      headerType: 4,
      contextInfo: {
        mentionedJid: [ownerJid],
        externalAdReply: {
          title: `${groupName} — Rules & Regulations`,
          body: `Read before chatting 💬`,
          mediaType: 1,
          renderLargerThumbnail: true,
          thumbnailUrl: gcIcon,
          sourceUrl: `https://chat.whatsapp.com/`
        }
      }
    }, { quoted: msg });

  } catch (err) {
    console.error("❌ getdescgc error:", err);
    await sock.sendMessage(from, { text: "⚠️ Failed to fetch group rules. Try again later." }, { quoted: msg });
  }
};
