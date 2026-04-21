const axios = require("axios");
const settings = require("../../settings");
const small_lib = require("../../lib/small_lib");

module.exports = async (sock, msg, from, body, args) => {
    try {
        await sock.sendMessage(from, { react: { text: "🏀", key: msg.key } }).catch(() => { });

        const url = `https://api.princetechn.com/api/football/basketball-live?apikey=prince`;
        const res = await axios.get(url, { timeout: 30000 });

        if (!res.data || !res.data.success || !res.data.result || !res.data.result.matches) {
            return sock.sendMessage(from, { text: "❌ Failed to fetch Basketball livescores." }, { quoted: msg });
        }

        const data = res.data.result;
        let text = `🏀 *LIVESCORE: BASKETBALL* 🏀\n\n`;

        const matches = data.matches.slice(0, 15);
        if (matches.length === 0) {
            return sock.sendMessage(from, { text: "ℹ️ No Basketball matches currently live." }, { quoted: msg });
        }

        matches.forEach(m => {
            text += `🏆 *${m.league}*\n`;
            text += `🏀 ${m.homeTeam}  ${m.homeScore} - ${m.awayScore}  ${m.awayTeam}\n`;
            text += `⏰ Status: ${m.status}\n\n`;
        });

        text += `> ${small_lib.author}`;

        await sock.sendMessage(from, { text }, { quoted: msg });

    } catch (e) {
        console.log("Basketball Error:", e.message);
        await sock.sendMessage(from, { text: "❌ API Error or Rate Limit. Try again later." }, { quoted: msg });
    }
};
