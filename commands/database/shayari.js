const getAI = require("../../lib/aiFun");

// Clean and format AI output
function clean(text = "") {
    return text
        .replace(/^(sure|okay|alright|here).*?:/i, "") // remove AI intros
        .trim()
        .split("\n")
        .filter(line => line.trim() !== "" && !/[\uD800-\uDFFF]/.test(line)) // remove emojis
        .slice(0, 3) // strictly 2–3 lines max
        .join("\n");
}

module.exports = async (sock, msg, from) => {
    try {
        const prompt =
            "Write a short aesthetic English-translated shayari in exactly 2–3 lines. " +
            "Make it romantic, emotional, poetic. no introductions, no quotes.";

        let ai = await getAI(prompt);
        ai = clean(ai);

        // Fallback if AI fails
        if (!ai || ai.length < 5) {
            ai = "Your silence says the things your lips never speak,\nAnd somehow, I still hear you louder than the world.";
        }

        await sock.sendMessage(
            from,
            {
                text: `📜 *Shayari*\n\n${ai}`
            },
            { quoted: msg }
        );

    } catch (err) {
        console.error("Shayari Error:", err.message);
        await sock.sendMessage(
            from,
            { text: "⚠️ Couldn't generate shayari." },
            { quoted: msg }
        );
    }
};
