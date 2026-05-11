// commands/database/toimage.js
// Converts sticker → image (PNG) using Baileys buffer

const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

module.exports = async (sock, msg, from) => {
    try {
        // Get quoted message
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted || !quoted.stickerMessage) {
            return await sock.sendMessage(
                from,
                { text: "⚠️ *Reply to a sticker using `.toimage`*." },
                { quoted: msg }
            );
        }

        // Download sticker buffer
        const stream = await downloadContentFromMessage(
            quoted.stickerMessage,
            "sticker"
        );

        let buffer = Buffer.from([]);

        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        // Convert sticker buffer to image (PNG)
        await sock.sendMessage(
            from,
            {
                image: buffer,
                caption: "✅ Converted to Image!"
            },
            { quoted: msg }
        );
    } catch (err) {
        console.error("❌ toimage error:", err);
        await sock.sendMessage(
            from,
            { text: "⚠️ Failed to convert sticker to image." },
            { quoted: msg }
        );
    }
};
