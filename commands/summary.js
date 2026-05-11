const axios = require("axios");
const path = require("path");

module.exports = async (sock, msg, from, text, args) => {
    if (!from.endsWith("@g.us")) {
        return sock.sendMessage(from, { text: "❌ This command is only for groups!" }, { quoted: msg });
    }

    let messages = global.messageCache?.[from] || [];

    // Fallback: Try to get messages from the store if available and cache is small
    if (messages.length < 20 && store && store.messages && store.messages[from]) {
        const storeMsgs = store.messages[from].array || store.messages[from];
        if (storeMsgs && Array.isArray(storeMsgs)) {
            // Extract text from store messages that aren't already in cache
            const additionalMsgs = storeMsgs
                .slice(-50) // Get last 50
                .map(m => {
                    const mText = m.message?.conversation || 
                                  m.message?.extendedTextMessage?.text || 
                                  m.message?.imageMessage?.caption || 
                                  m.message?.videoMessage?.caption || "";
                    return {
                        sender: m.pushName || m.key.participant?.split("@")[0] || m.key.remoteJid?.split("@")[0],
                        text: mText.trim()
                    };
                })
                .filter(m => m.text && !m.text.startsWith(".") && !m.text.startsWith("!")); // Exclude commands
            
            // Merge and de-duplicate or just use the most recent 100
            messages = [...additionalMsgs, ...messages].slice(-100);
        }
    }

    if (messages.length < 5) {
        return sock.sendMessage(from, { text: "⚠️ Not enough chat history found to generate a summary. Please chat a bit more!" }, { quoted: msg });
    }

    await sock.sendMessage(from, { text: "⏳ *Analyzing the group conversation...*" }, { quoted: msg });

    try {
        const secure = require("../lib/small_lib");
        const apiKey = secure.api?.openRouter;

        let reply = "";
        const transcript = messages.map(m => `${m.sender}: ${m.text}`).join("\n");

        const prompt = `You are a professional yet engaging AI group chat summarizer. 
Read the following transcript of the last ${messages.length} messages from this WhatsApp group.
Summarize the main topics, decisions, and overall vibe in 3-4 clear and interesting sentences. 
Avoid mentioning specific timestamps, just focus on the flow of conversation.

Transcript:
${transcript}`;

        // 1. Try OpenRouter (Primary)
        if (apiKey) {
            try {
                const response = await axios.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    {
                        model: "google/gemini-2.0-flash-exp:free",
                        messages: [{ role: "user", content: prompt }]
                    },
                    {
                        headers: {
                            "Authorization": `Bearer ${apiKey}`,
                            "Content-Type": "application/json",
                            "HTTP-Referer": "https://github.com/AzarTech/AzahraBot",
                            "X-Title": "AzahraBot"
                        },
                        timeout: 30000
                    }
                );
                reply = response.data.choices[0].message.content;
            } catch (openRouterErr) {
                console.log("⚠️ OpenRouter Summary Error:", openRouterErr.response?.data || openRouterErr.message);
            }
        }

        // 2. Try Fallback AI
        if (!reply) {
            try {
                const url = `https://api.ryzendesu.vip/api/ai/chat?text=${encodeURIComponent("Summarize this group chat transcript:\n" + transcript)}`;
                const res = await axios.get(url, { timeout: 30000 });
                reply = res.data?.result || res.data?.response;
            } catch (fallbackErr) {
                console.log("❌ All summary APIs failed.");
            }
        }

        if (!reply) {
            return sock.sendMessage(from, { text: "❌ Failed to generate summary. AI servers are currently unavailable." }, { quoted: msg });
        }

        return sock.sendMessage(from, { text: `📜 *GROUP SUMMARY*\n━━━━━━━━━━━━━━\n\n${reply.trim()}\n\n━━━━━━━━━━━━━━\n> _Summarized by AzahraBot AI_` }, { quoted: msg });

    } catch (error) {
        console.error("Summary execution error:", error);
        return sock.sendMessage(from, { text: "❌ An unexpected error occurred while generating the summary." }, { quoted: msg });
    }
};
