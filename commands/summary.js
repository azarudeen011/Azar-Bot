const axios = require("axios");
const path = require("path");

module.exports = async (sock, msg, from, text, args) => {
    if (!from.endsWith("@g.us")) {
        return sock.sendMessage(from, { text: "❌ This command is only for groups!" }, { quoted: msg });
    }

    if (!global.messageCache || !global.messageCache[from] || global.messageCache[from].length < 10) {
        return sock.sendMessage(from, { text: "⚠️ Not enough messages in my memory yet! Chat a little more first." }, { quoted: msg });
    }

    await sock.sendMessage(from, { text: "⏳ *Reading the last 150 messages...*" }, { quoted: msg });

    try {
        const settings = require("../../settings");
        const apiKey = settings.openRouterApiKey;

        let reply = "";

        const messages = global.messageCache[from];
        const transcript = messages.map(m => `${m.sender}: ${m.text}`).join("\n");

        const prompt = `You are a sarcastic, funny, and brutal AI group chat summarizer. 
Read the following transcript of the last ${messages.length} messages from a WhatsApp group.
Write a 3-sentence summary of what happened. Be witty, point out funny drama, and keep it extremely engaging and readable like human.

Transcript:
${transcript}`;

        // 1. Try OpenRouter FIRST (if API key exists)
        if (apiKey) {
            try {
                const response = await axios.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    {
                        model: settings.modelSelection || "openai/gpt-3.5-turbo",
                        messages: [{ role: "user", content: prompt }]
                    },
                    {
                        headers: {
                            "Authorization": `Bearer ${apiKey}`,
                            "Content-Type": "application/json"
                        },
                        timeout: 30000
                    }
                );
                reply = response.data.choices[0].message.content;
            } catch (openRouterErr) {
                console.log("⚠️ OpenRouter failed, trying fallback API:", openRouterErr.message);
            }
        }

        // 2. Try PrinceTech FALLBACK (if OpenRouter failed or no key)
        if (!reply) {
            try {
                console.log("🔄 Using PrinceTech fallback API for summary...");
                const url = `https://api.princetechn.com/api/ai/gpt4o?apikey=prince&q=${encodeURIComponent(prompt)}`;
                const res = await axios.get(url, { timeout: 30000 });
                reply = res.data?.result?.trim();
            } catch (fallbackErr) {
                console.log("❌ Fallback API also failed:", fallbackErr.message);
            }
        }

        if (!reply) {
            return sock.sendMessage(from, { text: "❌ Failed to generate summary. All AI servers are currently down or busy." }, { quoted: msg });
        }

        return sock.sendMessage(from, { text: `📜 *CHAT SUMMARY*\n━━━━━━━━━━━━━━\n\n${reply}` }, { quoted: msg });

    } catch (error) {
        console.log("Summary Error:", error.message);
        return sock.sendMessage(from, { text: "❌ Failed to generate summary. Something went wrong." }, { quoted: msg });
    }
};
