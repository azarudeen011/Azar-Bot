const axios = require("axios");
const settings = require("../../settings");
const small_lib = require("../../lib/small_lib");

module.exports = async (sock, msg, from, body, args) => {
    const type = args[0] ? args[0].toLowerCase() : "";

    if (type !== "standings") {
        let helpText = `🌍 *EUROPA LEAGUE - FOOTBALL*\n\nUsage: ${settings.prefix}europa <option>\n\n*Available Options:*\n`;
        helpText += `standings`;
        return sock.sendMessage(from, { text: helpText }, { quoted: msg });
    }

    try {
        await sock.sendMessage(from, { react: { text: "⚽", key: msg.key } }).catch(() => { });

        const url = `https://api.princetechn.com/api/football/europa/standings?apikey=prince`;
        const res = await axios.get(url, { timeout: 30000 });

        if (!res.data || !res.data.success || !res.data.result) {
            return sock.sendMessage(from, { text: `❌ Failed to fetch Europa League ${type}.` }, { quoted: msg });
        }

        const data = res.data.result;
        let text = `🌍 *EUROPA LEAGUE: ${type.toUpperCase()}* 🌍\n\n`;

        const standings = data.standings || [];
        standings.slice(0, 15).forEach(s => {
            text += `*${s.position}. ${s.team}* - ${s.points} pts\n`;
            text += `W: ${s.won} | D: ${s.draw} | L: ${s.lost} | GD: ${s.goalDifference}\n\n`;
        });

        text += `> ${small_lib.author}`;
        await sock.sendMessage(from, { text }, { quoted: msg });

    } catch (e) {
        console.log("Europa Error:", e.message);
        await sock.sendMessage(from, { text: `❌ API Error fetching Europa League ${type}.` }, { quoted: msg });
    }
};
