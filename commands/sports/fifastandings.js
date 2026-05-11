const axios = require("axios");
const settings = require("../../settings");
const small_lib = require("../../lib/small_lib");

module.exports = async (sock, msg, from, body, args) => {
    try {
        await sock.sendMessage(from, { react: { text: "🌍", key: msg.key } }).catch(() => { });

        const url = `https://api.princetechn.com/api/football/fifa/standings?apikey=prince`;
        const res = await axios.get(url, { timeout: 30000 });

        if (!res.data || !res.data.success || !res.data.result) {
            return sock.sendMessage(from, { text: "❌ Failed to fetch FIFA standings." }, { quoted: msg });
        }

        const data = res.data.result;
        let text = `🌍 *STANDINGS: ${data.competition.toUpperCase()}* 🌍\n\n`;

        const standings = data.standings.slice(0, 15);
        standings.forEach(s => {
            text += `*${s.position}. ${s.team}* - ${s.points} pts\n`;
            text += `Played: ${s.played} | W: ${s.won} | D: ${s.draw} | L: ${s.lost}\n`;
            text += `GF: ${s.goalsFor} | GA: ${s.goalsAgainst} | GD: ${s.goalDifference}\n\n`;
        });

        text += `> ${small_lib.author}`;

        await sock.sendMessage(from, { text }, { quoted: msg });

    } catch (e) {
        console.log("FIFA Standings Error:", e.message);
        await sock.sendMessage(from, { text: "❌ API Error. Try again later." }, { quoted: msg });
    }
};
