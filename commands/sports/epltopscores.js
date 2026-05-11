const axios = require("axios");
const settings = require("../../settings");
const small_lib = require("../../lib/small_lib");

module.exports = async (sock, msg, from, body, args) => {
    try {
        await sock.sendMessage(from, { react: { text: "🏅", key: msg.key } }).catch(() => { });

        const url = `https://api.princetechn.com/api/football/epl/scorers?apikey=prince`;
        const res = await axios.get(url, { timeout: 30000 });

        if (!res.data || !res.data.success || !res.data.result) {
            return sock.sendMessage(from, { text: "❌ Failed to fetch EPL top scorers." }, { quoted: msg });
        }

        const data = res.data.result;
        let text = `🏅 *TOP SCORERS: ${data.competition.toUpperCase()}* 🏅\n\n`;

        const scorers = data.topScorers.slice(0, 10);
        scorers.forEach(s => {
            text += `*${s.rank}. ${s.player}* (${s.team})\n`;
            text += `⚽ Goals: ${s.goals} | 👟 Assists: ${s.assists} | 🎯 Penalties: ${s.penalties}\n\n`;
        });

        text += `> ${small_lib.author}`;

        await sock.sendMessage(from, { text }, { quoted: msg });

    } catch (e) {
        console.log("EPL Top Scorers Error:", e.message);
        await sock.sendMessage(from, { text: "❌ API Error or Rate Limit. Try again later." }, { quoted: msg });
    }
};
