const axios = require("axios");
const settings = require("../../settings");
const small_lib = require("../../lib/small_lib");

module.exports = async (sock, msg, from, body, args) => {
    try {
        await sock.sendMessage(from, { react: { text: "📰", key: msg.key } }).catch(() => { });

        const url = "https://api.princetechn.com/api/football/news?apikey=prince";
        const res = await axios.get(url, { timeout: 30000 });

        if (!res.data || !res.data.result || !res.data.result.data.items) {
            return sock.sendMessage(from, { text: "❌ Failed to fetch news." }, { quoted: msg });
        }

        const items = res.data.result.data.items.slice(0, 4);
        const topNews = items[0];

        let text = `📰 *LATEST FOOTBALL NEWS*\n\n`;
        text += `🗞️ *${topNews.title}*\n${topNews.summary}\n\n`;

        if (items.length > 1) {
            text += `*Other Headlines:*\n`;
            for (let i = 1; i < items.length; i++) {
                text += `▪️ ${items[i].title}\n`;
            }
        }
        text += `\n> ${small_lib.author}`;

        await sock.sendMessage(from, {
            image: { url: topNews.cover.url },
            caption: text
        }, { quoted: msg });

    } catch (e) {
        console.log("News Error:", e.message);
        await sock.sendMessage(from, { text: "❌ API Error. Try again later." }, { quoted: msg });
    }
};
