const axios = require("axios");
const settings = require("../../settings");
const small_lib = require("../../lib/small_lib");

module.exports = async (sock, msg, from, body, args) => {
    const type = args[0] ? args[0].toLowerCase() : "";
    
    if (!type || !["standings", "scorers"].includes(type)) {
        let helpText = `🇮🇹 *SERIE A - FOOTBALL*\n\nUsage: ${settings.prefix}seriea <option>\n\n*Available Options:*\n`;
        helpText += `standings, scorers`;
        return sock.sendMessage(from, { text: helpText }, { quoted: msg });
    }

    try {
        await sock.sendMessage(from, { react: { text: "🇮🇹", key: msg.key } }).catch(() => { });

        const url = `https://api.princetechn.com/api/football/seriea/${type}?apikey=prince`;
        const res = await axios.get(url, { timeout: 30000 });

        if (!res.data || !res.data.success || !res.data.result) {
             return sock.sendMessage(from, { text: `❌ Failed to fetch Serie A ${type}.` }, { quoted: msg });
        }

        const data = res.data.result;
        let text = `🇮🇹 *SERIE A: ${type.toUpperCase()}* 🇮🇹\n\n`;

        if (type === "standings") {
            data.standings.slice(0, 15).forEach(s => {
                text += `*${s.position}. ${s.team}* - ${s.points} pts\n`;
                text += `W: ${s.won} | D: ${s.draw} | L: ${s.lost} | GD: ${s.goalDifference}\n\n`;
            });
        } else if (type === "scorers") {
            data.topScorers.slice(0, 10).forEach(s => {
                text += `*${s.rank}. ${s.player}* (${s.team})\n`;
                text += `⚽ Goals: ${s.goals} | 👟 Assists: ${s.assists}\n\n`;
            });
        }

        text += `> ${small_lib.author}`;
        await sock.sendMessage(from, { text }, { quoted: msg });

    } catch (e) {
        console.log("Serie A Error:", e.message);
        await sock.sendMessage(from, { text: `❌ API Error fetching Serie A ${type}.` }, { quoted: msg });
    }
};
