const axios = require("axios");
const settings = require("../../settings");
const small_lib = require("../../lib/small_lib");

module.exports = async (sock, msg, from, body, args) => {
    try {
        const query = args.join(" ").toLowerCase().trim();
        let leagueQuery = "";
        
        const leagueMap = {
            "all": "All Leagues",
            "epl": "Premier League",
            "premier league": "Premier League",
            "laliga": "LaLiga",
            "bundesliga": "Bundesliga",
            "seriea": "Serie A",
            "serie a": "Serie A",
            "ligue1": "Ligue 1",
            "ligue 1": "Ligue 1",
            "europa": "Europa League",
            "europa league": "Europa League",
            "copa": "Copa del Rey",
            "copa del rey": "Copa del Rey",
            "coupe": "Coupe de France",
            "dfb": "DFB Cup",
            "nba": "NBA"
        };

        if (query) {
            if (leagueMap[query]) {
                leagueQuery = `&league=${encodeURIComponent(leagueMap[query])}`;
            } else if (query === "channels") {
                const chanRes = await axios.get(`https://api.princetechn.com/api/football/streaming/channels?apikey=prince`, { timeout: 30000 });
                if (chanRes.data && chanRes.data.success) {
                    let chanText = `📺 *AVAILABLE CHANNELS* 📺\n\n`;
                    chanRes.data.result.forEach(c => {
                        chanText += `🔹 *${c.name}*\n🔗 ${c.url}\n\n`;
                    });
                    chanText += `> ${small_lib.author}`;
                    return sock.sendMessage(from, { text: chanText }, { quoted: msg });
                }
            } else {
                let helpText = `📺 *LIVESTREAM FILTER*\n\nUsage: ${settings.prefix}livestream [league/channels]\n\n*Available Options:*\n`;
                helpText += `all, channels, epl, laliga, bundesliga, seriea, ligue1, europa, copa, coupe, dfb, nba`;
                return sock.sendMessage(from, { text: helpText }, { quoted: msg });
            }
        }

        await sock.sendMessage(from, { react: { text: "📺", key: msg.key } }).catch(() => { });

        const url = `https://api.princetechn.com/api/football/streaming?apikey=prince${leagueQuery}`;
        const res = await axios.get(url, { timeout: 30000 });

        if (!res.data || !res.data.success || !res.data.result || !res.data.result.matches) {
            return sock.sendMessage(from, { text: "❌ Failed to fetch live streams or no matches currently available for this selection." }, { quoted: msg });
        }

        let matches = res.data.result.matches;
        if (matches.length === 0) {
            return sock.sendMessage(from, { text: "ℹ️ No streams are currently live for that selection." }, { quoted: msg });
        }
        
        matches = matches.slice(0, 10); // Limit to top 10
        let filterName = res.data.result.league || (query ? leagueMap[query] : "ALL LEAGUES");
        let text = `📺 *FREE STREAMS: ${filterName.toUpperCase()}* 📺\n\n`;

        matches.forEach(m => {
            text += `🏆 *${m.league}*\n`;
            text += `⚔️ ${m.homeTeam} vs ${m.awayTeam}\n`;
            text += `⏱️ Time: ${new Date(m.startTime).toLocaleString()}\n`;
            
            if (m.streams && m.streams.length > 0) {
                text += `🔗 *Watch:* ${m.streams[0].url}\n`;
            } else {
                text += `🔗 *Watch:* No stream available yet\n`;
            }
            text += `\n`;
        });

        text += `> ${small_lib.author}`;

        await sock.sendMessage(from, { text }, { quoted: msg });

    } catch (e) {
        console.log("Streaming Error:", e.message);
        await sock.sendMessage(from, { text: "❌ API Error. Try again later." }, { quoted: msg });
    }
};
