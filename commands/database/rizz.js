const getAI = require("../../lib/aiFun");

// Clean weird AI outputs
function sanitize(text = "") {
    return text
        .replace(/^(sure|ok|okay|here|alright).*?:/i, "") // remove AI intros
        .replace(/^[\n"'`]+/g, "") // clean start
        .replace(/[\n"'`]+$/g, "") // clean end
        .trim();
}

module.exports = async (sock, msg, from) => {
    try {
        const target =
            msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
            msg.message?.extendedTextMessage?.contextInfo?.participant ||
            msg.key.participant;

        if (!target) {
            return await sock.sendMessage(
                from,
                { text: "❌ Tag someone or reply to their message." },
                { quoted: msg }
            );
        }

        const name = target.split("@")[0];

        const prompt = `
Write a *dark rizz + toxic romance pickup line* for someone named @${name}.
Rules:
- Max 1–2 lines ONLY.
- Must feel addictive, dangerous, intimate.
- Keep it mature and dark romance.
- No introductions, no disclaimers, no emojis.
- No cringe. Make it sharp.
`;

        let ai = await getAI(prompt);
        ai = sanitize(ai);

        // fallback if AI blanks out
        if (!ai || ai.length < 3) {
            ai = `You're the kind of trouble I’d ruin my peace for, @${name}.`;
        }

        await sock.sendMessage(
            from,
            {
                text: `🖤 *Dark Rizz for @${name}*\n\n${ai}`,
                mentions: [target]
            },
            { quoted: msg }
        );

    } catch (err) {
        console.error("Rizz Error:", err.message);
        await sock.sendMessage(
            from,
            { text: "⚠️ Couldn't drop rizz rn, your aura too strong." },
            { quoted: msg }
        );
    }
};
