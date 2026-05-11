const getAI = require("../../lib/aiFun");

// -------- Extract target safely ----------
function getTarget(msg) {
  return (
    msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
    msg.message?.extendedTextMessage?.contextInfo?.participant ||
    msg.key.participant ||
    null
  );
}

// -------- Clean strange AI outputs ----------
function sanitize(text = "") {
  return text
    .replace(/^[\n"'`]+/, "")
    .replace(/[\n"'`]+$/, "")
    .replace(/^(sure|okay|here|alright|of course)[^a-z0-9]+/i, "")
    .trim();
}

module.exports = async (sock, msg, from) => {
  try {
    const target = getTarget(msg);

    if (!target) {
      return sock.sendMessage(
        from,
        {
          text: "❌ Reply to someone or mention a user.\nExample: `.pickupline @user`",
        },
        { quoted: msg }
      );
    }

    const name = target.split("@")[0] || "beautiful";

    // -------- AI Prompt (Dark + Attractive + Smooth) ----------
    const prompt = `
Write a dark, irresistible, confident pick-up line for @${name}.
Tone: mysterious, smooth,dark dangerous in romantic.
Make it creative and unique.
Max 1–2 short lines.
No emojis.
No extra explanation.
Only the pick-up line.
    `;

    let ai = await getAI(prompt);
    ai = sanitize(ai);

    if (!ai) {
      return sock.sendMessage(
        from,
        { text: "⚠️ Couldn't generate a pickup line right now." },
        { quoted: msg }
      );
    }

    await sock.sendMessage(
      from,
      {
        text: `🖤 *Pick-up Line for @${name}*\n\n${ai}`,
        mentions: [target],
      },
      { quoted: msg }
    );

  } catch (err) {
    console.error(".pickupline error:", err);
    await sock.sendMessage(
      from,
      { text: "❌ Error generating pick-up line. Try again later." },
      { quoted: msg }
    );
  }
};
