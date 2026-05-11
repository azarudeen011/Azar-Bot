const sharp = require("sharp");
const path = require("path");
const axios = require("axios");
const fs = require("fs");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

// Convert stream → buffer
async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

module.exports = async (sock, msg, from) => {
    try {
        // 🎯 Detect target
        let target =
            msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
            msg.message?.extendedTextMessage?.contextInfo?.participant ||
            msg.key.participant ||
            msg.key.remoteJid;

        // ---------------------------------------------
        // 📸 STEP 1 — Detect DP OR Replied Image
        // ---------------------------------------------
        let baseImage = null;

        // Check for replied image properly
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedImg = quoted?.imageMessage || quoted?.viewOnceMessage?.message?.imageMessage;

        if (quotedImg) {
            try {
                const stream = await downloadContentFromMessage(quotedImg, "image");
                baseImage = await streamToBuffer(stream);
            } catch {}
        }

        // If *sent directly* as an image
        if (!baseImage && msg.message?.imageMessage) {
            const stream = await downloadContentFromMessage(msg.message.imageMessage, "image");
            baseImage = await streamToBuffer(stream);
        }

        // If still nothing, try profile picture
        if (!baseImage) {
            try {
                const dpUrl = await sock.profilePictureUrl(target, "image");
                const res = await axios.get(dpUrl, { responseType: "arraybuffer" });
                baseImage = Buffer.from(res.data);
            } catch {
                baseImage = null;
            }
        }

        // If everything fails → plain background
        if (!baseImage) {
            baseImage = await sharp({
                create: {
                    width: 800,
                    height: 800,
                    channels: 3,
                    background: "#ffffff"
                }
            }).png().toBuffer();
        }

        // ---------------------------------------------
        // 🖼️ Load stupid overlay
        // ---------------------------------------------
        const stupidPath = path.join(__dirname, "../../assets/stupid.png");
        if (!fs.existsSync(stupidPath)) {
            return sock.sendMessage(
                from,
                { text: "❌ Missing stupid.png in assets folder" },
                { quoted: msg }
            );
        }

        const stupidBuffer = fs.readFileSync(stupidPath);

        // Get size of DP / image
        const meta = await sharp(baseImage).metadata();
        const width = meta.width;
        const height = meta.height;

        // Resize overlay
        const resizedOverlay = await sharp(stupidBuffer)
            .resize(width, height, { fit: "fill" })
            .toBuffer();

        // Composite
        const final = await sharp(baseImage)
            .composite([{ input: resizedOverlay, top: 0, left: 0, blend: "over" }])
            .png()
            .toBuffer();

        // Send
        await sock.sendMessage(
            from,
            {
                image: final,
                caption: `🤡 *Stupid detected:* @${target.split("@")[0]}`,
                mentions: [target],
            },
            { quoted: msg }
        );

    } catch (err) {
        console.error("STUPID CMD ERROR:", err);
        await sock.sendMessage(from, { text: "⚠️ Failed to apply stupid overlay." }, { quoted: msg });
    }
};
