// =======================================================
// 🌐 Azahrabot Repository Command v4.9
// GitHub Repo + View Channel Button + Banner
// =======================================================

const secure = require("../lib/small_lib"); // ✅ Fixed branding + channel + repo
const pkg = require("../package.json");

module.exports = async (sock, msg, from) => {
  try {
    // React to show it's working
    await sock.sendMessage(from, { react: { text: "🚀", key: msg.key } }).catch(() => {});
  } catch {}

  try {
    const repoUrl = secure.repoUrl || "https://github.com/";
    const bannerUrl = secure.channel.banner;
    const channelName = secure.channel.name;
    const channelJid = secure.channel.jid;

    // 🧾 Info Caption
    const caption = `
👨‍💻 *${secure.botName} — GitHub Repository*
━━━━━━━━━━━━━━━━━━━
✨ *Author:* ${secure.author || "AzarTech"}
📦 *Version:* ${pkg.version || "1.0.0"}
⚙️ *Language:* Node.js
🌐 *Platform:* WhatsApp (Baileys)
📁 *Repository:* ${repoUrl}
━━━━━━━━━━━━━━━━━━━
> *Powered by ${secure.author} ⚡*
`.trim();

    // 🪄 Buttons for interactivity
    const buttons = [
      { buttonId: `${secure.prefix || "."}update`, buttonText: { displayText: "🧠 Update (Owner)" }, type: 1 },
      { buttonId: `${secure.prefix || "."}owner`, buttonText: { displayText: "👑 Owner" }, type: 1 },
    ];

    // 📢 Send interactive message with “View Channel” link
    await sock.sendMessage(
      from,
      {
        image: { url: bannerUrl },
        caption,
        footer: `🔗 GitHub • ${repoUrl}`,
        buttons,
        headerType: 4,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: channelJid, // ✅ This makes WhatsApp show the native “View Channel” button
            newsletterName: channelName,
            serverMessageId: -1,
          },
        },
      },
      { quoted: msg }
    );
  } catch (err) {
    console.error("❌ Repo command failed:", err.message);
    await sock.sendMessage(
      from,
      { text: "⚠️ Failed to load repository details." },
      { quoted: msg }
    );
  }
};
