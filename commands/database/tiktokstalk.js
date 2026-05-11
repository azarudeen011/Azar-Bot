// ==============================================
// 🎵 Azahrabot TikTok Stalk (v1.0)
// Profile info + avatar banner
// ==============================================

const axios = require("axios");

module.exports = async (sock, msg, from, text, args) => {
  try {

    const username = args[0]?.replace("@", "");

    if (!username) {
      return sock.sendMessage(
        from,
        { text: "❌ Usage: .tiktokstalk <username>\nExample: .tiktokstalk mrbeast" },
        { quoted: msg }
      );
    }

    await sock.sendMessage(from, {
      react: { text: "🔍", key: msg.key },
    });

    // 📡 API call
    const res = await axios.get(
      `https://eliteprotech-apis.zone.id/tiktokstalk?username=${encodeURIComponent(username)}`
    );

    if (res.data?.status !== "success") {
      throw new Error("User not found");
    }

    const u = res.data.data;

    const caption = `
🎵 *TikTok Profile*

👤 *Username:* @${u.uniqueId}
📝 *Name:* ${u.nickname}
📖 *Bio:* ${u.bio || "No bio"}

📊 *Stats*
👥 Followers: ${u.followers.toLocaleString()}
➡️ Following: ${u.following.toLocaleString()}
❤️ Likes: ${u.hearts.toLocaleString()}
🎬 Videos: ${u.videos}

🔒 Private: ${u.private ? "Yes" : "No"}
✔️ Verified: ${u.verified ? "Yes" : "No"}

🔗 Profile:
${u.profileUrl}
`.trim();

    // 🎨 Send profile image + info
    await sock.sendMessage(
      from,
      {
        image: { url: u.avatar },
        caption,
      },
      { quoted: msg }
    );

    await sock.sendMessage(from, {
      react: { text: "✅", key: msg.key },
    });

  } catch (err) {
    console.error("❌ tiktokstalk error:", err.message);

    await sock.sendMessage(
      from,
      { text: "❌ Failed to fetch TikTok profile." },
      { quoted: msg }
    );
  }
};