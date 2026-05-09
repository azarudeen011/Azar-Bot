// ==============================================
// 🤖 Chatbot Sticker Helper (AI Body Language)
// Fetches mood-based stickers without reactions or tags
// ==============================================

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const ffmpegPath = require("ffmpeg-static");
const { tmpdir } = require("os");

// ─── API CATEGORY MAPS (Subset from animeAction for speed) ───
const NEKOS_BEST_MAP = {
    poke: "poke", cry: "cry", kiss: "kiss", pat: "pat", hug: "hug", wink: "wink",
    facepalm: "facepalm", slap: "slap", cuddle: "cuddle", bite: "bite", nom: "nom",
    blush: "blush", dance: "dance", handhold: "handhold", happy: "happy",
    highfive: "highfive", kick: "kick", smile: "smile", smug: "smug",
    wave: "wave", yeet: "yeet", lick: "feed", bonk: "punch", bully: "kick",
    cringe: "facepalm", glomp: "hug", kill: "shoot",
};

const WAIFU_PICS_MAP = {
    poke: "poke", cry: "cry", kiss: "kiss", pat: "pat", hug: "hug", wink: "wink",
    slap: "slap", cuddle: "cuddle", bite: "bite", lick: "lick", nom: "nom",
    bonk: "bonk", blush: "blush", bully: "bully", cringe: "cringe", dance: "dance",
    glomp: "glomp", handhold: "handhold", happy: "happy", highfive: "highfive",
    kick: "kick", kill: "kill", smile: "smile", smug: "smug", wave: "wave", yeet: "yeet",
};

/**
 * Fetch GIF URL from multiple fallback APIs
 */
async function fetchGifUrl(mood) {
    // Priority 1: waifu.pics (best quality for many actions)
    if (WAIFU_PICS_MAP[mood]) {
        try {
            const res = await axios.get(`https://api.waifu.pics/sfw/${WAIFU_PICS_MAP[mood]}`, { timeout: 8000 });
            if (res.data?.url) return res.data.url;
        } catch (e) { }
    }

    // Priority 2: nekos.best
    if (NEKOS_BEST_MAP[mood]) {
        try {
            const res = await axios.get(`https://nekos.best/api/v2/${NEKOS_BEST_MAP[mood]}`, {
                timeout: 8000,
                headers: { "User-Agent": "AzahraBot/AI-Sticker" }
            });
            if (res.data?.results?.[0]?.url) return res.data.results[0].url;
        } catch (e) { }
    }

    return null;
}

/**
 * Main function to send a mood sticker
 */
async function sendMoodSticker(sock, from, mood) {
    try {
        if (!mood) return;

        // 1. Fetch the GIF
        const gifUrl = await fetchGifUrl(mood.toLowerCase());
        if (!gifUrl) return;

        // 2. Download GIF to buffer
        const gifBuffer = (await axios.get(gifUrl, { responseType: "arraybuffer", timeout: 15000 })).data;

        // 3. Convert to Sticker (WebP) using ffmpeg-static
        if (ffmpegPath && fs.existsSync(ffmpegPath)) {
            const id = Date.now() + "_" + Math.random().toString(36).slice(2, 6);
            const tempDir = tmpdir();
            const gifPath = path.join(tempDir, `ai_${id}.gif`);
            const webpPath = path.join(tempDir, `ai_${id}.webp`);

            fs.writeFileSync(gifPath, gifBuffer);

            // optimized for stickers (512x512, loop, an, vsync 0)
            const ffmpegCmd = `"${ffmpegPath}" -i "${gifPath}" -vf "fps=15,scale=512:512:force_original_aspect_ratio=increase,crop=512:512" -loop 0 -an -vsync 0 -vcodec libwebp "${webpPath}"`;

            await new Promise((resolve, reject) => {
                exec(ffmpegCmd, { timeout: 15000 }, (err) => (err ? reject(err) : resolve()));
            });

            if (fs.existsSync(webpPath)) {
                await sock.sendMessage(from, {
                    sticker: fs.readFileSync(webpPath)
                    // NO mentions, NO reactions - per user request
                });
            }

            // Cleanup
            try { fs.unlinkSync(gifPath); } catch (_) { }
            try { fs.unlinkSync(webpPath); } catch (_) { }
        }
    } catch (err) {
        console.error("❌ [AI Sticker] Failed:", err.message);
    }
}

module.exports = { sendMoodSticker };
