const axios = require("axios");
const settings = require("../../settings");
const small_lib = require("../../lib/small_lib");

module.exports = async (sock, msg, from, body, args) => {
    const text = args.join(" ").trim();
    
    if (!text) {
        return sock.sendMessage(from, { text: "🎨 *LOGO MAKER*\n\nUsage: " + settings.prefix + "pixelglitch <text>\nExample: " + settings.prefix + "pixelglitch AzarTech" }, { quoted: msg });
    }

    try {
        await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } }).catch(() => { });

        const url = `https://api.princetechn.com/api/ephoto360/pixelglitch?apikey=prince&text=${encodeURIComponent(text)}`;
        const res = await axios.get(url, { timeout: 30000 });

        if (!res.data || !res.data.success || !res.data.result || !res.data.result.image_url) {
            return sock.sendMessage(from, { text: "❌ Failed to generate logo. API might be offline." }, { quoted: msg });
        }

        const imageUrl = res.data.result.image_url;
        const caption = `🎨 *LOGO GENERATED: PIXELGLITCH* 🎨\n\n> ${small_lib.author}`;

        await sock.sendMessage(from, { image: { url: imageUrl }, caption }, { quoted: msg });

    } catch (e) {
        console.log("pixelglitch Error:", e.message);
        await sock.sendMessage(from, { text: "❌ Failed to generate logo limits or internal error." }, { quoted: msg });
    }
};
