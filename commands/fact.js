// commands/fact.js
const axios = require("axios");

const fallbackFacts = [
  // 🧠 Funny
  "If you try to fail and succeed, which have you done?",
  "When life gives you melons, you might be dyslexic.",
  // 💭 Serious
  "The scars you can see are nothing compared to the ones you carry inside.",
  "Not all storms come to disrupt your life — some come to clear your path.",
  // 🌑 Dark
  "It’s a lonely place at the top. Don’t forget what you left behind.",
  "Sometimes the absence of light is all the proof you need that darkness exists.",
  // 🔥 18+ / Savage
  "Age doesn’t define experience. Your actions do.",
  "What’s forbidden is often the most human truth.",
  // 🌍 Random
  "Don’t count the days. Make the days count.",
  "Silence is also an answer.",
];

module.exports = async (sock, msg, from) => {
  try {
    // 🧠 React when .fact command runs
    await sock.sendMessage(from, {
      react: { text: "🧠", key: msg.key },
    });
  } catch (err) {
    console.log("Reaction failed:", err.message);
  }

  try {
    // 🌐 Fetch a random fact
    const res = await axios.get("https://uselessfacts.jsph.pl/api/v2/facts/random?language=en", { timeout: 3000 });
    const fact = res.data?.text;

    if (fact) {
      const text = `
🔍 *Random Fact*
────────────────────
${fact}
────────────────────
> powered by 𝘼𝙯𝙖𝙧𝙏𝙚𝙘𝙝 ⚡
      `.trim();

      await sock.sendMessage(from, { text }, { quoted: msg });
      return;
    }

    throw new Error("No fact returned");

  } catch (err) {
    console.error("Fact command API error:", err.message);

    // 💭 Use fallback facts if API fails
    const pick = fallbackFacts[Math.floor(Math.random() * fallbackFacts.length)];

    const text = `
🔍 *Backup Fact*
────────────────────
${pick}
────────────────────
> powered by 𝘼𝙯𝙖𝙧𝙏𝙚𝙘𝙝 ⚡
      `.trim();

    await sock.sendMessage(from, { text }, { quoted: msg });
  }
};