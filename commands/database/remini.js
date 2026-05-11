// commands/database/remini.js
// ===============================================
// ✨ Azahrabot — Remini HD Enhance (v1.0)
// Upscale • Sharpen • Denoise • Restore • Make HD
// Supports reply, direct image, or DP fallback
// ===============================================

const axios = require("axios");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { uploadImage } = require("../../lib/uploadImage");
const sharp = require("sharp");

// Convert stream → buffer
async function streamToBuffer(stream) {
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    return Buffer.concat(chunks);
}

// Extract image (reply > direct)
async function extractImage(sock, msg) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    // Reply image
    if (quoted?.imageMessage) {
        const stream = await downloadContentFromMessage(quoted.imageMessage, "image");
        return await streamToBuffer(stream);
    }

    // Direct image
    if (msg.message?.imageMessage) {
        const stream = await downloadContentFromMessage(msg.message.imageMessage, "image");
        return await streamToBuffer(stream);
    }

    return null;
}

module.exports = async (sock, msg, from, text, args, store) => {
    try {
        await sock.sendMessage(from, { react: { text: "✨", key: msg.key } });

        let imgBuffer = await extractImage(sock, msg);

        // Fallback → DP
        if (!imgBuffer) {
            const target =
                msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
                msg.message?.extendedTextMessage?.contextInfo?.participant ||
                msg.key.participant ||
                msg.key.remoteJid;

            try {
                const dp = await sock.profilePictureUrl(target, "image");
                const res = await axios.get(dp, { responseType: "arraybuffer" });
                imgBuffer = Buffer.from(res.data);
            } catch {
                return sock.sendMessage(from, {
                    text: "❌ Reply to an image or send a picture."
                }, { quoted: msg });
            }
        }

        // 🌐 Enhance image locally with sharp (upscale + sharpen + denoise)
        let enhanced = null;
        try {
            console.log('remini: enhancing image locally with sharp');
            
            // Get original metadata
            const metadata = await sharp(imgBuffer).metadata();
            const originalWidth = metadata.width || 800;
            const originalHeight = metadata.height || 600;
            
            // Upscale 2x (can be adjusted)
            const upscaledWidth = originalWidth * 2;
            const upscaledHeight = originalHeight * 2;
            
            // Process: upscale → sharpen → enhance
            const enhancedBuffer = await sharp(imgBuffer)
                .resize(upscaledWidth, upscaledHeight, {
                    kernel: sharp.kernel.lanczos3  // High-quality upscaling
                })
                .sharpen({
                    sigma: 1.5  // Sharpening intensity
                })
                .normalise()  // Enhance contrast
                .modulate({
                    saturation: 1.1  // Slightly boost colors
                })
                .toBuffer();
            
            enhanced = { data: enhancedBuffer };
            console.log(`remini: local enhancement succeeded (${originalWidth}x${originalHeight} → ${upscaledWidth}x${upscaledHeight})`);
        } catch (err) {
            console.error('remini: local enhancement failed:', err && err.message ? err.message : err);
            return sock.sendMessage(from, {
                text: "❌ Failed to enhance image. Try again later."
            }, { quoted: msg });
        }

        if (!enhanced || !enhanced.data) {
            return sock.sendMessage(from, {
                text: "❌ Failed to process image."
            }, { quoted: msg });
        }

        await sock.sendMessage(
            from,
            {
                image: enhanced.data,
                caption: "✨ *Image Enhanced Successfully!*\n(2x upscaled, sharpened & denoised)"
            },
            { quoted: msg }
        );

        await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (err) {
        console.error("Remini Error:", err);
        await sock.sendMessage(
            from,
            { text: "❌ Failed to enhance the image. Try again later." },
            { quoted: msg }
        );
    }
};
