const axios = require("axios");
const settings = require("../../settings");
const small_lib = require("../../lib/small_lib");

module.exports = async (sock, msg, from, body, args) => {
    const query = args.join(" ").trim();
    if (!query) {
         return sock.sendMessage(from, { text: `🔍 Example:\n${settings.prefix}playersearch Ronaldo` }, { quoted: msg });
    }

    try {
        await sock.sendMessage(from, { react: { text: "🔍", key: msg.key } }).catch(() => { });

        const url = `https://api.princetechn.com/api/football/player-search?apikey=prince&name=${encodeURIComponent(query)}`;
        const res = await axios.get(url, { timeout: 30000 });

        if (!res.data || !res.data.result || res.data.result.length === 0) {
            return sock.sendMessage(from, { text: "❌ Player not found." }, { quoted: msg });
        }

        const player = res.data.result[0];
        
        let text = `⚽ *PLAYER PROFILE* ⚽\n\n`;
        text += `👤 *Name:* ${player.name}\n`;
        text += `👕 *Team:* ${player.team}\n`;
        text += `🌍 *Nationality:* ${player.nationality}\n`;
        text += `🏃 *Position:* ${player.position}\n`;
        text += `📅 *Birth Date:* ${player.birthDate}\n`;
        text += `📊 *Status:* ${player.status}\n\n`;
        text += `> ${small_lib.author}`;

        const imageUrl = player.cutout || player.thumbnail;

        if (imageUrl) {
            await sock.sendMessage(from, { image: { url: imageUrl }, caption: text }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { text }, { quoted: msg });
        }

    } catch (e) {
        console.log("Player Search Error:", e.message);
        await sock.sendMessage(from, { text: "❌ API Error. Try again later." }, { quoted: msg });
    }
};
