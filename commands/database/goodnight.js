const getAI = require("../../lib/aiFun");

// Clean AI output
function sanitize(text = "") {
  return text
    .replace(/^[\n"'`]+/, "")
    .replace(/[\n"'`]+$/, "")
    .replace(/^(sure|okay|alright|here).*?:/i, "")
    .trim();
}

// Resolve target user (reply/mention)
function getTarget(msg) {
  return (
    msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
    msg.message?.extendedTextMessage?.contextInfo?.participant ||
    null
  );
}

module.exports = async (sock, msg, from) => {
  try {
    const target = getTarget(msg);
    const name = target ? target.split("@")[0] : null;

    // Build dynamic prompt
    const prompt = name
      ? `Write a calming, aesthetic Gen-Z goodnight message for @${name}. Max 2–3 lines.Use emoji but No emojis at start.`
      : `Write a calming, aesthetic Gen-Z goodnight message for friends/loved ones. Max 2–3 lines.Use emoji but No emojis at start.`;

    let ai = await getAI(prompt);
    ai = sanitize(ai);

    if (!ai) ai = "goodnight, breathe slow and reset. tomorrow’s yours.";

    const message = name
      ? `🌙 *Goodnight @${name}*\n\n${ai}`
      : `🌙 *Goodnight*\n\n${ai}`;

    await sock.sendMessage(
      from,
      {
        text: message,
        mentions: target ? [target] : [],
      },
      { quoted: msg }
    );
  } catch (err) {
    console.error(".goodnight error:", err);
    await sock.sendMessage(
      from,
      { text: "⚠️ Couldn't generate a goodnight message." },
      { quoted: msg }
    );
  }
};
