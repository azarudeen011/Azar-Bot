const getAI = require("../../lib/aiFun");

// Clean unwanted AI prefixes and quotes
function sanitize(text = "") {
    return text
        .replace(/^(sure|ok|okay|alright|here).*?:?/i, "")
        .replace(/^[\n"'`]+/g, "")
        .replace(/[\n"'`]+$/g, "")
        .trim();
}

module.exports = async (sock, msg, from) => {
    try {
        // Detect target (mention > reply > participant > DM)
        const target =
            msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
            msg.message?.extendedTextMessage?.contextInfo?.participant ||
            msg.key.participant ||
            msg.key.remoteJid;

        if (!target) {
            return await sock.sendMessage(
                from,
                { text: "❌ Tag or reply to someone to send a Valentine message 💘" },
                { quoted: msg }
            );
        }

        const name = target.split("@")[0];

        const prompt = `
Write a unique Valentine's Day line for someone named @${name}.
Requirements:
- Romantic + dark romance mix.
- Integrate @${name} smoothly inside the line.
- Max 2 lines, aesthetic, addictive.
- Tone: intimate, deep, poetic, mysterious.
- NO cringe. NO generic lines. NO intros.
        `;

        let ai = await getAI(prompt);
        ai = sanitize(ai);

        if (!ai || ai.length < 3) {
            ai = `@${name}, you're the kind of love that feels like fate disguised as danger.`;
        }

        await sock.sendMessage(
            from,
            {
                text: `💘 *Valentine's Message for @${name}*\n\n${ai}`,
                mentions: [target]
            },
            { quoted: msg }
        );

    } catch (err) {
        console.error("Valentine Error:", err.message);
        await sock.sendMessage(
            from,
            { text: "⚠️ Couldn't create a Valentine message right now." },
            { quoted: msg }
        );
    }
};
