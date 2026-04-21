const axios = require("axios");
const settings = require("../../settings");
const small_lib = require("../../lib/small_lib");

module.exports = async (sock, msg, from, body, args) => {
    try {
        await sock.sendMessage(from, { react: { text: "🏁", key: msg.key } }).catch(() => { });

        const url = `https://api.princetechn.com/api/football/epl/matches?apikey=prince`;
        const res = await axios.get(url, { timeout: 30000 });

        if (!res.data || !res.data.success || !res.data.result) {
            return sock.sendMessage(from, { text: "❌ Failed to fetch EPL matches." }, { quoted: msg });
        }

        const data = res.data.result;
        let text = `🏁 *RECENT MATCHES: ${data.competition.toUpperCase()}* 🏁\n\n`;

        let recentMatches = data.matches.filter(m => m.status === "FINISHED");
        if (recentMatches.length > 10) {
             recentMatches = recentMatches.slice(-10).reverse();
        }

        recentMatches.forEach(m => {
            text += `📅 Matchday ${m.matchday}\n`;
            text += `⚔️ ${m.homeTeam}  ${m.score}  ${m.awayTeam}\n`;
            text += `🏆 Winner: ${m.winner}\n\n`;
        });

        text += `> ${small_lib.author}`;

        await sock.sendMessage(from, { text }, { quoted: msg });

    } catch (e) {
        console.log("EPL Matches Error:", e.message);
        await sock.sendMessage(from, { text: "❌ API Error or Rate Limit. Try again later." }, { quoted: msg });
    }
};
