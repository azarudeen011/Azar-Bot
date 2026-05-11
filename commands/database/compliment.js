const getAI = require("../../lib/aiFun");

// 🧠 Extract target user safely from any message type
function getTargetJid(msg) {
    return (
        msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
        msg.message?.extendedTextMessage?.contextInfo?.participant ||
        msg.key.participant ||
        msg.participant ||
        msg.key.remoteJid
    );
}

module.exports = async (sock, msg, from) => {
    try {
        const target = getTargetJid(msg);
        const name = (target || "").split("@")[0];

        // 🧠 AI request (no long essays, only cute vibes)
        const response = await getAI(`
Return only the compliment. No prefixes.
Write a short, unique, wholesome Gen-Z compliment for @${name}.
Max 2–3 lines. No cringe, no long paragraphs.
`);

        // Clean weird prefixes if AI tries to be funny
        const ai = response
            .replace(/^["'`]+/, "")
            .replace(/["'`]+$/, "")
            .trim();

        await sock.sendMessage(
            from,
            {
                text: `💖 *Compliment for @${name}*\n\n${ai}`,
                mentions: [target]
            },
            { quoted: msg }
        );

    } catch (err) {
        console.log("Compliment Error:", err.message);
        await sock.sendMessage(from, {
            text: "⚠️ Couldn't generate compliment. Try again!"
        }, { quoted: msg });
    }
};
