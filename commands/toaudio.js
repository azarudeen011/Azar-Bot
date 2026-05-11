// commands/toaudio.js
// 🎵 Azahrabot — Video → MP3 Converter
// powered by AzarTech ⚡

const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const ffmpegPath = require("ffmpeg-static");

// Convert WhatsApp stream → buffer
async function streamToBuffer(stream) {
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    return Buffer.concat(chunks);
}

module.exports = async function toaudio(sock, msg, from, text, args, store) {
    try {
        await sock.sendMessage(from, { react: { text: "🎧", key: msg.key } });

        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const vidMsg =
            quoted?.videoMessage ||
            msg.message?.videoMessage;

        if (!vidMsg) {
            return sock.sendMessage(
                from,
                { text: "🎥 Reply to a *video* with `.toaudio` to extract the MP3 audio!" },
                { quoted: msg }
            );
        }

        // Download the video
        const stream = await downloadContentFromMessage(vidMsg, "video");
        const buffer = await streamToBuffer(stream);

        // Temp file paths
        const input = path.join(__dirname, "../temp/in_" + Date.now() + ".mp4");
        const output = path.join(__dirname, "../temp/out_" + Date.now() + ".mp3");

        // Ensure temp path exists
        if (!fs.existsSync(path.dirname(input))) {
            fs.mkdirSync(path.dirname(input), { recursive: true });
        }

        fs.writeFileSync(input, buffer);

        // Convert to MP3 using ffmpeg-static directly
        await new Promise((resolve, reject) => {
            exec(`"${ffmpegPath}" -i "${input}" -q:a 0 -map a "${output}"`, (err, stdout, stderr) => {
                if (err) return reject(err);
                resolve();
            });
        });

        const mp3Buffer = fs.readFileSync(output);

        // Send MP3 back
        await sock.sendMessage(
            from,
            {
                audio: mp3Buffer,
                mimetype: "audio/mpeg",
                fileName: "Azahrabot-Audio.mp3",
                ptt: false // sends as standard audio file, use true for voice note
            },
            { quoted: msg }
        );

        await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

        // clean up
        try { fs.unlinkSync(input); } catch {}
        try { fs.unlinkSync(output); } catch {}

    } catch (err) {
        console.error("TOAUDIO ERROR:", err);
        await sock.sendMessage(
            from,
            { text: "❌ Failed to convert video to audio." },
            { quoted: msg }
        );
    }
};
