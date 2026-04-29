const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

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
        let messageType;
        if (msg.message?.imageMessage) {
            mediaMessage = msg.message.imageMessage;
            messageType = 'image';
        } else if (msg.message?.videoMessage) {
            mediaMessage = msg.message.videoMessage;
            messageType = 'video';
        } else if (quoted?.imageMessage) {
            mediaMessage = quoted.imageMessage;
            messageType = 'image';
        } else if (quoted?.videoMessage) {
            mediaMessage = quoted.videoMessage;
            messageType = 'video';
        }

        const stream = await downloadContentFromMessage(mediaMessage, messageType);
        const buffer = await streamToBuffer(stream);

        // Save to temp file
        const isVideo = messageType === 'video';
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
