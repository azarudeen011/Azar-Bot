// commands/tt.js
// 🎵 Azahrabot TikTok Downloader (v10 — princetechn API with fallback)
const fs = require("fs");
const path = require("path");
const axios = require("axios");

function ensureTempDir() {
  const dir = path.join(__dirname, "../temp");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// 🌐 Expand TikTok short links
async function expandTikTokUrl(url) {
  if (!url.includes("vt.tiktok.com") && !url.includes("vm.tiktok.com")) return url;
  try {
    const res = await axios.get(url, { maxRedirects: 0, validateStatus: null });
    const loc = res.headers.location;
    if (loc && loc.startsWith("http")) {
      console.log("🔗 Expanded shortlink →", loc);
      return loc;
    }
  } catch (e) {
    console.warn("⚠️ Couldn’t expand shortlink:", e.message);
  }
  return url;
}

// 📥 Download media with retry strategies
async function downloadMedia(url, destPath) {
  const strategies = [
    {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      "Accept": "video/webm,video/mp4,video/*;q=0.9",
      "Referer": "https://www.tiktok.com/",
      "Origin": "https://www.tiktok.com",
    },
    {
      "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
      "Accept": "*/*",
      "Referer": "https://www.tiktok.com/",
    },
    null // no headers
  ];

  for (let i = 0; i < strategies.length; i++) {
    try {
      const headers = strategies[i];
      console.log(`🔄 Download attempt ${i + 1} with ${headers ? 'headers' : 'no headers'}`);

      const res = await axios({
        url,
        method: "GET",
        responseType: "arraybuffer",
        headers: headers || {},
        timeout: 30000,
        maxRedirects: 5,
      });

      const contentType = res.headers["content-type"] || "";
      const buffer = Buffer.from(res.data);

      console.log(`   → Status: ${res.status}, Type: ${contentType}, Size: ${buffer.length} bytes`);

      if (contentType.includes("text/html") || buffer.length < 10000) {
        console.log(`   ⚠️ Invalid response, trying next strategy...`);
        continue;
      }

      fs.writeFileSync(destPath, buffer);
      console.log("✅ Download successful");
      return;
    } catch (err) {
      console.log(`   ❌ Attempt ${i + 1} failed: ${err.message}`);
    }
  }

  throw new Error("All download strategies failed");
}

// Primary API: princetechn
async function getVideoFromPrinceTechn(ttUrl) {
  const apiUrl = `https://api.princetechn.com/api/download/tiktok?apikey=prince&url=${encodeURIComponent(ttUrl)}`;
  console.log("📡 Trying princetechn API:", apiUrl);
  const res = await axios.get(apiUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36",
      Accept: "application/json",
    },
    timeout: 15000,
  });
  const data = res.data;
  console.log("📦 princetechn response:", JSON.stringify(data, null, 2));
  if (data.status === 200 && data.success && data.result?.video) {
    return {
      videoUrl: data.result.video,
      title: data.result.title || "TikTok Video",
    };
  }
  throw new Error("princetechn API returned no video URL");
}

// Fallback API: eliteprotech
async function getVideoFromEliteProtech(ttUrl) {
  const apiUrl = `https://eliteprotech-apis.zone.id/tiktok?url=${encodeURIComponent(ttUrl)}`;
  console.log("📡 Fallback API (eliteprotech):", apiUrl);
  const res = await axios.get(apiUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36",
      Accept: "application/json",
    },
    timeout: 20000,
  });
  const data = res.data;
  console.log("📦 eliteprotech response:", JSON.stringify(data, null, 2));
  if (!data.success) throw new Error("eliteprotech API unsuccessful");
  const videoUrl = data.mp4_hd || data.mp4;
  if (!videoUrl) throw new Error("No video URL in eliteprotech response");
  return {
    videoUrl,
    title: data.title || "TikTok Video",
  };
}

module.exports = async (sock, msg, from) => {
  try {
    const text =
      msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
    const match = text.match(
      /(https?:\/\/(?:www\.|vt\.|vm\.)?tiktok\.com\/[^\s]+)/i
    );

    if (!match) {
      return await sock.sendMessage(
        from,
        {
          text: "❌ Invalid TikTok URL.\nExample:\n`.tt https://vt.tiktok.com/abc123/`",
        },
        { quoted: msg }
      );
    }

    let ttUrl = match[0];
    ttUrl = await expandTikTokUrl(ttUrl);

    await sock.sendMessage(from, { react: { text: "🎵", key: msg.key } });
    await sock.sendMessage(from, { text: "🎵 *Fetching TikTok video...*" }, { quoted: msg });

    // Try princetechn first, fallback to eliteprotech
    let videoInfo;
    try {
      videoInfo = await getVideoFromPrinceTechn(ttUrl);
      console.log("✅ Using princetechn API");
    } catch (err) {
      console.warn("⚠️ princetechn failed, falling back to eliteprotech:", err.message);
      try {
        videoInfo = await getVideoFromEliteProtech(ttUrl);
        console.log("✅ Using eliteprotech API (fallback)");
      } catch (fallbackErr) {
        throw new Error(`Both APIs failed: princetechn (${err.message}) / eliteprotech (${fallbackErr.message})`);
      }
    }

    const videoUrl = videoInfo.videoUrl;
    const title = videoInfo.title;

    console.log("🎬 Video URL:", videoUrl);

    const tempDir = ensureTempDir();
    const filePath = path.join(tempDir, `tiktok_${Date.now()}.mp4`);

    await downloadMedia(videoUrl, filePath);

    const buffer = fs.readFileSync(filePath);
    const caption = `📥 *Downloaded by AzahraBot*\n\n${title.substring(0, 100)}${title.length > 100 ? '…' : ''}`;

    await sock.sendMessage(from, { video: buffer, caption }, { quoted: msg });

    fs.unlinkSync(filePath);
    await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

  } catch (err) {
    console.error("❌ TikTok Command Error:", err.message);
    await sock.sendMessage(
      from,
      { text: `❌ *Download Failed*\n${err.message}\n\nPlease try another video.` },
      { quoted: msg }
    );
  }
};