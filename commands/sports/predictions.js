const axios = require("axios");
const settings = require("../../settings");
const small_lib = require("../../lib/small_lib");

module.exports = async (sock, msg, from, body, args) => {
    try {
        await sock.sendMessage(from, { react: { text: "🔮", key: msg.key } }).catch(() => { });

        const url = "https://api.princetechn.com/api/football/predictions?apikey=prince";
        const res = await axios.get(url, { timeout: 30000 });

        if (!res.data || !res.data.result) {
            return sock.sendMessage(from, { text: "❌ Failed to fetch predictions." }, { quoted: msg });
        }

        const matches = res.data.result.slice(0, 10);
        let text = `🔮 *FOOTBALL PREDICTIONS* 🔮\n\n`;

        matches.forEach(m => {
            text += `🏆 *${m.league}*\n`;
            text += `⚔️ ${m.match}\n`;
            text += `📈 Home: ${m.predictions.fulltime.home}% | Draw: ${m.predictions.fulltime.draw}% | Away: ${m.predictions.fulltime.away}%\n`;
            text += `🔥 BTTS: ${m.predictions.bothTeamToScore.yes}%\n\n`;
        });

        text += `> ${small_lib.author}`;

        await sock.sendMessage(from, { text }, { quoted: msg });
    } catch (e) {
        console.log("Predictions Error:", e.message);
        await sock.sendMessage(from, { text: "❌ API Error. Try again later." }, { quoted: msg });
    }
};
