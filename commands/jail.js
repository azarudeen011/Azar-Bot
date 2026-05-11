// commands/jail.js – anyone can use in groups or private chats
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

// Convert stream to buffer
async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

// Path to your jail bars overlay image (adjust if needed)
const overlayPath = path.join(process.cwd(), "assets", "jail.png");

module.exports = async (sock, msg, from, text, args, store) => {
    try {
        // --- 1. Check if user replied to an image ---
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const imgMsg = quoted?.imageMessage || quoted?.documentMessage;

        if (!imgMsg) {
            return sock.sendMessage(from, {
                text: "❌ Please reply to an image you want to put in jail.\nUsage: Reply to an image with `.jail`"
            }, { quoted: msg });
        }

        await sock.sendMessage(from, { react: { text: "⛓️", key: msg.key } });

        // --- 2. Download the replied image using downloadContentFromMessage ---
        let imageBuffer;
        try {
            const stream = await downloadContentFromMessage(imgMsg, "image");
            imageBuffer = await streamToBuffer(stream);
        } catch (err) {
            console.error("Image download error:", err);
            return sock.sendMessage(from, {
                text: "❌ Failed to download the image. Please try again."
            }, { quoted: msg });
        }

        // --- 3. Apply the jail overlay using sharp ---
        let processedImageBuffer;
        try {
            // Check if overlay file exists
            if (!fs.existsSync(overlayPath)) {
                throw new Error("Jail overlay image not found at " + overlayPath);
            }

            // Resize user image to 512x512 (cover)
            const userResized = await sharp(imageBuffer)
                .resize(512, 512, { fit: 'cover' })
                .toBuffer();

            // Load and resize overlay to same dimensions
            const overlayBuffer = await sharp(overlayPath)
                .resize(512, 512, { fit: 'cover' })
                .toBuffer();

            // Composite overlay on top
            processedImageBuffer = await sharp(userResized)
                .composite([{ input: overlayBuffer, blend: 'over' }])
                .toBuffer();
        } catch (err) {
            console.error("Image processing error:", err);
            return sock.sendMessage(from, {
                text: `❌ Failed to process the image: ${err.message}`
            }, { quoted: msg });
        }

        // --- 4. Send the final image back ---
        const sender = msg.key.participant || msg.key.remoteJid || "unknown";
        await sock.sendMessage(from, {
            image: processedImageBuffer,
            caption: `🚔 *JAILED!*\nThis user has been sentenced to jail. 🔗\n\n> *AzahraBot ⚡*`,
            mentions: [sender]
        }, { quoted: msg });

        await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (err) {
        console.error("Jail command error:", err);
        await sock.sendMessage(from, {
            text: `❌ An unexpected error occurred: ${err.message}`
        }, { quoted: msg });
        await sock.sendMessage(from, { react: { text: "⚠️", key: msg.key } });
    }
};