const axios = require("axios");
const settings = require("../../settings");
const small_lib = require("../../lib/small_lib");

module.exports = async (sock, msg, from, body, args) => {
    try {
        await sock.sendMessage(from, { react: { text: "⚽", key: msg.key } }).catch(() => { });

        const url = "https://api.princetechn.com/api/football/livescore2?apikey=prince";
        const res = await axios.get(url, { timeout: 30000 });

        if (!res.data || !res.data.result || !res.data.result.matches) {
            return sock.sendMessage(from, { text: "❌ Failed to fetch livescores." }, { quoted: msg });
        }

        const matches = res.data.result.matches.slice(0, 15);
        let text = `⚽ *LIVE FOOTBALL SCORES* ⚽\n\n`;

        matches.forEach(m => {
            text += `🏆 *${m.league}*\n`;
            text += `🔴 ${m.homeTeam}  ${m.homeScore} - ${m.awayScore}  ${m.awayTeam} 🔵\n`;
            text += `⏱️ Status: ${m.status}\n\n`;
        });

        text += `> ${small_lib.author}`;

        await sock.sendMessage(from, { text }, { quoted: msg });
    } catch (e) {
        console.log("Livescore Error:", e.message);
        await sock.sendMessage(from, { text: "❌ API Error. Try again later." }, { quoted: msg });
    }
};
