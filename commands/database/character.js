const axios = require("axios");
const getAI = require("../../lib/aiFun");

// Progress bar generator
function progressBar(percent) {
    const filled = Math.round(percent / 10);
    const empty = 10 - filled;
    return "█".repeat(filled) + "░".repeat(empty) + ` ${percent}%`;
}

// Anime fallback
async function getAnimeFallback() {
    try {
        const res = await axios.get("https://nekos.best/api/v2/neko");
        return res.data.results?.[0]?.url || "https://i.waifu.pics/2u0DRUu.png";
    } catch {
        return "https://i.waifu.pics/2u0DRUu.png";
    }
}

// More aggressive JSON extraction
function forceJSON(text) {
    try {
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) return null;
        return JSON.parse(match[0]);
    } catch {
        return null;
    }
}

// Extract target user from any message format
function getTarget(msg) {
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
        const target = getTarget(msg);
        const name = (target || "").split("@")[0];

        // Fetch DP or fallback
        let dp;
        try {
            dp = await sock.profilePictureUrl(target, "image");
            if (!dp) dp = await getAnimeFallback();
        } catch {
            dp = await getAnimeFallback();
        }

        // Request AI for JSON
        const response = await getAI(`
STRICT MODE:
Respond ONLY with pure JSON.
No explanations. No prefixes. No markdown.

{
 "zodiac": "Random zodiac",
 "rank": "S+, S, A, B, C",
 "overall": random 10-100,
 "marriage_type": "Arrange Marriage / Love Marriage / Runaway Marriage / Secret Marriage / No Marriage",
 "verdict": "short one-line gen-z summary",
 "traits": [
   {"name":"Kindness","percent":random 1-100},
   {"name":"Chaos","percent":random 1-100},
   {"name":"Loyalty","percent":random 1-100},
   {"name":"Rizz","percent":random 1-100},
   {"name":"Intelligence","percent":random 1-100}
 ]
}
        `);

        const data = forceJSON(response);
        if (!data) {
            return sock.sendMessage(from, { text: "⚠️ Character AI error." }, { quoted: msg });
        }

        // Format traits
        let traitText = "";
        for (const t of data.traits) {
            traitText += `• *${t.name}:*\n${progressBar(t.percent)}\n\n`;
        }

        const caption = `
🎴 *CHARACTER CARD — @${name}*
────────────────────
🌌 *Zodiac:* ${data.zodiac}
🏅 *Rank:* ${data.rank}

⭐ *Overall Personality:*  
${progressBar(data.overall)}

${traitText}

💍 *Marriage Prediction:*  
_${data.marriage_type}_

💬 *Final Verdict:*  
_${data.verdict}_

> Powered by Azahra AI ⚡
        `.trim();

        await sock.sendMessage(
            from,
            {
                image: { url: dp },
                caption,
                mentions: [target],
            },
            { quoted: msg }
        );

    } catch (err) {
        console.log("Character error:", err.message);
        await sock.sendMessage(from, { text: "⚠️ Could not generate character card." }, { quoted: msg });
    }
};
