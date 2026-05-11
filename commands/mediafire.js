const axios = require("axios");
const settings = require("../settings");
const small_lib = require("../lib/small_lib");

module.exports = async (sock, msg, from, body, args) => {
    const mediafireUrl = args.join(" ").trim();
    
    if (!mediafireUrl || !mediafireUrl.includes("mediafire.com")) {
        return sock.sendMessage(from, { text: `🔥 *MEDIAFIRE DOWNLOADER*\n\nUsage: ${settings.prefix}mediafire <url>\nExample: ${settings.prefix}mediafire https://www.mediafire.com/...` }, { quoted: msg });
    }

    try {
        await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } }).catch(() => { });

        const url = `https://api.princetechn.com/api/download/mediafire?apikey=prince&url=${encodeURIComponent(mediafireUrl)}`;
        const res = await axios.get(url, { timeout: 30000 });

        if (!res.data || !res.data.success || !res.data.result) {
            return sock.sendMessage(from, { text: "❌ Failed to fetch Mediafire link. Link might be broken, expired, or private." }, { quoted: msg });
        }

        const data = res.data.result;
        
        let captionText = `🔥 *MEDIAFIRE DOWNLOADER* 🔥\n\n`;
        captionText += `📄 *File:* ${data.fileName}\n`;
        captionText += `📦 *Size:* ${data.fileSize}\n`;
        captionText += `🗂️ *Type:* ${data.fileType}\n`;
        captionText += `📅 *Uploaded:* ${data.uploadedOn}\n\n`;
        captionText += `⏳ _Sending document over WhatsApp, please wait..._\n\n`;
        captionText += `> ${small_lib.author}`;

        await sock.sendMessage(from, { text: captionText }, { quoted: msg });
        
        // Send true Document using Baileys stream
        await sock.sendMessage(from, { 
            document: { url: data.downloadUrl }, 
            mimetype: data.mimeType || "application/octet-stream",
            fileName: data.fileName
        }, { quoted: msg });

        await sock.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => { });

    } catch (e) {
        console.log("Mediafire DL Error:", e.message);
        await sock.sendMessage(from, { text: "❌ Failed to download Mediafire file. Filesize might exceed standard WhatsApp document limits (50-100MB)." }, { quoted: msg });
    }
};
