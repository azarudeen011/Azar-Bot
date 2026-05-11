const getAI = require("../../lib/aiFun");

function sanitize(t = "") {
    return t
        .replace(/^(sure|okay|alright|here).*?:/i, "")
        .replace(/[\n"'`]+$/g, "")
        .replace(/^[\n"'`]+/g, "")
        .trim();
}

module.exports = async function truth(sock, msg, from) {
    try {
        await sock.sendMessage(from, { react: { text: "🌀", key: msg.key } });

        const categories = [
            "funny", "chaotic", "nasty", "friendship", "dark but for close relations", "personal", 
            "embarrassing", "vibes", "hard truth"
        ];

        // 10% rare crush/love questions
        const rare = Math.random() < 0.1;

        const topic = rare
            ? "a love, rare, centered truth question"
            : categories[Math.floor(Math.random() * categories.length)];

        const prompt = `
Generate 1 unique TRUTH question.
Tone must be Gen Z, short, playful,dark, funny,interesting, bold.
Do NOT reveal the topic or category.
no emojis.
Topic to follow: ${topic}.
`;

        let ai = await getAI(prompt);
        ai = sanitize(ai);
        if (!ai) ai = "What’s one thing you’d admit only at 2AM?";

        await sock.sendMessage(
            from,
            {
                text: `🌀 *Truth*\n\n${ai}\n\n> powered by AzarTech ⚡`
            },
            { quoted: msg }
        );

    } catch (err) {
        console.error("Truth Error:", err.message);
        await sock.sendMessage(from, { text: "⚠️ Couldn't generate a truth." }, { quoted: msg });
    }
};
