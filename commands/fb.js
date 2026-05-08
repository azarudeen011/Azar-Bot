// ==============================================
// 📘 Azahrabot Facebook Downloader (v12 — elite-protech /facebook)
// ✅ Uses: https://eliteprotech-apis.zone.id/facebook (single video URL)
// ==============================================

const fs = require("fs");
const path = require("path");
const axios = require("axios");

function ensureTempDir() {
  const dir = path.join(__dirname, "../temp");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Expand Facebook shortlinks
async function expandFacebookUrl(url) {
  try {
    const res = await axios.get(url, { maxRedirects: 0, validateStatus: null });
    const loc = res.headers.location;
    if (loc && loc.startsWith("http")) {
      console.log("🔗 Expanded Facebook shortlink");
      return loc;
    }
  } catch {}
  return url;
}

// Extract Facebook URL from text
function extractFacebookUrl(text = "") {
  const fbRegex =
    /(https?:\/\/(?:www\.|m\.|fb\.|web\.|l\.)?(facebook\.com|fb\.watch)[^\s]*)/i;
  const match = text.match(fbRegex);
  return match ? match[0].split("?")[0] : null;
}

// Robust download with proper headers
async function downloadMedia(url, destPath) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1",
    "Accept": "*/*",
  };

  try {
    const res = await axios({
      url,
      method: "GET",
      responseType: "arraybuffer",
      headers,
      timeout: 30000,
      maxRedirects: 10,
    });

    const buffer = Buffer.from(res.data);
    
    // Check if the response is actually JSON metadata with a fileUrl (nested redirect)
    if (buffer.length < 3000) {
      try {
        const content = buffer.toString("utf8");
        const json = JSON.parse(content);
        if (json.fileUrl) {
          console.log("🔗 Found nested fileUrl in metadata, following redirect...");
          return await downloadMedia(json.fileUrl, destPath);
        }
      } catch (e) {
        // Not JSON, continue with normal size check
      }
    }

    if (buffer.length < 2000) {
      const content = buffer.toString("utf8").substring(0, 300);
      console.log("🔍 [DEBUG] Small file content:", content);
      
      if (content.includes("Cloudflare") || content.includes("Just a moment")) {
        throw new Error("Download blocked by Cloudflare protection on the media server.");
      }
      throw new Error(`Downloaded file too small (${buffer.length} bytes) – link might be expired or protected`);
    }

    fs.writeFileSync(destPath, buffer);
  } catch (err) {
    if (err.response?.status === 403) throw new Error("Access Forbidden (403) – The media server blocked the bot.");
    if (err.response?.status === 404) throw new Error("Media not found (404) – The download link has expired.");
    throw err;
  }
}

module.exports = async (sock, msg, from) => {
  try {
    const text =
      msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
    const fbUrl = extractFacebookUrl(text);

    if (!fbUrl) {
      return await sock.sendMessage(
        from,
        {
          text: "❌ Invalid Facebook URL.\nExample:\n`.fb https://www.facebook.com/share/v/...`\n`.fb https://fb.watch/.../`",
        },
        { quoted: msg }
      );
    }

    const finalUrl = await expandFacebookUrl(fbUrl);
    await sock.sendMessage(from, { react: { text: "📘", key: msg.key } });
    await sock.sendMessage(from, { text: "📘 *Fetching Facebook video...*" }, { quoted: msg });

    // --- Fetch Video URL (Try multiple APIs) ---
    let videoUrl = null;
    let apiData = null; // Store data for caption

    // 1. Try eliteprotech API
    try {
      const apiUrl = `https://eliteprotech-apis.zone.id/facebook?url=${encodeURIComponent(finalUrl)}`;
      console.log("🔗 Trying eliteprotech FB API:", apiUrl);
      const res = await axios.get(apiUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
          Accept: "application/json",
        },
        timeout: 15000,
      });
      const data = res.data;
      if (data.success && data.video) {
        console.log("✅ eliteprotech FB API success");
        videoUrl = data.video;
        apiData = data;
      }
    } catch (err) {
      console.warn("⚠️ eliteprotech FB API failed:", err.message);
    }

    // 2. Try anabot.my.id API (Fallback with Retry)
    if (!videoUrl) {
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries && !videoUrl) {
        try {
          console.log(`🔗 Trying anabot.my.id FB API (Attempt ${retryCount + 1})...`);
          const res = await axios.post("https://anabot.my.id/api/download/facebook", {
            url: finalUrl,
            apikey: "freeApikey"
          }, {
            headers: { "Content-Type": "application/json" },
            timeout: 25000,
          });

          const data = res.data;
          apiData = data;

          if (data.success && data.data?.result?.api?.mediaItems) {
            const items = data.data.result.api.mediaItems;
            if (items.length > 0) {
              // Find the best quality video or just the first one
              const videoItem = items.find(i => i.type === "Video" && i.mediaQuality === "FHD") || 
                                items.find(i => i.type === "Video" && i.mediaQuality === "HD") ||
                                items.find(i => i.type === "Video");
              
              if (videoItem && videoItem.mediaUrl) {
                console.log(`✅ anabot.my.id FB API success (${videoItem.mediaQuality || "N/A"})`);
                videoUrl = videoItem.mediaUrl;
                break;
              }
            }
          }

          // Handle "Processing started" or empty mediaItems with retry
          if (data.message === "Processing started." || (data.success && (!data.data?.result?.api?.mediaItems || data.data.result.api.mediaItems.length === 0))) {
            console.log("⏳ FB API is processing, waiting 4 seconds before retry...");
            await new Promise(r => setTimeout(r, 4000));
            retryCount++;
          } else {
            console.warn("⚠️ anabot.my.id FB API returned success:false or no items.");
            break; 
          }
        } catch (err) {
          console.error("⚠️ anabot.my.id FB API failed:", err.message);
          break;
        }
      }
    }

    if (!videoUrl) {
      throw new Error("No video URL could be extracted from any API (Try again in a few seconds if it was processing).");
    }

    // --- Download and send ---
    const tempDir = ensureTempDir();
    const filePath = path.join(tempDir, `fb_${Date.now()}.mp4`);

    await downloadMedia(videoUrl, filePath);

    const buffer = fs.readFileSync(filePath);
    await sock.sendMessage(
      from,
      {
        video: buffer,
        caption: `📥 *Downloaded by Azahra Bot (Facebook)*\nSource: ${apiData?.source || "Facebook"}`,
      },
      { quoted: msg }
    );

    fs.unlinkSync(filePath);
    await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

  } catch (err) {
    console.error("❌ Facebook download error:", err.message);
    await sock.sendMessage(
      from,
      { text: `❌ Failed: ${err.message}` },
      { quoted: msg }
    );
  }
};