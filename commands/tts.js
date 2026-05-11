// ==============================================
// 🔊 Azahrabot — .tts Command (v6.0 Reply Edition)
// Text → Voice • Multi-language • Reply Support Added
// ==============================================

const googleTTS = require("google-tts-api");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const secure = require("../lib/small_lib");

module.exports = async (sock, msg, from, text, args = []) => {
  try {
    // 🔍 Extract replied message (if exists)
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const repliedText =
      quoted?.conversation ||
      quoted?.extendedTextMessage?.text ||
      quoted?.imageMessage?.caption ||
      quoted?.videoMessage?.caption ||
      null;

    let lang = "en";
    let speechText = "";

    // ==================================================
    // MODE 1️⃣ — Reply Mode (.tts <lang>)
    // ==================================================
    if (repliedText) {
      // If user typed ".tts en" → use "en"
      if (args[0] && args[0].length === 2) {
        lang = args[0].toLowerCase();
      }

      speechText = repliedText.trim();

      if (!speechText) {
        return await sock.sendMessage(from, { text: "❌ Replied message contains no text." }, { quoted: msg });
      }
    }

    // ==================================================
    // MODE 2️⃣ — Normal Mode (.tts <text> OR .tts <lang> <text>)
    // ==================================================
    else {
      const inputText = args.join(" ").trim();

      if (!inputText) {
        return await sock.sendMessage(from, {
          text: `🗣️ *Usage:* .tts <text>\nExample: \`.tts Hello world\`\n\n🌐 Or reply to a message:\n\`.tts en\` (reply to any text)\n\nYou can also set language:\n\`.tts en Hello\`\n\`.tts hi Namaste\``
        }, { quoted: msg });
      }

      // If first word is a language code
      const firstWord = inputText.split(" ")[0];
      if (firstWord.length === 2) {
        lang = firstWord.toLowerCase();
        speechText = inputText.split(" ").slice(1).join(" ");
      } else {
        speechText = inputText;
      }

      if (!speechText) {
        return await sock.sendMessage(from, { text: "❌ Please provide text to convert." }, { quoted: msg });
      }
    }

    // 🔊 Reaction
    await sock.sendMessage(from, { react: { text: "🔊", key: msg.key } }).catch(() => {});

    // 🎧 Generate audio URL
    const ttsUrl = googleTTS.getAudioUrl(speechText, {
      lang,
      slow: false,
      host: "https://translate.google.com",
    });

    // 📥 Download MP3
    const res = await axios.get(ttsUrl, { responseType: "arraybuffer" });
    const audioPath = path.join(__dirname, `../temp/tts_${Date.now()}.mp3`);
    fs.writeFileSync(audioPath, res.data);

    // 🎵 Send as audio message (MP3 — universally playable)
    await sock.sendMessage(from, {
      audio: { url: audioPath },
      mimetype: "audio/mpeg",
      ptt: false,
      fileName: `${secure.botName}_tts.mp3`,
    }, { quoted: msg });

    try { fs.unlinkSync(audioPath); } catch {}

  } catch (err) {
    console.error("❌ .tts error:", err);
    await sock.sendMessage(from, { text: "⚠️ Failed to generate voice. Try again." }, { quoted: msg });
  }
};
