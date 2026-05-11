// commands/database/wanted.js
// 🎯 Azahrabot — WANTED Poster Maker
// User image placed neatly into wanted template
// powered by AzarTech ⚡

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

// Stream → Buffer Helper
async function streamToBuffer(stream) {
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    return Buffer.concat(chunks);
}

module.exports = async function wanted(sock, msg, from, text, args) {
    try {
        await sock.sendMessage(from, { react: { text: "🪪", key: msg.key } });

        // Get image from reply
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const imgMsg = quoted?.imageMessage;

        if (!imgMsg) {
            return sock.sendMessage(
                from,
                { text: "⚠️ Reply to an image with `.wanted`" },
                { quoted: msg }
            );
        }

        // Download user image
        const stream = await downloadContentFromMessage(imgMsg, "image");
        let userImg = await streamToBuffer(stream);

        // Load template
        const templatePath = path.join(process.cwd(), "assets", "wanted.png");
        if (!fs.existsSync(templatePath)) {
            return sock.sendMessage(
                from,
                { text: "❌ wanted.png missing in assets folder!" },
                { quoted: msg }
            );
        }

        const templateBuffer = fs.readFileSync(templatePath);
        const templateMeta = await sharp(templateBuffer).metadata();

        // 📌 WANTED poster has fixed photo area size.
        // You can adjust these values 👇 depending on your template.

        const PHOTO_WIDTH = Math.floor(templateMeta.width * 0.72);   // centered photo width
        const PHOTO_HEIGHT = Math.floor(templateMeta.height * 0.48); // photo height
        const PHOTO_X = Math.floor(templateMeta.width * 0.14);       // left margin
        const PHOTO_Y = Math.floor(templateMeta.height * 0.22);      // top margin

        // Resize user image to fit (contain + auto crop)
        const resizedUserImg = await sharp(userImg)
            .resize(PHOTO_WIDTH, PHOTO_HEIGHT, {
                fit: "cover",
                position: "center",
            })
            .toBuffer();

        // Composite: place photo into template
        const finalImage = await sharp(templateBuffer)
            .composite([
                {
                    input: resizedUserImg,
                    top: PHOTO_Y,
                    left: PHOTO_X,
                }
            ])
            .png()
            .toBuffer();

        // Send final
        await sock.sendMessage(
            from,
            {
                image: finalImage,
                caption: "🪪 *WANTED*\n> powered by AzarTech ⚡",
            },
            { quoted: msg }
        );

        await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (err) {
        console.error("WANTED ERROR:", err);
        await sock.sendMessage(
            from,
            { text: "❌ Failed to generate WANTED poster." },
            { quoted: msg }
        );
    }
};
