// ==============================================
// 🖼️ Azahrabot GetPPGC Command (v6.0 — Group Profile Fetch)
// Fetches the current group's profile picture + info
// Public Access • Works only in groups
// ==============================================

const settings = require("../settings");

module.exports = async (sock, msg, from) => {
  try {
    // 🚫 Must be used in a group
    if (!from.endsWith("@g.us")) {
      return await sock.sendMessage(from, { text: "❌ This command works only in groups." }, { quoted: msg });
    }

    // 📦 Get group metadata
    const metadata = await sock.groupMetadata(from);
    const groupName = metadata.subject || "Unnamed Group";
    const memberCount = metadata.participants?.length || 0;

    // 🔍 Try fetching group profile pic
    let groupPic;
    try {
      groupPic = await sock.profilePictureUrl(from, "image");
    } catch {
      groupPic = "https://i.ibb.co/S0PpwKk/default-group.jpg"; // fallback image
    }

    // 🧾 Build caption
    const caption = `
🏙️ *${groupName}*
────────────────────
👥 *Members:* ${memberCount}
🪄 *Requested by:* @${(msg.key.participant || msg.key.remoteJid).split("@")[0]}
────────────────────
> powered by *${settings.author || "Azar Tech"}* ⚡
`.trim();

    // 📤 Send the group photo
    await sock.sendMessage(
      from,
      {
        image: { url: groupPic },
        caption,
        mentions: [(msg.key.participant || msg.key.remoteJid)],
      },
      { quoted: msg }
    );
  } catch (err) {
    console.error("❌ .getppgc error:", err);
    await sock.sendMessage(from, { text: "⚠️ Failed to fetch group picture. Try again later." }, { quoted: msg });
  }
};
