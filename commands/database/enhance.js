const axios = require("axios");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const settings = require("../../settings");
const small_lib = require("../../lib/small_lib");
const fs = require("fs");
const path = require("path");

// Clean root /temp directory of Baileys leftover files
function cleanTempDir() {
    try {
        const tempPath = path.join(process.cwd(), "temp");
        if (fs.existsSync(tempPath)) {
            const files = fs.readdirSync(tempPath);
            files.forEach(file => {
                // Remove leftovers like "image3EB0582F10C106E72B67D5-original"
                if (file.includes("original") || file.startsWith("image") || file.startsWith("video") || file.startsWith("audio")) {
                    try {
                        fs.unlinkSync(path.join(tempPath, file));
                    } catch (err) {}
                }
            });
        }
    } catch (e) {
        console.error("cleanTempDir failed:", e.message);
    }
}

// Convert a Baileys stream to a Buffer
async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

// 1. Upload to ImgBB (Returns direct link ending in .jpg)
async function uploadToImgbb(buffer) {
    const FormData = require("form-data");
    try {
        const form = new FormData();
        form.append("image", buffer, { filename: "image.jpg" });
        const res = await axios.post("https://api.imgbb.com/1/upload?key=6dec70ce2ad1942bf9e7be9da5deba1f", form, {
            headers: form.getHeaders(),
            timeout: 60000
        });
        if (res.data && res.data.data && res.data.data.url) {
            return res.data.data.url; // e.g. https://i.ibb.co/xxxxx/image.jpg
        }
    } catch (e) {
        console.error("ImgBB failed:", e.message);
    }
    return null;
}

// 2. Upload to TmpFiles.org (Returns direct link ending in .jpg)
async function uploadToTmpfiles(buffer) {
    const FormData = require("form-data");
    try {
        const form = new FormData();
        form.append("file", buffer, { filename: "image.jpg", contentType: "image/jpeg" });
        const res = await axios.post("https://tmpfiles.org/api/v1/upload", form, {
            headers: form.getHeaders(),
            timeout: 60000
        });
        if (res.data && res.data.status === 'success') {
            return res.data.data.url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
        }
    } catch (e) {
        console.error("Tmpfiles failed:", e.message);
    }
    return null;
}

// Ensure we get a direct image URL with an extension
async function uploadImageDirect(buffer) {
    console.log("uploadImageDirect: Trying ImgBB...");
    let url = await uploadToImgbb(buffer);
    if (url) return url;

    console.log("uploadImageDirect: ImgBB failed, trying Tmpfiles...");
    url = await uploadToTmpfiles(buffer);
    if (url) return url;

    return null; // Both failed
}

// Extract image buffer from a quoted image or a direct image message
async function extractImage(sock, msg) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quoted?.imageMessage) {
        const stream = await downloadContentFromMessage(quoted.imageMessage, "image");
        return await streamToBuffer(stream);
    }
    if (msg.message?.imageMessage) {
        const stream = await downloadContentFromMessage(msg.message.imageMessage, "image");
        return await streamToBuffer(stream);
    }
    return null;
}

module.exports = async (sock, msg, from, text, args) => {
    try {
        const imgBuffer = await extractImage(sock, msg);
        if (!imgBuffer) {
            return sock.sendMessage(from, {
                text: `❌ *Reply to an image* to enhance it.\n\n_Example: Reply to any image and type *${settings.prefix}enhance*_`
            }, { quoted: msg });
        }

        // Acknowledge command
        await sock.sendMessage(from, { react: { text: "✨", key: msg.key } }).catch(() => {});
        await sock.sendMessage(from, { text: "⏳ Enhancing your image, please wait..." }, { quoted: msg });

        console.log("Enhance: uploading image to get direct URL (.jpg)...");
        const imageUrl = await uploadImageDirect(imgBuffer);

        if (!imageUrl) {
            return sock.sendMessage(from, { text: "❌ Failed to upload image. Please try again later." }, { quoted: msg });
        }

        console.log("Enhance: final image URL =>", imageUrl);

        // Call the enhancement API
        const apiUrl = `https://anabot.my.id/api/ai/toEnhance?imageUrl=${encodeURIComponent(imageUrl)}&apikey=freeApikey`;
        console.log("Enhance: calling API ->", apiUrl);
        
        const res = await axios.get(apiUrl, { timeout: 120000 });
        console.log("Enhance: API response =>", JSON.stringify(res.data));

        const resultUrl = res.data?.data?.result;
        if (!resultUrl) {
            return sock.sendMessage(from, { text: "❌ API returned no image. Try again later." }, { quoted: msg });
        }

        console.log("Enhance: downloading enhanced image directly to buffer...");
        // Download image to buffer instead of URL to avoid Baileys creating Temp cached files
        const finalImageRes = await axios.get(resultUrl, { responseType: "arraybuffer", timeout: 60000 });
        const finalImageBuffer = Buffer.from(finalImageRes.data);

        const caption = `✨ *IMAGE ENHANCED!* ✨\n\n> ${small_lib.author}`;
        await sock.sendMessage(from, { image: finalImageBuffer, caption }, { quoted: msg });
        await sock.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});

        // Cleanup old temp files just in case
        setTimeout(cleanTempDir, 2000);

    } catch (e) {
        console.error("Enhance Error:", e.message);
        await sock.sendMessage(from, { text: `❌ Error: ${e.message.substring(0, 120)}` }, { quoted: msg });
    }
};
