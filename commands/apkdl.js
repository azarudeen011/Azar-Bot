const axios = require("axios");
const settings = require("../settings");
const small_lib = require("../lib/small_lib");

module.exports = async (sock, msg, from, body, args) => {
    const appName = args.join(" ").trim();
    
    if (!appName) {
        return sock.sendMessage(from, { text: `📦 *APK DOWNLOADER*\n\nUsage: ${settings.prefix}apkdl <App Name>\nExample: ${settings.prefix}apkdl Whatsapp` }, { quoted: msg });
    }

    try {
        await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } }).catch(() => { });

        const url = `https://api.princetechn.com/api/download/apkdl?apikey=prince&appName=${encodeURIComponent(appName)}`;
        const res = await axios.get(url, { timeout: 30000 });

        if (!res.data || !res.data.success || !res.data.result) {
            return sock.sendMessage(from, { text: "❌ Failed to fetch the APK. App might not exist or API is offline." }, { quoted: msg });
        }

        const data = res.data.result;
        
        let captionText = `📦 *APK DOWNLOADER* 📦\n\n`;
        captionText += `📱 *App:* ${data.appname}\n`;
        captionText += `👨‍💻 *Developer:* ${data.developer}\n\n`;
        captionText += `⏳ _Downloading document, please wait..._\n\n`;
        captionText += `> ${small_lib.author}`;

        // Ping with cover image
        if (data.appicon) {
             await sock.sendMessage(from, { image: { url: data.appicon }, caption: captionText }, { quoted: msg });
        } else {
             await sock.sendMessage(from, { text: captionText }, { quoted: msg });
        }
        
        // Send actual APK Document using direct stream fetch 
        await sock.sendMessage(from, { 
            document: { url: data.download_url }, 
            mimetype: "application/vnd.android.package-archive",
            fileName: `${data.appname.replace(/[^a-zA-Z0-9 ]/g, "")}.apk`
        }, { quoted: msg });

        await sock.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => { });

    } catch (e) {
        console.log("APK DL Error:", e.message);
        await sock.sendMessage(from, { text: "❌ Failed to download the APK. Filesize might be too large or an internal API defect occurred." }, { quoted: msg });
    }
};
