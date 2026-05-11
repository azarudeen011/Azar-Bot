const getAI = require("../../lib/aiFun");

module.exports = async (sock, msg, from) => {
  try {
    // Resolve target: mention > reply > participant > sender
    const target =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
      msg.message?.extendedTextMessage?.contextInfo?.participant ||
      msg.key.participant ||
      msg.key.remoteJid;

    if (!target) {
      return sock.sendMessage(
        from,
        { text: "❌ Please reply to someone or mention them.\nExample: `.simp @user`" },
        { quoted: msg }
      );
    }

    const name = (target.includes("@") ? target.split("@")[0] : target) || "them";

    const prompt = `
Give a smooth Gen-Z simp line for someone named @${name}.
Make it flirty, dark, funny, and fresh.
Avoid cringe. Avoid repeating lines. Max 2–3 short lines only.
    `;

    const ai = await getAI(prompt);

    if (!ai || ai.startsWith("⚠️")) {
      return sock.sendMessage(
        from,
        { text: "⚠️ Couldn't generate a simp line right now." },
        { quoted: msg }
      );
    }

    await sock.sendMessage(
      from,
      {
        text: `😍 *Simping on @${name}*\n\n${ai}`,
        mentions: [target]
      },
      { quoted: msg }
    );

  } catch (err) {
    console.error(".simp error:", err.message);
    await sock.sendMessage(from, { text: "⚠️ Something went wrong." }, { quoted: msg });
  }
};
