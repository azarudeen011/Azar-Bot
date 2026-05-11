// commands/database/tomp3.js
// 🎵 Azahrabot — Video → MP3 Converter
// powered by AzarTech ⚡

const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

// Convert WhatsApp stream → buffer
async function streamToBuffer(stream) {
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    return Buffer.concat(chunks);
}

module.exports = async function tomp3(sock, msg, from, text, args, store) {
    try {
        await sock.sendMessage(from, { react: { text: "🎧", key: msg.key } });

        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const vidMsg =
            quoted?.videoMessage ||
            msg.message?.videoMessage;

        if (!vidMsg) {
            return sock.sendMessage(
                from,
                { text: "🎥 Reply to a *video* with `.tomp3` to extract audio!" },
                { quoted: msg }
            );
        }

        // Download the video
        const stream = await downloadContentFromMessage(vidMsg, "video");
        const buffer = await streamToBuffer(stream);

        // Temp file paths
        const input = path.join(__dirname, "input_" + Date.now() + ".mp4");
        const output = path.join(__dirname, "output_" + Date.now() + ".mp3");

        fs.writeFileSync(input, buffer);

        // Convert to MP3 using ffmpeg
        await new Promise((resolve, reject) => {
            ffmpeg(input)
                .outputOptions("-vn") // remove video
                .save(output)
                .on("end", resolve)
                .on("error", reject);
        });

        const mp3Buffer = fs.readFileSync(output);

        // Send MP3 back
        await sock.sendMessage(
            from,
            {
                audio: mp3Buffer,
                mimetype: "audio/mpeg",
                fileName: "Azahrabot-Audio.mp3",
            },
            { quoted: msg }
        );

        await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

        // clean up
        fs.unlinkSync(input);
        fs.unlinkSync(output);

    } catch (err) {
        console.error("TOMP3 ERROR:", err);
        await sock.sendMessage(
            from,
            { text: "❌ Failed to convert video to MP3." },
            { quoted: msg }
        );
    }
};
