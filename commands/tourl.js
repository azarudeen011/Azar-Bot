const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = async (sock, msg, from, text, args) => {
    try {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        // Find media either in direct message or quoted message
        const hasMedia = msg.message?.imageMessage || msg.message?.videoMessage || 
                         quoted?.imageMessage || quoted?.videoMessage;
                         
        if (!hasMedia) {
            return sock.sendMessage(from, { 
                text: "❌ Please reply to an image or video with `.tourl` to get a direct link." 
            }, { quoted: msg });
        }

        await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } }).catch(() => {});
        
        let mediaMessage;
        if (msg.message?.imageMessage || msg.message?.videoMessage) {
            mediaMessage = msg;
        } else {
            mediaMessage = { message: quoted };
        }

        const buffer = await downloadMediaMessage(
            mediaMessage,
            'buffer',
            {},
            { logger: require('pino')({ level: 'silent' }) }
        );

        // Save to temp file
        const isVideo = !!(mediaMessage.message?.videoMessage);
        const ext = isVideo ? '.mp4' : '.jpg';
        const tempPath = path.join(os.tmpdir(), `temp_tourl_${Date.now()}${ext}`);
        
        fs.writeFileSync(tempPath, buffer);

        // Upload to catbox.moe (no API key required, supports up to 200MB)
        const FormData = require('form-data');
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', fs.createReadStream(tempPath));

        try {
            const response = await axios.post('https://catbox.moe/user/api.php', form, {
                headers: {
                    ...form.getHeaders()
                }
            });

            const link = response.data;
            
            const replyText = `🔗 *AZAR CLOUD UPLOADER* 🔗\n\n` +
                              `✅ *File Uploaded Successfully!*\n` +
                              `🌐 *URL:* ${link}\n` +
                              `📦 *Size:* ${(buffer.length / 1024 / 1024).toFixed(2)} MB\n\n` +
                              `_Note: This link is permanent._`;
            
            await sock.sendMessage(from, { text: replyText }, { quoted: msg });
            await sock.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});

        } catch (uploadError) {
            console.error("Upload error:", uploadError);
            await sock.sendMessage(from, { 
                text: "❌ Failed to upload the file to the cloud server. Try again later." 
            }, { quoted: msg });
            await sock.sendMessage(from, { react: { text: "❌", key: msg.key } }).catch(() => {});
        } finally {
            // Clean up temp file
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }

    } catch (e) {
        console.error("tourl command error:", e);
        await sock.sendMessage(from, { text: "❌ An error occurred: " + e.message }, { quoted: msg });
    }
};
