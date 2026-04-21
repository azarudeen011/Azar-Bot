const axios = require("axios");
const settings = require("../../settings");
const small_lib = require("../../lib/small_lib");

module.exports = async (sock, msg, from, body, args) => {
    try {
        await sock.sendMessage(from, { react: { text: "⏰", key: msg.key } }).catch(() => { });

        const url = `https://api.princetechn.com/api/football/epl/upcoming?apikey=prince`;
        const res = await axios.get(url, { timeout: 30000 });

        if (!res.data || !res.data.success || !res.data.result) {
            return sock.sendMessage(from, { text: "❌ Failed to fetch upcoming EPL matches." }, { quoted: msg });
        }

        const data = res.data.result;
        let text = `⏰ *UPCOMING: ${data.competition.toUpperCase()}* ⏰\n\n`;

        const upcoming = data.upcomingMatches.slice(0, 10);
        upcoming.forEach(m => {
            text += `📅 Matchday ${m.matchday} | ${m.date}\n`;
            text += `⚔️ ${m.homeTeam} vs ${m.awayTeam}\n\n`;
        });

        text += `> ${small_lib.author}`;

        await sock.sendMessage(from, { text }, { quoted: msg });

    } catch (e) {
        console.log("EPL Upcoming Error:", e.message);
        await sock.sendMessage(from, { text: "❌ API Error. Try again later." }, { quoted: msg });
    }
};
