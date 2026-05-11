// commands/ytmp3.js
// 🎵 Azahrabot YouTube MP3 Downloader (v1.2 — with format detection & conversion)
// Uses: https://eliteprotech-apis.zone.id/ytdown?url=<link>&format=mp3

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { fileTypeFromBuffer } = require("file-type");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

function ensureTempDir() {
  const dir = path.join(__dirname, "../temp");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// 📥 Download with multiple strategies
async function downloadFile(url, destPath) {
  const strategies = [
    {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121",
      "Accept": "*/*",
      "Referer": "https://eliteprotech-apis.zone.id/",
    },
    {
      "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile",
    },
    null,
  ];

  for (let i = 0; i < strategies.length; i++) {
    try {
      const headers = strategies[i];
      console.log(`🔄 Download attempt ${i+1}...`);

      const res = await axios({
        url,
        method: "GET",
        responseType: "arraybuffer",
        headers: headers || {},
        timeout: 60000,
        maxRedirects: 5,
      });

      const buffer = Buffer.from(res.data);
      console.log(`   → Size: ${buffer.length} bytes`);

      if (buffer.length < 5000) {
        console.log(`   ⚠️ File too small, skipping`);
        continue;
      }

      fs.writeFileSync(destPath, buffer);
      console.log(`✅ Downloaded to ${destPath}`);
      return buffer;
    } catch (err) {
      console.log(`   ❌ Attempt ${i+1} failed: ${err.message}`);
    }
  }
  throw new Error("All download strategies failed");
}

module.exports = async (sock, msg, from, text, args) => {
  try {
    const url = args[0]?.trim();
    if (!url) {
      return await sock.sendMessage(from, { text: "❌ Usage: .ytmp3 <youtube-link>" }, { quoted: msg });
    }

    await sock.sendMessage(from, { react: { text: "🎵", key: msg.key } });
    await sock.sendMessage(from, { text: "🎵 *Fetching audio...*" }, { quoted: msg });

    const apiUrl = `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(url)}&format=mp3`;
    console.log("📡 API URL:", apiUrl);

    const apiRes = await axios.get(apiUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Android) Chrome/120", Accept: "application/json" },
      timeout: 20000,
    });

    const data = apiRes.data;
    console.log("📦 API Response:", JSON.stringify(data, null, 2));

    if (!data.success || !data.downloadURL) {
      throw new Error("API did not return a download link");
    }

    const downloadUrl = data.downloadURL;
    const title = data.title || "YouTube Audio";

    await sock.sendMessage(from, { text: `📥 *Downloading:*\n${title.substring(0, 50)}...` }, { quoted: msg });

    const tempDir = ensureTempDir();
    const rawPath = path.join(tempDir, `yt_raw_${Date.now()}.bin`);

    const buffer = await downloadFile(downloadUrl, rawPath);

    // Detect file type
    const type = await fileTypeFromBuffer(buffer);
    console.log("🔍 Detected type:", type);

    let finalPath = rawPath;
    let finalMime = "audio/mpeg";
    let finalExt = "mp3";

    // If it's a video, convert to MP3
    if (type && (type.mime.startsWith("video/") || type.ext === "mp4")) {
      console.log("🎬 Detected video, converting to MP3...");
      await sock.sendMessage(from, { text: "🔄 *Converting video to audio...*" }, { quoted: msg });

      const mp3Path = path.join(tempDir, `yt_audio_${Date.now()}.mp3`);
      await new Promise((resolve, reject) => {
        ffmpeg(rawPath)
          .toFormat("mp3")
          .on("end", resolve)
          .on("error", reject)
          .save(mp3Path);
      });

      finalPath = mp3Path;
      fs.unlinkSync(rawPath); // remove original
    } else if (type && type.mime !== "audio/mpeg") {
      // Other unexpected format, warn but still send as audio with generic MIME
      console.log(`⚠️ Unexpected format: ${type.mime}`);
      finalMime = type.mime;
      finalExt = type.ext;
    }

    // Send the audio
    const audioBuffer = fs.readFileSync(finalPath);
    await sock.sendMessage(
      from,
      {
        audio: audioBuffer,
        mimetype: finalMime,
        fileName: `${title}.${finalExt}`,
      },
      { quoted: msg }
    );

    // Cleanup
    fs.unlinkSync(finalPath);
    await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

  } catch (err) {
    console.error("❌ ytmp3 Error:", err.message);
    await sock.sendMessage(from, { text: `❌ *Failed*\n${err.message}` }, { quoted: msg });
  }
};