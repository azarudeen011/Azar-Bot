const fs = require('fs');
const path = require('path');
const os = require('os');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// Buffer reading utilities for WebP EXIF
const extractMetadata = (buffer) => {
    try {
        const str = buffer.toString('utf-8');
        // Look for the "EXIF" identifier in WebP
        const exifIndex = str.indexOf('EXIF');
        if (exifIndex === -1) return null;

        // Try to extract the JSON metadata chunk
        const jsonMatch = str.match(/{"[\s\S]*?}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (e) {
        return null;
    }
    return null;
};

// Tool to inject custom EXIF into WebP
const writeExif = async (buffer, packname, author) => {
    try {
        const json = {
            "sticker-pack-id": "AzahraBot",
            "sticker-pack-name": packname || "AzahraBot",
            "sticker-pack-publisher": author || "Azar",
            "emojis": ["🎭"]
        };

        const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
        const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
        const exif = Buffer.concat([exifAttr, jsonBuff]);
        exif.writeUIntLE(jsonBuff.length, 14, 4);

        const tempFile = path.join(os.tmpdir(), `steal_${Date.now()}.webp`);
        fs.writeFileSync(tempFile, buffer);

        // We use webpmux if installed, otherwise we just return the raw buffer
        // Note: For pure Node.js without ffmpeg/webpmux, injecting EXIF correctly requires native modules or external tools.
        // For AzahraBot, we'll try to use child_process webpmux if available
        const { execSync } = require('child_process');
        
        try {
            const exifFile = path.join(os.tmpdir(), `exif_${Date.now()}.exif`);
            fs.writeFileSync(exifFile, exif);
            
            // Try using webpmux to set exif
            const outputFile = path.join(os.tmpdir(), `out_${Date.now()}.webp`);
            execSync(`webpmux -set exif "${exifFile}" "${tempFile}" -o "${outputFile}"`);
            
            const resultBuffer = fs.readFileSync(outputFile);
            
            // Cleanup
            fs.unlinkSync(tempFile);
            fs.unlinkSync(exifFile);
            fs.unlinkSync(outputFile);
            
            return resultBuffer;
        } catch (execErr) {
            // If webpmux is not installed, fallback to returning original buffer
            // (It won't steal the name, but won't crash)
            console.log("Webpmux not installed, skipping EXIF injection");
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
            return buffer; 
        }

    } catch (e) {
        console.error("EXIF writing error:", e);
        return buffer;
    }
};

module.exports = async (sock, msg, from, text, args) => {
    try {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quoted || !quoted.stickerMessage) {
            return sock.sendMessage(from, { 
                text: "❌ Reply to a sticker with `.steal <PackName> | <Author>` to steal it!" 
            }, { quoted: msg });
        }

        await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } }).catch(() => {});

        let packname = "Stolen Pack";
        let author = "AzahraBot";

        if (text) {
            const parts = text.split("|");
            packname = parts[0].trim();
            if (parts.length > 1) {
                author = parts[1].trim();
            }
        }

        // Download the sticker
        const buffer = await downloadMediaMessage(
            { message: quoted },
            'buffer',
            {},
            { logger: require('pino')({ level: 'silent' }) }
        );

        // Try to rewrite the EXIF data
        const newStickerBuffer = await writeExif(buffer, packname, author);

        // Send back the modified sticker
        await sock.sendMessage(from, {
            sticker: newStickerBuffer
        }, { quoted: msg });

        await sock.sendMessage(from, { react: { text: "🥷", key: msg.key } }).catch(() => {});

    } catch (e) {
        console.error("Steal error:", e);
        await sock.sendMessage(from, { text: "❌ Failed to steal sticker: " + e.message }, { quoted: msg });
    }
};
