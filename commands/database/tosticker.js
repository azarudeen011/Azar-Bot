// commands/database/tosticker.js
// Image → Sticker | Video → Animated Sticker (FFmpeg)

const fs = require("fs");
const path = require("path");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

module.exports = async (sock, msg, from) => {
    try {
        const q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!q) {
            return await sock.sendMessage(from, { text: "⚠️ Reply to image/video with `.tosticker`" }, { quoted: msg });
        }

        let type = q.imageMessage ? "image" : q.videoMessage ? "video" : null;

        if (!type) {
            return await sock.sendMessage(from, { text: "⚠️ Only image or video (≤15 sec) supported!" }, { quoted: msg });
        }

        // Video duration check
        if (type === "video") {
            const dur = q.videoMessage.seconds || 0;
            if (dur > 15) {
                return await sock.sendMessage(from, {
                    text: "⚠️ Video too long! Only ≤15 sec allowed."
                }, { quoted: msg });
            }
        }

        // Download buffer
        const stream = await downloadContentFromMessage(q[type + "Message"], type);

        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        const tempIn = path.join(__dirname, `../../temp/input_${Date.now()}.${type === "image" ? "jpg" : "mp4"}`);
        const tempOut = path.join(__dirname, `../../temp/output_${Date.now()}.webp`);

        fs.writeFileSync(tempIn, buffer);

        if (type === "image") {
            // Simple image → webp sticker
            ffmpeg.setFfmpegPath(ffmpegPath);
            await new Promise((resolve, reject) => {
                ffmpeg(tempIn)
                    .addOutputOptions([
                        "-vf scale=512:512:force_original_aspect_ratio=decrease",
                        "-vcodec libwebp",
                        "-lossless 1",
                        "-qscale 75",
                        "-preset picture",
                        "-loop 0"
                    ])
                    .save(tempOut)
                    .on("end", resolve)
                    .on("error", reject);
            });
        } else {
            // VIDEO → ANIMATED WEBP
            ffmpeg.setFfmpegPath(ffmpegPath);
            await new Promise((resolve, reject) => {
                ffmpeg(tempIn)
                    .addOutputOptions([
                        "-vf scale=512:512:force_original_aspect_ratio=decrease,fps=15",
                        "-vcodec libwebp",
                        "-lossless 0",
                        "-qscale 35",
                        "-preset default",
                        "-loop 0",
                        "-an"
                    ])
                    .save(tempOut)
                    .on("end", resolve)
                    .on("error", reject);
            });
        }

        // Send sticker
        const stickerBuf = fs.readFileSync(tempOut);

        await sock.sendMessage(from, { sticker: stickerBuf }, { quoted: msg });

        fs.unlinkSync(tempIn);
        fs.unlinkSync(tempOut);

    } catch (err) {
        console.error("tosticker error:", err);
        await sock.sendMessage(from, { text: "⚠️ Failed to convert to sticker." }, { quoted: msg });
    }
};
