const axios = require("axios");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const small = require("../lib/small_lib");

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

module.exports = async (sock, msg, from, text, args) => {
    const defaultPrompt = "Analyze this image and provide useful information, context, or an explanation about its main subject. Focus on what it is and relevant details rather than just listing its visual parts.";
    const query = args.length > 0 ? args.join(" ").trim() : defaultPrompt;
    const apiKey = small.api.gemini;

    if (!apiKey) {
        return await sock.sendMessage(from, { text: "❌ Gemini API key is missing in small_lib.js" }, { quoted: msg });
    }

    // Determine if the user replied to an image or sent an image with caption
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const isQuotedImage = quotedMsg?.imageMessage;
    const isImage = msg.message?.imageMessage;

    if (!isQuotedImage && !isImage) {
        return await sock.sendMessage(from, { 
            text: "❌ Please reply to an image with `.imganalyse` or send an image with `.imganalyse` in caption." 
        }, { quoted: msg });
    }

    try {
        await sock.sendMessage(from, { react: { text: "🔍", key: msg.key } }).catch(() => {});

        // Extract the correct image message
        const imageMessage = isQuotedImage ? quotedMsg.imageMessage : msg.message.imageMessage;
        
        // Download image stream
        const stream = await downloadContentFromMessage(imageMessage, "image");
        const buffer = await streamToBuffer(stream);
        
        // Convert buffer to base64
        const base64Image = buffer.toString("base64");
        const mimeType = imageMessage.mimetype || "image/jpeg";

        // Call Gemini 2.5 Flash API with Vision Support
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{
                parts: [
                    { text: query },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Image
                        }
                    }
                ]
            }]
        };

        const response = await axios.post(endpoint, payload, {
            headers: { "Content-Type": "application/json" },
            timeout: 60000 // give it a minute to process the image
        });

        const result = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (result) {
            await sock.sendMessage(from, { text: result }, { quoted: msg });
            await sock.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
        } else {
            throw new Error("Empty response from Gemini Vision API.");
        }

    } catch (err) {
        const errorMsg = err.response?.data?.error?.message || err.message;
        console.error("❌ Image Analyse error:", err.response?.data || err.message);
        await sock.sendMessage(from, { text: `❌ Failed to analyze image: ${errorMsg}` }, { quoted: msg });
    }
};
