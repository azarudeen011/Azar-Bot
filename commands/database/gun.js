// commands/database/gun.js
// 🔫 Azahrabot Meme Gun Overlay – Object Detection Edition
// powered by AzarTech ⚡

const sharp = require("sharp");
const axios = require("axios");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const path = require("path");
const fs = require("fs");

// Convert stream → buffer
async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

// Fake “hand detection” (mathematically reasonable positions)
async function detectPersonHandPosition(imageBuffer) {
    try {
        const meta = await sharp(imageBuffer).metadata();

        return {
            x: Math.floor(meta.width * 0.60),
            y: Math.floor(meta.height * 0.45)
        };
    } catch {
        return { x: 200, y: 200 };
    }
}

module.exports = async function gun(sock, msg, from, text, args) {
    try {
        await sock.sendMessage(from, { react: { text: "🔫", key: msg.key } });

        // caption text
        const caption = args.join(" ").trim() || "Do or Die";

        // get quoted image
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const imgMsg = quoted?.imageMessage;

        if (!imgMsg) {
            return sock.sendMessage(
                from,
                { text: "⚠️ Reply to an image with `.gun <text>`" },
                { quoted: msg }
            );
        }

        // download image buffer
        const stream = await downloadContentFromMessage(imgMsg, "image");
        const userBuffer = await streamToBuffer(stream);

        // load gun.png
        const gunPath = path.join(process.cwd(), "assets", "gun.png");
        if (!fs.existsSync(gunPath)) {
            return sock.sendMessage(
                from,
                { text: "❌ gun.png missing in assets folder!" },
                { quoted: msg }
            );
        }

        const gunBuffer = fs.readFileSync(gunPath);
        const userMeta = await sharp(userBuffer).metadata();

        // resize gun relative to image height
        const gunHeight = Math.floor(userMeta.height * 0.30);
        const resizedGun = await sharp(gunBuffer)
            .resize({ height: gunHeight })
            .toBuffer();

        const gunMeta = await sharp(resizedGun).metadata();

        // detect hand position
        const hand = await detectPersonHandPosition(userBuffer);

        let gunX = Math.max(0, Math.min(hand.x, userMeta.width - gunMeta.width));
        let gunY = Math.max(0, Math.min(hand.y, userMeta.height - gunMeta.height));

        // overlay gun
        let combined = await sharp(userBuffer)
            .composite([
                { input: resizedGun, top: gunY, left: gunX, blend: "over" }
            ])
            .png()
            .toBuffer();

        // --------------------------
        // TEXT OVERLAY (LOWER-MIDDLE)
        // --------------------------
        const textHeight = 120;
        const textY = Math.floor(userMeta.height - userMeta.height * 0.22);

        const finalWithText = await sharp(combined)
            .composite([
                // transparent black strip
                {
                    input: Buffer.from(
                        `<svg width="${userMeta.width}" height="${textHeight}">
                            <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" />
                        </svg>`
                    ),
                    top: textY,
                    left: 0
                },
                // white bold text
                {
                    input: Buffer.from(
                        `<svg width="${userMeta.width}" height="${textHeight}">
                            <text 
                                x="50%"
                                y="55%"
                                font-size="55"
                                fill="white"
                                text-anchor="middle"
                                dominant-baseline="middle"
                                font-family="Arial Black, sans-serif">
                                ${caption.replace(/</g, "&lt;")}
                            </text>
                        </svg>`
                    ),
                    top: textY,
                    left: 0
                }
            ])
            .png()
            .toBuffer();

        // send it
        await sock.sendMessage(
            from,
            {
                image: finalWithText,
                caption: `🔫 ${caption}\n> powered by AzarTech ⚡`
            },
            { quoted: msg }
        );

        await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (err) {
        console.error("GUN ERROR:", err);
        await sock.sendMessage(
            from,
            { text: `❌ Gun effect failed.\n${err.message}` },
            { quoted: msg }
        );
    }
};
