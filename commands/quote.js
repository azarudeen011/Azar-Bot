// ======================================================
// 💬 Azahrabot — Quote of the Day
// Smart API + Offline Fallback (ZenQuotes)
// ======================================================

const axios = require("axios");

module.exports = async (sock, msg, from) => {
  try {
    // 💫 React to show activity
    await sock.sendMessage(from, { react: { text: "💬", key: msg.key } }).catch(() => {});
  } catch {}

  try {
    // 🌐 Fetch a random quote
    const res = await axios.get("https://zenquotes.io/api/random");
    const quote = res.data[0]?.q || "Keep pushing, keep growing.";
    const author = res.data[0]?.a || "Unknown";

    const message = `
💬 *Quote of the Day*
━━━━━━━━━━━━━━━━━━━
“${quote}”
— ${author}
━━━━━━━━━━━━━━━━━━━
✨ *Power your day with Azahrabot ⚡*
    `.trim();

    await sock.sendMessage(from, { text: message }, { quoted: msg });
  } catch (err) {
    console.error("❌ Quote API Error:", err.message);

    // 🧠 Offline fallback quotes
    const backups = [
      "“Talk is cheap. Show me the code.” — Linus Torvalds",
      "“First, solve the problem. Then, write the code.” — John Johnson",
      "“Make it work, make it right, make it fast.” — Kent Beck",
      "“Code never lies, comments sometimes do.” — Ron Jeffries",
      "“Simplicity is the soul of efficiency.” — Austin Freeman"
    ];

    const pick = backups[Math.floor(Math.random() * backups.length)];

    const fallback = `
💬 *Quote of the Day (Offline)*
━━━━━━━━━━━━━━━━━━━
${pick}
━━━━━━━━━━━━━━━━━━━
⚙️ *powered by 𝘼𝙯𝙖𝙧𝙏𝙚𝙘𝙝*
    `.trim();

    await sock.sendMessage(from, { text: fallback }, { quoted: msg });
  }
};
