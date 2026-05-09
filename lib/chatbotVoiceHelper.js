// ==============================================
// 🎙️ Chatbot Voice Helper (Anime Girl Edition)
// Converts AI text to high-quality anime voice notes
// ==============================================

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const ffmpegPath = require("ffmpeg-static");
const { tmpdir } = require("os");
const googleTTS = require("google-tts-api");

/**
 * Generate Anime Girl Voice Buffer
 * Uses high-quality VITS APIs with a 100% stable Google TTS + Pitch-Shift fallback
 */
async function generateAnimeVoice(text) {
    const apis = [
        `https://api.paxsenix.biz.id/api/vits?text=${encodeURIComponent(text)}&model=miku`,
        `https://api.agatz.xyz/api/vits?text=${encodeURIComponent(text)}&name=miku`,
        `https://api.lolhuman.xyz/api/anime/tts?apikey=free&text=${encodeURIComponent(text)}&name=miku`,
        `https://api.shizuka.site/anime-tts?text=${encodeURIComponent(text)}&character=miku`,
    ];

    let rawBuffer = null;
    let isFallback = false;

    for (const url of apis) {
        try {
            const response = await axios.get(url, { responseType: "arraybuffer", timeout: 8000 });
            const contentType = response.headers['content-type'] || "";
            if (response.data && response.data.byteLength > 2000 && contentType.includes('audio')) {
                rawBuffer = Buffer.from(response.data);
                break;
            }
        } catch (err) { }
    }

    if (!rawBuffer) {
        try {
            const ttsUrl = googleTTS.getAudioUrl(text, { lang: "en", slow: false, host: "https://translate.google.com" });
            const res = await axios.get(ttsUrl, { responseType: "arraybuffer" });
            rawBuffer = Buffer.from(res.data);
            isFallback = true;
        } catch (e) { return null; }
    }

    try {
        const id = Date.now() + "_voice";
        const tempDir = tmpdir();
        const inPath = path.join(tempDir, `${id}.mp3`);
        const outPath = path.join(tempDir, `${id}.opus`);

        fs.writeFileSync(inPath, rawBuffer);

        // 🎀 Tuning: pitch=1.08 (more natural) + atempo=1.05 (relaxed but energetic)
        const filter = isFallback ? "rubberband=pitch=1.09,atempo=1.10,aresample=44100" : "atempo=1.08";

        await new Promise((resolve, reject) => {
            exec(`"${ffmpegPath}" -i "${inPath}" -af "${filter}" -c:a libopus -b:a 64k -vbr on "${outPath}"`, (err) => (err ? reject(err) : resolve()));
        });

        const buffer = fs.readFileSync(outPath);
        try { fs.unlinkSync(inPath); fs.unlinkSync(outPath); } catch (e) { }
        return buffer;
    } catch (err) {
        console.error("❌ [AI Voice] Conversion Failed:", err.message);
        return null;
    }
}

/**
 * Main function to send a chatbot voice note
 */
async function sendChatbotVoice(sock, from, text, quotedMsg) {
    try {
        if (!text) return;

        // 1. Aggressive Text Cleaning
        let cleanText = text.replace(/\[MOOD:\s*\w+\]/gi, "").trim();

        // 🔥 Ultra-Aggressive Prefix Stripper: Removes "Azahra:", "AzahraBot:", "Reply:", or ANY name at the start
        cleanText = cleanText.replace(/^[a-z0-9\s_-]+:\s*/i, "").trim();

        // 🛑 Filler Eraser: Remove robotic AI starters like "Sure,", "Certainly,", "Mind sparkle," etc.
        const forbiddenStarters = /^(sure|certainly|mind sparkle|here goes|okay here is|here is your response|alright here is|here is the|sure thing)[,\s.]+/i;
        cleanText = cleanText.replace(forbiddenStarters, "").trim();

        // 🎙️ Show "Recording Audio" for realism
        await sock.sendPresenceUpdate("recording", from).catch(() => { });

        const voiceBuffer = await generateAnimeVoice(cleanText);

        if (!voiceBuffer) {
            await sock.sendPresenceUpdate("paused", from).catch(() => { });
            return false;
        }

        await sock.sendMessage(from, {
            audio: voiceBuffer,
            mimetype: "audio/ogg; codecs=opus",
            ptt: true,
            waveform: Array.from({ length: 20 }, () => Math.floor(Math.random() * 100)),
        }, { quoted: quotedMsg });

        await sock.sendPresenceUpdate("paused", from).catch(() => { });
        return true;
    } catch (err) {
        console.error("❌ [AI Voice] Send Error:", err.message);
        return false;
    }
}

module.exports = { sendChatbotVoice };
