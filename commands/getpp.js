// ==============================================
// 🖼️ Azahrabot GetPP Command (v6.0 — Smart Reply + Mention + Self)
// Fetches profile picture of replied user, mentioned user, or self
// Works in DMs & Groups • Public Access
// ==============================================

const settings = require("../settings");

module.exports = async (sock, msg, from) => {
  try {
    // 🧠 Detect target: reply > mention > self
    const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const mentionJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const senderJid = msg.key.participant || msg.key.remoteJid;

    const target = replyJid || mentionJid || senderJid;

    if (!target) {
      return await sock.sendMessage(from, { text: "⚠️ Couldn’t find user." }, { quoted: msg });
    }

    // 🔍 Try fetching profile picture
    let profilePicUrl;
    try {
      profilePicUrl = await sock.profilePictureUrl(target, "image");
    } catch {
      profilePicUrl = "https://i.ibb.co/S0PpwKk/default-avatar.png"; // fallback
    }

    const userNum = target.split("@")[0];

    // 🧾 Caption
    const caption = `
🖼️ * Profile Picture of @${userNum} *
────────────────────
> powered by *${settings.author || "Azar Tech"}* ⚡
`.trim();

    // 📤 Send photo
    await sock.sendMessage(
      from,
      {
        image: { url: profilePicUrl },
        caption,
        mentions: [target],
      },
      { quoted: msg }
    );

  } catch (err) {
    console.error("❌ .getpp error:", err);
    await sock.sendMessage(
      from,
      { text: "⚠️ Failed to fetch profile picture. Maybe user’s privacy settings are enabled." },
      { quoted: msg }
    );
  }
};
