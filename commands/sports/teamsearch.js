const axios = require("axios");
const settings = require("../../settings");
const small_lib = require("../../lib/small_lib");

module.exports = async (sock, msg, from, body, args) => {
    const query = args.join(" ").trim();
    if (!query) {
         return sock.sendMessage(from, { text: `🔍 Example:\n${settings.prefix}teamsearch Real Madrid` }, { quoted: msg });
    }

    try {
        await sock.sendMessage(from, { react: { text: "🏟️", key: msg.key } }).catch(() => { });

        const url = `https://api.princetechn.com/api/football/team-search?apikey=prince&name=${encodeURIComponent(query)}`;
        const res = await axios.get(url, { timeout: 30000 });

        if (!res.data || !res.data.result || res.data.result.length === 0) {
            return sock.sendMessage(from, { text: "❌ Team not found." }, { quoted: msg });
        }

        const team = res.data.result[0];
        
        let text = `🏟️ *TEAM PROFILE* 🏟️\n\n`;
        text += `🛡️ *Name:* ${team.name}\n`;
        text += `🏆 *League:* ${team.league}\n`;
        text += `📍 *Location:* ${team.location}, ${team.country}\n`;
        text += `🏟️ *Stadium:* ${team.stadium} (Capacity: ${team.stadiumCapacity})\n`;
        text += `📅 *Formed:* ${team.formedYear}\n\n`;
        text += `📝 *Info:*\n${team.description ? team.description.substring(0, 300) : "No description available"}...\n\n`;
        text += `> ${small_lib.author}`;

        const imageUrl = team.badges?.large || team.badges?.small || team.badges?.banner;

        if (imageUrl) {
            await sock.sendMessage(from, { image: { url: imageUrl }, caption: text }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { text }, { quoted: msg });
        }

    } catch (e) {
        console.log("Team Search Error:", e.message);
        await sock.sendMessage(from, { text: "❌ API Error. Try again later." }, { quoted: msg });
    }
};
