// ==============================================
// 📸 Azahrabot Instagram Downloader
// Fallback: princetechn API → eliteprotech API
// ==============================================

const fs = require("fs");
const path = require("path");
const axios = require("axios");

function ensureTempDir() {
  const dir = path.join(__dirname, "../temp");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// -----------------------------
// Fetch media URLs – try princetechn first, then eliteprotech
// -----------------------------
async function getMediaFromAPI(igUrl) {
  // 1. Try princetechn API
  try {
    const princetechnUrl = `https://api.princetechn.com/api/download/instadl?apikey=prince&url=${encodeURIComponent(igUrl)}`;
    console.log("🔗 Trying princetechn API:", princetechnUrl);
    const res = await axios.get(princetechnUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36",
        Accept: "application/json",
      },
      timeout: 15000,
    });
    const data = res.data;
    if (data.status === 200 && data.success && data.result?.download_url) {
      console.log("✅ princetechn API success");
      return [data.result.download_url];
    }
  } catch (err) {
    console.warn("⚠️ princetechn API failed:", err.message);
  }

  // 2. Try eliteprotech API
  try {
    const eliteprotechUrl = `https://eliteprotech-apis.zone.id/instagram?url=${encodeURIComponent(igUrl)}`;
    console.log("🔗 Trying eliteprotech API:", eliteprotechUrl);
    const res = await axios.get(eliteprotechUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36",
        Accept: "application/json",
        Referer: "https://eliteprotech-apis.zone.id/",
        Origin: "https://eliteprotech-apis.zone.id",
      },
      timeout: 15000,
    });
    const data = res.data;
    if (data.success && data.links && data.links.length) {
      const downloadUrls = [];
      for (const item of data.links) {
        if (typeof item === "string" && item.startsWith("http")) {
          downloadUrls.push(item);
        } else if (item && typeof item === "object") {
          for (const [baseUrl, queryString] of Object.entries(item)) {
            if (baseUrl.startsWith("http")) {
              const fullUrl = baseUrl + (queryString ? "?" + queryString : "");
              downloadUrls.push(fullUrl);
            }
          }
        }
      }
      if (downloadUrls.length > 0) {
        console.log("✅ eliteprotech API success");
        return downloadUrls;
      }
    }
  } catch (err) {
    console.warn("⚠️ eliteprotech API failed:", err.message);
  }

  // 3. Try anabot.my.id API (Fallback provided by user)
  try {
    console.log("🔗 Trying anabot.my.id API...");
    const res = await axios.post("https://anabot.my.id/api/download/instagram", {
      url: igUrl,
      apikey: "freeApikey"
    }, {
      headers: { "Content-Type": "application/json" },
      timeout: 20000,
    });
    const data = res.data;
    if (data.success && data.data?.result) {
      const downloadUrls = data.data.result.map(item => item.url).filter(url => url && url.startsWith("http"));
      if (downloadUrls.length > 0) {
        console.log("✅ anabot.my.id API success");
        return downloadUrls;
      }
    }
  } catch (err) {
    console.error("⚠️ anabot.my.id API failed:", err.message);
  }

  return [];
}

// -----------------------------
// Download Media with browser-like headers
// -----------------------------
async function downloadMedia(url, dest) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "*/*",
    Referer: "https://www.instagram.com/",
    Origin: "https://www.instagram.com",
  };

  const res = await axios({
    url,
    method: "GET",
    responseType: "arraybuffer",
    headers,
    timeout: 30000,
  });

  const buffer = Buffer.from(res.data);
  if (buffer.length < 2000) {
    throw new Error(`Downloaded file too small (${buffer.length} bytes) – likely broken link`);
  }
  fs.writeFileSync(dest, buffer);
}

// -----------------------------
// IG Command Handler
// -----------------------------
module.exports = async (sock, msg, from) => {
  try {
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";

    const match = text.match(/(https?:\/\/(?:www\.)?(instagram\.com|instagr\.am)\/[^\s]+)/i);
    if (!match) {
      return await sock.sendMessage(
        from,
        { text: "❌ Invalid URL.\nExample: `.ig https://www.instagram.com/reel/...`" },
        { quoted: msg }
      );
    }

    const igUrl = match[0];
    await sock.sendMessage(from, { react: { text: "🔄", key: msg.key } });
    await sock.sendMessage(from, { text: "📸 *Fetching media...*" }, { quoted: msg });

    const mediaUrls = await getMediaFromAPI(igUrl);
    if (!mediaUrls.length) {
      return await sock.sendMessage(from, { text: "⚠️ No media found – maybe private post." }, { quoted: msg });
    }

    const tempDir = ensureTempDir();
    let successCount = 0;

    for (let i = 0; i < mediaUrls.length; i++) {
      const mediaUrl = mediaUrls[i];
      const isVideo = mediaUrl.includes(".mp4") || mediaUrl.includes("video") || mediaUrl.includes("?token");
      const ext = isVideo ? "mp4" : "jpg";
      const savePath = path.join(tempDir, `ig_${Date.now()}_${i}.${ext}`);

      try {
        await downloadMedia(mediaUrl, savePath);
        const buffer = fs.readFileSync(savePath);
        const caption = "📥 *Downloaded by Azahra Bot*";

        if (isVideo) {
          await sock.sendMessage(from, { video: buffer, caption }, { quoted: msg });
        } else {
          await sock.sendMessage(from, { image: buffer, caption }, { quoted: msg });
        }

        fs.unlinkSync(savePath);
        successCount++;
        await new Promise(r => setTimeout(r, 700));
      } catch (err) {
        console.error(`❌ Item ${i} download failed:`, err.message);
        await sock.sendMessage(from, { text: `⚠️ Media ${i + 1} failed: ${err.message}` }, { quoted: msg });
      }
    }

    if (successCount === 0) throw new Error("All downloads failed");
    await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });
  } catch (err) {
    console.error("🔥 IG Command Error:", err.message);
    await sock.sendMessage(from, { text: `❌ Failed: ${err.message}` }, { quoted: msg });
  }
};