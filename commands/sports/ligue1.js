const axios = require("axios");
const settings = require("../../settings");
const small_lib = require("../../lib/small_lib");

module.exports = async (sock, msg, from, body, args) => {
    const type = args[0] ? args[0].toLowerCase() : "";

    if (!type || !["standings", "scorers", "matches", "upcoming"].includes(type)) {
        let helpText = `🇫🇷 *LIGUE 1 - FOOTBALL*\n\nUsage: ${settings.prefix}ligue1 <option>\n\n*Available Options:*\n`;
        helpText += `standings, scorers, matches, upcoming`;
        return sock.sendMessage(from, { text: helpText }, { quoted: msg });
    }

    try {
        await sock.sendMessage(from, { react: { text: "⚽", key: msg.key } }).catch(() => { });

        const endpoint = type === "scorers" ? "scorers" : type;
        const url = `https://api.princetechn.com/api/football/ligue1/${endpoint}?apikey=prince`;
        const res = await axios.get(url, { timeout: 30000 });

        if (!res.data || !res.data.success || !res.data.result) {
            return sock.sendMessage(from, { text: `❌ Failed to fetch Ligue 1 ${type}.` }, { quoted: msg });
        }

        const data = res.data.result;
        let text = `🇫🇷 *LIGUE 1: ${type.toUpperCase()}* 🇫🇷\n\n`;

        if (type === "standings") {
            const standings = data.standings || [];
            standings.slice(0, 15).forEach(s => {
                text += `*${s.position}. ${s.team}* - ${s.points} pts\n`;
                text += `W: ${s.won} | D: ${s.draw} | L: ${s.lost} | GD: ${s.goalDifference}\n\n`;
            });
        } else if (type === "scorers") {
            const scorers = data.topScorers || [];
            scorers.slice(0, 10).forEach(s => {
                text += `*${s.rank}. ${s.player}* (${s.team})\n`;
                text += `⚽ Goals: ${s.goals} | 👟 Assists: ${s.assists}\n\n`;
            });
        } else if (type === "matches" || type === "upcoming") {
            const matchData = data.matches || data.upcomingMatches || [];
            matchData.slice(0, 10).forEach(m => {
                text += `📅 ${m.date || "Matchday " + m.matchday}\n`;
                text += `⚔️ ${m.homeTeam}  ${m.score || "vs"}  ${m.awayTeam}\n\n`;
            });
        }

        text += `> ${small_lib.author}`;
        await sock.sendMessage(from, { text }, { quoted: msg });

    } catch (e) {
        console.log("Ligue 1 Error:", e.message);
        await sock.sendMessage(from, { text: `❌ API Error fetching Ligue 1 ${type}.` }, { quoted: msg });
    }
};
