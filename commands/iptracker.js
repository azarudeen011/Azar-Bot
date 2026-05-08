const axios = require("axios");
const settings = require("../settings");
const small_lib = require("../lib/small_lib");

module.exports = async (sock, msg, from, body, args) => {
    const ipAddress = args[0];
    
    if (!ipAddress) {
        return sock.sendMessage(from, { text: `💻 *IP TRACKER*\n\nUsage: ${settings.prefix}iptracker <ip_address>\nExample: ${settings.prefix}iptracker 41.90.70.195` }, { quoted: msg });
    }

    try {
        await sock.sendMessage(from, { react: { text: "🔍", key: msg.key } }).catch(() => { });

        const url = `https://api.princetechn.com/api/stalk/ipstalk?apikey=prince&address=${encodeURIComponent(ipAddress)}`;
        const res = await axios.get(url, { timeout: 30000 });

        if (!res.data || !res.data.success || !res.data.result) {
            return sock.sendMessage(from, { text: "❌ Failed to track IP. Make sure the address is valid." }, { quoted: msg });
        }

        const data = res.data.result;
        let text = `💻 *IP TRACKER RESULTS* 💻\n\n`;
        text += `🌐 *IP Address:* ${data.ip}\n`;
        text += `🌍 *Continent:* ${data.continent} (${data.continentCode})\n`;
        text += `🗺️ *Country:* ${data.country} (${data.countryCode})\n`;
        text += `🏙️ *Region/City:* ${data.region}, ${data.city}\n`;
        text += `📮 *Postal Code:* ${data.postal || "N/A"}\n`;
        text += `🏢 *ISP/Org:* ${data.org}\n`;
        text += `📡 *ASN:* ${data.asn} (${data.asName})\n`;
        text += `⌚ *Timezone:* ${data.timezone}\n`;
        text += `📍 *Coordinates:* ${data.loc}\n\n`;
        text += `> ${small_lib.author}`;

        // Send location ping if coordinates are valid
        if (data.loc && data.loc.includes(",")) {
            const [lat, lon] = data.loc.split(",");
            await sock.sendMessage(from, { 
                location: { 
                    degreesLatitude: parseFloat(lat), 
                    degreesLongitude: parseFloat(lon),
                    name: `${data.city || "Unknown City"}, ${data.country || "Unknown Country"}`,
                    address: data.org || "IP Location"
                } 
            }, { quoted: msg });
        }

        // Send the text details afterwards
        await sock.sendMessage(from, { text }, { quoted: msg });

    } catch (e) {
        console.log("IP Tracker Error:", e.message);
        await sock.sendMessage(from, { text: "❌ API Error or Rate Limit. Try again later." }, { quoted: msg });
    }
};
