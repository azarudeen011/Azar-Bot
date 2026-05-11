// commands/database/crop.js
// ✂️ Crop image into perfect square & convert to sticker
// > powered by AzarTech ⚡

const sharp = require("sharp");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const Jimp = require("jimp");

// Convert stream → buffer
async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

module.exports = async (sock, msg, from, text, args) => {
    try {
        // React to start
        await sock.sendMessage(from, { react: { text: "✂️", key: msg.key } });

        // Help message
        if (args[0]?.toLowerCase() === "help") {
            const helpText = `✂️ *Crop & Sticker Command*

Reply to an image with:

• \`.crop\` — Crop to square + convert to sticker  
• \`.crop crop\` — Only crop square  
• \`.crop sticker\` — Only convert to sticker  

> powered by *AzarTech* ⚡`;
            return sock.sendMessage(from, { text: helpText }, { quoted: msg });
        }

        const mode = args[0]?.toLowerCase() || "both";

        // Extract image
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const imgMsg = quoted?.imageMessage || msg.message?.imageMessage;

        if (!imgMsg) {
            return sock.sendMessage(
                from,
                { text: "⚠️ Reply to an image to crop & convert!\n> powered by AzarTech ⚡" },
                { quoted: msg }
            );
        }

        // Download the image
        const stream = await downloadContentFromMessage(imgMsg, "image");
        const buffer = await streamToBuffer(stream);

        // Get metadata
        const meta = await sharp(buffer).metadata();
        const size = Math.min(meta.width, meta.height);

        // Crop center square
        let cropped = await sharp(buffer)
            .extract({
                left: Math.floor((meta.width - size) / 2),
                top: Math.floor((meta.height - size) / 2),
                width: size,
                height: size,
            })
            .png()
            .toBuffer();

        // --- ONLY CROP MODE ---
        if (mode === "crop") {
            await sock.sendMessage(
                from,
                {
                    image: cropped,
                    caption: "✂️ *Cropped perfectly!*\n> powered by AzarTech ⚡",
                },
                { quoted: msg }
            );

            await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });
            return;
        }

        // --- CONVERT TO STICKER ---
        let sticker;
        try {
            sticker = await sharp(cropped)
                .resize(512, 512, {
                    fit: "contain",
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .webp({ quality: 90 })
                .toBuffer();
        } catch (err) {
            console.log("sharp failed, using Jimp:", err.message);
            const jimpImg = await Jimp.read(cropped);
            jimpImg.resize(512, 512);
            sticker = await jimpImg.getBufferAsync("image/webp");
        }

        // Send sticker
        await sock.sendMessage(
            from,
            {
                sticker,
                contextInfo: {
                    externalAdReply: {
                        title: "AzarTech Tools",
                        body: "Crop → HD Sticker",
                        mediaType: 1,
                        thumbnail: cropped,
                    },
                },
            },
            { quoted: msg }
        );

        // Final reaction
        await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (err) {
        console.error("CROP ERROR:", err);
        await sock.sendMessage(
            from,
            { text: `❌ Failed: ${err.message}\n> powered by AzarTech ⚡` },
            { quoted: msg }
        );

        await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });
    }
};
