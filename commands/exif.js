const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = async (sock, msg, from, text, args) => {
    try {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        // Ensure they quoted a document or image
        const hasMedia = quoted?.documentMessage || quoted?.imageMessage;
        if (!hasMedia) {
            return sock.sendMessage(from, { 
                text: "❌ Please reply to an *Image* or *Document (Original Image)* with `.exif` to extract its hidden metadata." 
            }, { quoted: msg });
        }

        await sock.sendMessage(from, { react: { text: "🔍", key: msg.key } }).catch(() => {});

        const buffer = await downloadMediaMessage(
            { message: quoted },
            'buffer',
            {},
            { logger: require('pino')({ level: 'silent' }) }
        );

        // NATIVE RAW METADATA EXTRACTOR (No external dependencies)
        // This extracts human-readable ASCII strings from the header of the image (first 4096 bytes)
        // which contains the EXIF, XMP, and APP1 headers.
        
        const header = buffer.slice(0, Math.min(buffer.length, 4096));
        let strings = [];
        let currentString = "";

        for (let i = 0; i < header.length; i++) {
            const charCode = header[i];
            // Only printable ASCII characters (32 to 126)
            if (charCode >= 32 && charCode <= 126) {
                currentString += String.fromCharCode(charCode);
            } else {
                if (currentString.length >= 4) {
                    strings.push(currentString);
                }
                currentString = "";
            }
        }

        // Filter and categorize the found strings
        let metadata = {
            software: [],
            camera: [],
            dates: [],
            other: []
        };

        const dateRegex = /20\d{2}[:\-]\d{2}[:\-]\d{2}/; // Matches 20XX:MM:DD or 20XX-MM-DD
        const cameraBrands = ["Apple", "Samsung", "Google", "Huawei", "Xiaomi", "OnePlus", "Sony", "Nikon", "Canon"];
        const softwareBrands = ["Photoshop", "Lightroom", "Snapseed", "VSCO", "Canva", "WhatsApp", "Instagram"];

        strings.forEach(str => {
            if (dateRegex.test(str)) {
                if (!metadata.dates.includes(str)) metadata.dates.push(str);
            } else if (cameraBrands.some(brand => str.toLowerCase().includes(brand.toLowerCase()))) {
                if (!metadata.camera.includes(str)) metadata.camera.push(str);
            } else if (softwareBrands.some(soft => str.toLowerCase().includes(soft.toLowerCase()))) {
                if (!metadata.software.includes(str)) metadata.software.push(str);
            } else if (str.length > 5 && !str.includes("http") && !str.includes("xml")) {
                // Potential raw EXIF tags like "iPhone 13 Pro"
                if (/^[A-Za-z0-9\s\-_]+$/.test(str) && !metadata.other.includes(str)) {
                    metadata.other.push(str);
                }
            }
        });

        let report = `📸 *ADVANCED EXIF EXTRACTOR* 📸\n━━━━━━━━━━━━━━\n\n`;

        if (metadata.camera.length > 0) {
            report += `📱 *Device Info:*\n- ${metadata.camera.join("\n- ")}\n\n`;
        }
        if (metadata.software.length > 0) {
            report += `🎨 *Software/Edited With:*\n- ${metadata.software.join("\n- ")}\n\n`;
        }
        if (metadata.dates.length > 0) {
            report += `📅 *Timestamps:*\n- ${metadata.dates.join("\n- ")}\n\n`;
        }

        // Clean up "other" to show top 3 potential metadata strings
        const filteredOther = metadata.other.filter(s => s.length > 6 && s.length < 30).slice(0, 3);
        if (filteredOther.length > 0 && metadata.camera.length === 0) {
            report += `🧩 *Possible Tags:*\n- ${filteredOther.join("\n- ")}\n\n`;
        }

        if (metadata.camera.length === 0 && metadata.software.length === 0 && metadata.dates.length === 0) {
            report += `⚠️ _No hidden EXIF data found. It was likely stripped by WhatsApp (unless sent as a Document) or the creator._`;
        } else {
            report += `> _Data extracted via Raw Buffer Analysis_`;
        }

        await sock.sendMessage(from, { text: report }, { quoted: msg });
        await sock.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});

    } catch (e) {
        console.error("Exif error:", e);
        await sock.sendMessage(from, { text: "❌ Failed to read EXIF data: " + e.message }, { quoted: msg });
        await sock.sendMessage(from, { react: { text: "❌", key: msg.key } }).catch(() => {});
    }
};
