const getAI = require("../../lib/aiFun");

// Clean unwanted AI prefixes
function clean(text = "") {
  return text
    .replace(/^(sure|okay|alright|here).*?:/i, "") // remove "Sure here's..."
    .replace(/[\n"'`]+$/g, "")                     // remove weird endings
    .replace(/^[\n"'`]+/g, "")                     // remove weird starts
    .trim();
}

module.exports = async (sock, msg, from, fullText, args) => {
  try {
    // Find target user (mention > reply > fallback)
    const target =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
      msg.message?.extendedTextMessage?.contextInfo?.participant ||
      msg.key.participant ||
      msg.key.remoteJid;

    const name = (target?.split("@")[0]) || "them";

    // AI prompt
    const prompt = `
      Roast someone named @${name}.
      Make it dark, funny, deep Gen-Z roast.
      Keep it short (max 2–3 lines), no cringe intros.
      No "sure here is".
      Just drop the roast raw.
    `;

    let ai = await getAI(prompt);
    ai = clean(ai);

    if (!ai || ai.length < 2) ai = "bro’s wifi has more stability than his personality.";

    await sock.sendMessage(
      from,
      {
        text: `🔥 *Roast for @${name}*\n\n${ai}`,
        mentions: [target]
      },
      { quoted: msg }
    );

  } catch (err) {
    console.error("Roast Error:", err);
    await sock.sendMessage(from, { text: "⚠️ Couldn't roast, bro survived today." }, { quoted: msg });
  }
};
