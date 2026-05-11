// ==============================================
// 🤣 Azahrabot Joke Command (v4.3 — Ultra Stable Edition)
// Multi-API fallback + safe parsing
// ==============================================

const axios = require("axios");
const settings = require("../settings");

module.exports = async (sock, msg, from) => {
  try {
    await sock.sendMessage(from, {
      react: { text: "🤣", key: msg.key },
    }).catch(() => {});
  } catch {}

  try {
    // First API (fastest)
    let joke = null;
    try {
      const res = await axios.get("https://official-joke-api.appspot.com/random_joke", {
        timeout: 4000,
      });

      if (res.data?.setup && res.data?.punchline) {
        joke = `${res.data.setup}\n😂 ${res.data.punchline}`;
      }
    } catch {}

    // Second API fallback (extremely reliable)
    if (!joke) {
      try {
        const res2 = await axios.get("https://icanhazdadjoke.com/", {
          headers: { Accept: "application/json" },
          timeout: 4000,
        });

        if (res2.data?.joke) {
          joke = `${res2.data.joke}`;
        }
      } catch {}
    }

    // Local fallback (last resort)
    if (!joke) {
      const fallback = [
        "💀 Why don’t skeletons fight each other? They don’t have the guts!",
        "💸 Why did the developer go broke? Because he used up all his cache.",
        "📏 Parallel lines have so much in common… too bad they'll never meet.",
        "🔍 Debugging: Being the detective in a crime where you're also the murderer.",
        "🖥️ I told my computer I needed a break — it said 'Going to sleep.'",
      ];
      joke = fallback[Math.floor(Math.random() * fallback.length)];
    }

    const msgText = `
🤣 *Here's a Joke for You!*
──────────────────────
${joke}
──────────────────────
> powered by *${settings.author || "AzarTech"} 🤖*
`.trim();

    await sock.sendMessage(from, { text: msgText }, { quoted: msg });

  } catch (err) {
    console.error("Joke command error:", err.message);
    await sock.sendMessage(from, { text: "⚠️ Failed to get a joke. Try again later 😅" }, { quoted: msg });
  }
};
