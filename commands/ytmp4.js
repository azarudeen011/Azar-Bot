// commands/ytmp4.js
// 🎬 Azahrabot YouTube MP4 Downloader (v1.0)
// Uses: https://eliteprotech-apis.zone.id/ytdown?url=<link>&format=mp4

const fs = require("fs");
const path = require("path");
const axios = require("axios");

function ensureTempDir() {
  const dir = path.join(__dirname, "../temp");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// 📥 Download file from URL (with stream to save memory)
async function downloadFile(url, destPath) {
  const writer = fs.createWriteStream(destPath);
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
    timeout: 60000, // 60 seconds for larger videos
    maxRedirects: 5,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      "Accept": "video/mp4,video/*;q=0.9,*/*;q=0.8",
      "Referer": "https://eliteprotech-apis.zone.id/",
    },
  });

  return new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

module.exports = async (sock, msg, from, text, args) => {
  try {
    const url = args[0]?.trim();
    if (!url) {
      return await sock.sendMessage(
        from,
        {
          text: "❌ Please provide a YouTube link.\nExample:\n`.ytmp4 https://youtu.be/abc123`\n`.ytmp4 https://www.youtube.com/watch?v=abc123`",
        },
        { quoted: msg }
      );
    }

    // Simple YouTube URL validation (starts with common patterns)
    const isValid = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(url);
    if (!isValid) {
      return await sock.sendMessage(
        from,
        { text: "❌ That doesn't look like a valid YouTube link." },
        { quoted: msg }
      );
    }

    await sock.sendMessage(from, { react: { text: "🎬", key: msg.key } });
    await sock.sendMessage(from, { text: "🎬 *Fetching video information...*" }, { quoted: msg });

    // --- Call the API ---
    const apiUrl = `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(url)}&format=mp4`;
    console.log("📡 API URL:", apiUrl);

    const apiRes = await axios.get(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
        Accept: "application/json",
      },
      timeout: 20000,
    });

    const data = apiRes.data;
    console.log("📦 API Response:", JSON.stringify(data, null, 2));

    if (!data.success || !data.downloadURL) {
      throw new Error("API did not return a download link");
    }

    const downloadUrl = data.downloadURL;
    const title = data.title || "YouTube Video";

    await sock.sendMessage(
      from,
      { text: `📥 *Downloading:*\n${title.substring(0, 50)}...` },
      { quoted: msg }
    );

    const tempDir = ensureTempDir();
    const filePath = path.join(tempDir, `yt_${Date.now()}.mp4`);

    await downloadFile(downloadUrl, filePath);

    const stats = fs.statSync(filePath);
    console.log(`✅ Downloaded ${stats.size} bytes`);

    // Send the video
    await sock.sendMessage(
      from,
      {
        video: fs.readFileSync(filePath),
        caption: `📥 *Downloaded by AzahraBot*\n\n🎬 ${title}`,
      },
      { quoted: msg }
    );

    // Cleanup
    fs.unlinkSync(filePath);
    await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

  } catch (err) {
    console.error("❌ ytmp4 Error:", err.message);
    await sock.sendMessage(
      from,
      { text: `❌ *Download Failed*\n${err.message}\n\nPlease try another video or check the console.` },
      { quoted: msg }
    );
  }
};