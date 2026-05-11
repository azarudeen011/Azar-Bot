const getAI = require("../../lib/aiFun");

function sanitize(t = "") {
    return t
        .replace(/^(sure|okay|alright|here).*?:/i, "")
        .replace(/[\n"'`]+$/g, "")
        .replace(/^[\n"'`]+/g, "")
        .trim();
}

module.exports = async function dare(sock, msg, from) {
    try {
        await sock.sendMessage(from, { react: { text: "🔥", key: msg.key } });

        const categories = [
            "funny", "chaotic", "weird", "bold", "silly", "friendly", "mischief", "risk",
            "dark", "personal", "embarrassing", "vibes", "hard dare", "group fun"
        ];

        // Rare crush-based dares (10%)
        const rare = Math.random() < 0.5;

        const topic = rare
            ? "a rare, crush-based dare"
            : categories[Math.floor(Math.random() * categories.length)];

        const prompt = `
Generate 1 unique DARE.
Make it Gen Z, short, chaotic, fun, mischief, dark.
No emojis.
Do NOT reveal the category or topic.
Topic: ${topic}.
`;

        let ai = await getAI(prompt);
        ai = sanitize(ai);
        if (!ai) ai = "Send a voice note saying the first thing that comes to your mind.";

        await sock.sendMessage(
            from,
            {
                text: `🔥 *Dare*\n\n${ai}\n\n> powered by AzarTech ⚡`
            },
            { quoted: msg }
        );

    } catch (err) {
        console.error("Dare Error:", err.message);
        await sock.sendMessage(from, { text: "⚠️ Couldn't generate a dare." }, { quoted: msg });
    }
};
