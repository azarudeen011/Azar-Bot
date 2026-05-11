// commands/pinterest.js
// 📌 Azahrabot Pinterest Downloader (princetechn API)
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const API_KEY = "prince";
const API_URL = "https://api.princetechn.com/api/download/pinterestdl";

function ensureTempDir() {
    const dir = path.join(__dirname, "../temp");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

// Robust download from URL to buffer
async function downloadFile(url, timeoutMs = 45000) {
    const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: timeoutMs,
        maxContentLength: 100 * 1024 * 1024, // 100MB limit
        headers: {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1",
            "Accept": "*/*",
        },
    });
    
    const buffer = Buffer.from(response.data);
    if (buffer.length < 1000) {
        throw new Error("Downloaded file too small – the link might be protected.");
    }
    return buffer;
}

// Extract best media from API response
function getBestMedia(mediaArray) {
    // First try to find video (MP4)
    const videos = mediaArray.filter(item => item.format === "MP4");
    if (videos.length) {
        // Prefer higher quality: look for "720p", "1080p", etc.
        const qualityOrder = ["1080p", "720p", "480p", "360p", "240p", "144p"];
        for (const quality of qualityOrder) {
            const found = videos.find(v => v.type.toLowerCase().includes(quality));
            if (found) return found;
        }
        // If no quality match, return first video
        return videos[0];
    }
    // Otherwise, get image (JPG)
    const images = mediaArray.filter(item => item.format === "JPG");
    if (images.length) return images[0];
    return null;
}

module.exports = async (sock, msg, from) => {
    try {
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
        
        // Extract Pinterest URL
        const match = text.match(/(https?:\/\/(?:www\.)?(?:pin\.it|pinterest\.com|pinterest\.ca|pinterest\.co\.uk)\/[^\s]+)/i);
        
        if (!match) {
            return await sock.sendMessage(
                from,
                { text: "❌ Invalid URL.\nExample: `.pinterest https://pin.it/...`" },
                { quoted: msg }
            );
        }

        const pinterestUrl = match[0];
        await sock.sendMessage(from, { react: { text: "🔍", key: msg.key } });
        await sock.sendMessage(from, { text: "📌 *Fetching Pinterest media...*" }, { quoted: msg });

        // Call the PrinceTech API
        const apiCallUrl = `${API_URL}?apikey=${API_KEY}&url=${encodeURIComponent(pinterestUrl)}`;
        console.log("📡 Pinterest API:", apiCallUrl);

        const response = await axios.get(apiCallUrl, {
            headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
            timeout: 15000,
        });

        const data = response.data;
        console.log("📦 API Response:", JSON.stringify(data, null, 2));

        if (!data.success || !data.result?.media?.length) {
            throw new Error(data.message || "No media found. The pin might be private or invalid.");
        }

        const mediaArray = data.result.media;
        const bestMedia = getBestMedia(mediaArray);
        if (!bestMedia) throw new Error("No downloadable media found.");

        const downloadUrl = bestMedia.download_url;
        const mediaType = bestMedia.format === "MP4" ? "video" : "image";
        const quality = bestMedia.type || (mediaType === "video" ? "Video" : "Image");

        await sock.sendMessage(from, { react: { text: "📥", key: msg.key } });
        await sock.sendMessage(from, { text: `⏳ Downloading ${mediaType} (${quality})...` }, { quoted: msg });

        // Download the file
        const fileBuffer = await downloadFile(downloadUrl);
        const fileSizeMB = fileBuffer.length / (1024 * 1024);
        const title = data.result.title || "Pinterest Media";
        const caption = `📌 *${title.substring(0, 80)}*\n📦 Size: ${fileSizeMB.toFixed(1)}MB\n> Downloaded via AzahraBot`;

        // Send according to type
        if (mediaType === "video") {
            await sock.sendMessage(from, {
                video: fileBuffer,
                mimetype: "video/mp4",
                caption: caption,
            }, { quoted: msg });
        } else {
            await sock.sendMessage(from, {
                image: fileBuffer,
                caption: caption,
            }, { quoted: msg });
        }

        await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (err) {
        console.error("❌ Pinterest command error:", err.message);
        await sock.sendMessage(from, {
            text: `❌ *Failed to download:*\n${err.message}`,
        }, { quoted: msg });
        await sock.sendMessage(from, { react: { text: "⚠️", key: msg.key } });
    }
};