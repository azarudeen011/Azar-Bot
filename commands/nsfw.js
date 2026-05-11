// commands/nsfw.js
// 🔞 Azahrabot NSFW Random Video (v1.0)
// Uses: https://eliteprotech-apis.zone.id/nsfw?random=true

const fs = require("fs");
const path = require("path");
const axios = require("axios");

function ensureTempDir() {
  const dir = path.join(__dirname, "../temp");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// 📥 Download video with robust headers
async function downloadVideo(url, destPath) {
  const strategies = [
    {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36",
      "Accept": "video/webm,video/mp4,video/*;q=0.9,*/*;q=0.8",
      "Referer": "https://sfmcompile.club/",
      "Origin": "https://sfmcompile.club",
    },
    {
      "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
      "Accept": "*/*",
      "Referer": "https://www.google.com/",
    },
    null, // no headers
  ];

  for (let i = 0; i < strategies.length; i++) {
    try {
      const headers = strategies[i];
      console.log(`🔄 Download attempt ${i+1} with ${headers ? 'headers' : 'no headers'}`);

      const res = await axios({
        url,
        method: "GET",
        responseType: "arraybuffer",
        headers: headers || {},
        timeout: 60000,
        maxRedirects: 5,
      });

      const buffer = Buffer.from(res.data);
      if (buffer.length < 50000) {
        console.log(`   ⚠️ File too small (${buffer.length} bytes), skipping`);
        continue;
      }

      fs.writeFileSync(destPath, buffer);
      console.log("✅ Download successful");
      return;
    } catch (err) {
      console.log(`   ❌ Attempt ${i+1} failed: ${err.message}`);
    }
  }

  throw new Error("All download strategies failed");
}

module.exports = async (sock, msg, from, text, args) => {
  try {
    // Optional age verification warning (can be removed)
    const warningMsg = "🔞 *WARNING: Adult Content*\nThis command fetches NSFW material. By proceeding, you confirm you are 18+ and consent to viewing such content.\n\nReply with *YES* within 15 seconds to continue.";

    await sock.sendMessage(from, { text: warningMsg }, { quoted: msg });

    // Simple confirmation (similar to your azarbug.js)
    let confirmed = false;
    const startTime = Date.now();
    const listener = (upsert) => {
      const m = upsert.messages?.[0];
      if (!m) return;
      const text = m.message?.conversation || m.message?.extendedTextMessage?.text || "";
      if (m.key.remoteJid === from && text.toLowerCase() === "yes") {
        confirmed = true;
      }
    };
    sock.ev.on("messages.upsert", listener);
    while (Date.now() - startTime < 15000 && !confirmed) {
      await new Promise(r => setTimeout(r, 500));
    }
    sock.ev.off("messages.upsert", listener);

    if (!confirmed) {
      return await sock.sendMessage(from, { text: "❌ Command cancelled (timeout)." }, { quoted: msg });
    }

    await sock.sendMessage(from, { react: { text: "🔞", key: msg.key } });
    await sock.sendMessage(from, { text: "🔞 *Fetching random NSFW video...*" }, { quoted: msg });

    const apiUrl = "https://eliteprotech-apis.zone.id/nsfw?random=true";
    console.log("📡 API URL:", apiUrl);

    const res = await axios.get(apiUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Android) Chrome/120", Accept: "application/json" },
      timeout: 20000,
    });

    const data = res.data;
    console.log("📦 API Response:", JSON.stringify(data, null, 2));

    if (!data.success || !data.results || data.results.length === 0) {
      throw new Error("No results from API");
    }

    // Pick a random video from the 8 results
    const videos = data.results;
    const randomIndex = Math.floor(Math.random() * videos.length);
    const video = videos[randomIndex];

    const title = video.title || "Untitled";
    const category = video.category || "Unknown";
    const views = video.views_count || 0;
    const shares = video.share_count || 0;
    const videoUrl = video.mp4;

    if (!videoUrl) {
      throw new Error("Video URL missing");
    }

    await sock.sendMessage(
      from,
      { text: `📥 *Downloading:*\n${title}\nCategory: ${category}` },
      { quoted: msg }
    );

    const tempDir = ensureTempDir();
    const filePath = path.join(tempDir, `nsfw_${Date.now()}.mp4`);

    await downloadVideo(videoUrl, filePath);

    const buffer = fs.readFileSync(filePath);
    const caption = `🔞 *${title}*\n📂 Category: ${category}\n👁️ Views: ${views}  |  🔗 Shares: ${shares}\n\n> Downloaded via AzahraBot`;

    await sock.sendMessage(from, { video: buffer, caption }, { quoted: msg });

    fs.unlinkSync(filePath);
    await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

  } catch (err) {
    console.error("❌ nsfw Command Error:", err.message);
    await sock.sendMessage(
      from,
      { text: `❌ *Failed*\n${err.message}\nPlease try again later.` },
      { quoted: msg }
    );
  }
};