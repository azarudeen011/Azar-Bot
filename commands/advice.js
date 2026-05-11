// commands/advice.js
const axios = require("axios");

const backupAdvice = [
  // 🤣 Funny
  "Never trust an atom, they make up everything.",
  "Life’s short — smile while you still have teeth.",
  "If at first you don’t succeed, skydiving isn’t for you.",
  "Always remember: You’re unique. Just like everyone else.",
  // 🌑 Dark
  "Don't look for monsters under your bed. They're inside your head.",
  "Happiness is temporary — make sure your WiFi isn’t.",
  "The truth hurts, but lies kill slowly.",
  "Life’s a comedy for those who think and a tragedy for those who feel.",
  // 💭 Deep / Real talk
  "Your peace is your power. Protect it.",
  "Don’t burn yourself to keep others warm.",
  "You can restart your life whenever you want. No permission needed.",
  "Sometimes the best revenge is moving on — silently.",
  // 🔥 Savage / 18+
  "Be kind, but take no crap.",
  "Flirt responsibly. Break hearts artfully.",
  "If they play dumb, play gone.",
  "Confidence is 90% pretending you know what you’re doing.",
  // 💖 Wholesome
  "Drink water. Touch grass. Text nobody.",
  "You’re doing better than you think.",
  "One day, you’ll be proud of how far you came.",
  "Stop doubting yourself. You got this.",
];

module.exports = async (sock, msg, from) => {
  try {
    // 💡 React when .advice command runs
    await sock.sendMessage(from, {
      react: { text: "💡", key: msg.key },
    });
  } catch (err) {
    console.log("Reaction failed:", err.message);
  }

  try {
    // 🧠 Fetch from AdviceSlip API
    const res = await axios.get("https://api.adviceslip.com/advice", {
      headers: { "Cache-Control": "no-cache" },
      timeout: 4000,
    });

    const advice = res.data?.slip?.advice;

    if (advice) {
      const response = `
💬 *Random Advice*
────────────────────
"${advice}"
────────────────────
> powered by 𝘼𝙯𝙖𝙧𝙏𝙚𝙘𝙝 ⚡
      `.trim();

      await sock.sendMessage(from, { text: response }, { quoted: msg });
    } else {
      throw new Error("No advice found in API response");
    }
  } catch (err) {
    console.error("Advice API error:", err.message);

    // 🧩 Use fallback advice if API fails
    const pick = backupAdvice[Math.floor(Math.random() * backupAdvice.length)];
    const response = `
💬 *Backup Advice*
────────────────────
"${pick}"
────────────────────
> powered by 𝘼𝙯𝙖𝙧𝙏𝙚𝙘𝙝 ⚡
      `.trim();

    await sock.sendMessage(from, { text: response }, { quoted: msg });
  }
};