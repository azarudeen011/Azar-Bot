// commands/database/blur.js

const axios = require("axios");
const sharp = require("sharp");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

// Helper: convert stream → buffer
const streamToBuffer = async (stream) => {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
};

// Extract real imageMessage from any WhatsApp wrapper
function extractImage(msg) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted) return null;

    // v1
    if (quoted.imageMessage) return quoted.imageMessage;

    // v1 view once
    if (quoted.viewOnceMessage?.message?.imageMessage)
        return quoted.viewOnceMessage.message.imageMessage;

    // v2 view once
    if (quoted.viewOnceMessageV2?.message?.imageMessage)
        return quoted.viewOnceMessageV2.message.imageMessage;

    // v2 extension
    if (quoted.viewOnceMessageV2Extension?.message?.imageMessage)
        return quoted.viewOnceMessageV2Extension.message.imageMessage;

    // ephemeral wrappers
    if (quoted.ephemeralMessage?.message?.imageMessage)
        return quoted.ephemeralMessage.message.imageMessage;

    return null;
}

module.exports = async (sock, msg, from, text, args = []) => {
    try {
        // Set blur strength
        let strength = 10;
        if (!isNaN(args[0])) {
            strength = Math.max(1, Math.min(50, Number(args[0])));
        }

        let buffer = null;

        // 1️⃣ Replied image (supports all wrappers)
        const quotedImage = extractImage(msg);
        if (quotedImage) {
            const stream = await downloadContentFromMessage(quotedImage, "image");
            buffer = await streamToBuffer(stream);
        }

        // 2️⃣ Direct image
        else if (msg.message?.imageMessage) {
            const stream = await downloadContentFromMessage(msg.message.imageMessage, "image");
            buffer = await streamToBuffer(stream);
        }

        // 3️⃣ Mentioned user DP / sender DP
        else {
            const target =
                msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
                msg.key.participant ||
                msg.key.remoteJid;

            try {
                const dp = await sock.profilePictureUrl(target, "image");
                const res = await axios.get(dp, { responseType: "arraybuffer" });
                buffer = Buffer.from(res.data);
            } catch (e) {
                return sock.sendMessage(
                    from,
                    { text: "❌ No image found. Reply to an image or mention someone with a DP." },
                    { quoted: msg }
                );
            }
        }

        if (!buffer) {
            return sock.sendMessage(from, { text: "⚠️ Couldn't process that image." }, { quoted: msg });
        }

        // 🌀 Apply blur using sharp
        const blurred = await sharp(buffer)
            .blur(strength)
            .jpeg()
            .toBuffer();

        await sock.sendMessage(
            from,
            { image: blurred, caption: `✨ Blur applied (strength: ${strength})` },
            { quoted: msg }
        );

    } catch (err) {
        console.error("BLUR CMD ERROR:", err);
        await sock.sendMessage(from, { text: "⚠️ Error applying blur." }, { quoted: msg });
    }
};
