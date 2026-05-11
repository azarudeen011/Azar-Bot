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
    .replace(/^(sure|okay|here|alright)[^a-z0-9]+/i, "")
    .trim();
}

module.exports = async (sock, msg, from) => {
  try {
    const target = getTarget(msg);

    if (!target) {
      return sock.sendMessage(
        from,
        {
          text: "❌ Reply to someone or mention a user.\nExample: `.flirt @user`",
        },
        { quoted: msg }
      );
    }

    const name = target.split("@")[0] || "babe";

    // -------- AI Prompt (clean, sexy, Gen-Z smooth) ----------
    const prompt = `
Write a dark, deep, Gen-Z flirt line for @${name}.
Make it smooth, short, unique each time. Max 1–2 lines.
Do NOT add anything extra. Only the flirt line.
    `;

    let ai = await getAI(prompt);
    ai = sanitize(ai);

    if (!ai) {
      return sock.sendMessage(from, {
        text: "⚠️ Couldn't generate a flirt right now.",
      }, { quoted: msg });
    }

    await sock.sendMessage(
      from,
      {
        text: `💘 *Flirt for @${name}*\n\n${ai}`,
        mentions: [target],
      },
      { quoted: msg }
    );

  } catch (err) {
    console.error(".flirt error:", err);
    await sock.sendMessage(
      from,
      { text: "❌ Error generating flirt. Try again later." },
      { quoted: msg }
    );
  }
};
