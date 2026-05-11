// ==============================================
// 🎬 Azahrabot — .aivideo Command
// Text to AI Video Generator
// Powered by Azar Tech ⚡
// ==============================================

const axios = require("axios");
const settings = require("../settings");

module.exports = async (sock, msg, from, text, args = []) => {

  try {

    const prompt = args.join(" ").trim();

    if (!prompt) {
      return sock.sendMessage(from, {
        text:
          `🎬 *AI Video Generator*\n\n` +
          `Usage:\n${settings.prefix}aivideo <prompt>\n\n` +
          `Example:\n${settings.prefix}aivideo a cat walking on the moon\n\n` +
          `> Powered by Azar Tech ⚡`
      }, { quoted: msg });
    }

    // ⭐ Cooldown — 30s between video requests
    global.videoCD ??= new Map();
    if (global.videoCD.get(from) && Date.now() - global.videoCD.get(from) < 30000) {
      const remaining = Math.ceil((30000 - (Date.now() - global.videoCD.get(from))) / 1000);
      return sock.sendMessage(from, {
        text: `⏳ Please wait ${remaining}s before generating another video.`
      }, { quoted: msg });
    }
    global.videoCD.set(from, Date.now());

    // React + loading message
    await sock.sendMessage(from, { react: { text: "🎬", key: msg.key } }).catch(() => {});
    await sock.sendMessage(from, {
      text: "⏳ *Generating AI Video...*\n\n🎬 Prompt: _" + prompt + "_\n\nPlease wait, this may take a moment..."
    }, { quoted: msg });
    await sock.sendPresenceUpdate("recording", from).catch(() => {});

    // ── Step 1: Call the text-to-video API ──
    const apiUrl = `https://text-to-video-mj.vercel.app/generate?prompt=${encodeURIComponent(prompt)}`;

    const res = await axios.get(apiUrl, {
      timeout: 120000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    const data = res.data;

    if (!data || data.status !== "success" || !data.url) {
      throw new Error("API did not return a valid video");
    }

    const videoUrl = data.url;

    // ── Step 2: Try sending video directly via URL ──
    // Baileys will internally download & upload it to WhatsApp
    try {
      await sock.sendMessage(from, {
        video: { url: videoUrl },
        mimetype: "video/mp4",
        caption:
          `🎬 *AI Video Generated Successfully*\n\n` +
          `📝 *Prompt:* ${prompt}\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `> Powered by Azar Tech ⚡`
      }, { quoted: msg });

      await sock.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
      return; // success — done!

    } catch (dlErr) {
      console.log("AI Video direct URL failed:", dlErr.message);
    }

    // ── Step 3: Fallback — send the video link ──
    // If we can't download/send the video (network block, etc.)
    // send the link so user can still watch it
    await sock.sendMessage(from, {
      text:
        `🎬 *AI Video Generated!*\n\n` +
        `📝 *Prompt:* ${prompt}\n\n` +
        `▶️ *Watch/Download your video:*\n${videoUrl}\n\n` +
        `_Tap the link above to view your AI video_\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `> Powered by Azar Tech ⚡`
    }, { quoted: msg });

    await sock.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});

  } catch (err) {

    console.log("AI Video Error:", err.message);

    await sock.sendMessage(from, {
      text:
        `⚠️ *Video generation failed*\n\n` +
        `Error: ${err.message}\n\n` +
        `Please try again with a different prompt.\n\n` +
        `> Powered by Azar Tech ⚡`
    }, { quoted: msg });

    await sock.sendMessage(from, { react: { text: "⚠️", key: msg.key } }).catch(() => {});

  }

};
