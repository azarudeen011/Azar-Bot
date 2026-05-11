const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const small = require('../lib/small_lib');
const fs = require('fs');
const os = require('os');
const path = require('path');
const FormData = require('form-data');

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

        const isAudio = quoted?.audioMessage;
        if (!isAudio) {
            return sock.sendMessage(from, {
                text: "❌ Please reply to a Voice Note or Audio file with `.stt` to transcribe it."
            }, { quoted: msg });
        }

        await sock.sendMessage(from, { react: { text: "🎧", key: msg.key } }).catch(() => { });

        const stream = await downloadContentFromMessage(quoted.audioMessage, 'audio');
        const buffer = await streamToBuffer(stream);

        let transcription = "";
        let usedProvider = "";

        // ==========================================
        // ATTEMPT 1: Hugging Face Whisper (Primary Free AI)
        // ==========================================
        try {
            // NOTE: You can create a free Hugging Face token at https://huggingface.co/settings/tokens
            // Once you have it, paste it inside the quotes below:
            const hfToken = "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"; // e.g., "hf_abc123xyz"

            const hfHeaders = { "Content-Type": "audio/ogg" };
            if (hfToken) {
                hfHeaders["Authorization"] = `Bearer ${hfToken}`;
            }

            const hfResponse = await axios.post(
                "https://api-inference.huggingface.co/models/openai/whisper-large-v3-turbo",
                buffer,
                { headers: hfHeaders }
            );

            if (hfResponse.data?.text) {
                transcription = hfResponse.data.text.trim();
                usedProvider = "Hugging Face Whisper";
            } else if (hfResponse.data?.error && hfResponse.data.error.includes("loading")) {
                throw new Error("HF_LOADING");
            }
        } catch (hfErr) {
            console.log("HF Whisper failed:", hfErr.response?.data || hfErr.message);
        }

        // ==========================================
        // ATTEMPT 2: Gemini 1.5 Flash (Fallback)
        // ==========================================
        if (!transcription) {
            try {
                const apiKey = small.api?.gemini;
                if (apiKey) {
                    const base64Audio = buffer.toString('base64');
                    const mimeType = quoted.audioMessage.mimetype || "audio/ogg";

                    // Fixed the 404 Error: The correct model name is "gemini-1.5-flash-latest"
                    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

                    const payload = {
                        contents: [{
                            parts: [
                                { text: "Transcribe this audio exactly as it is spoken. No commentary." },
                                { inlineData: { mimeType: mimeType.split(';')[0], data: base64Audio } }
                            ]
                        }]
                    };

                    const response = await axios.post(endpoint, payload, { headers: { "Content-Type": "application/json" } });
                    const result = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

                    if (result) {
                        transcription = result;
                        usedProvider = "Gemini 1.5 Flash";
                    }
                }
            } catch (gemErr) {
                console.log("Gemini fallback failed:", gemErr.response?.data || gemErr.message);
            }
        }

        // ==========================================
        // ATTEMPT 3: Ryzendesu Whisper (Last Resort)
        // ==========================================
        if (!transcription) {
            try {
                const form = new FormData();
                form.append('audio', buffer, { filename: 'audio.ogg', contentType: 'audio/ogg' });

                const res = await axios.post('https://api.ryzendesu.vip/api/ai/whisper', form, {
                    headers: { ...form.getHeaders() }
                });

                const txt = res.data?.text || res.data?.result || res.data?.transcription;
                if (txt) {
                    transcription = txt.trim();
                    usedProvider = "Ryzendesu Whisper";
                }
            } catch (ryzErr) {
                console.log("Ryzendesu fallback failed:", ryzErr.response?.data || ryzErr.message);
            }
        }

        if (!transcription) {
            throw new Error("All STT providers failed or returned empty data.");
        }

        const replyMsg = `🎙️ *SPEECH TO TEXT* 🎙️\n━━━━━━━━━━━━━━\n\n"${transcription}"\n\n━━━━━━━━━━━━━━\n> _Powered by ${usedProvider}_`;

        await sock.sendMessage(from, { text: replyMsg }, { quoted: msg });
        await sock.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => { });

    } catch (e) {
        console.error("STT Final Error:", e.message);

        let errorMsg = "❌ Failed to transcribe the audio using all available APIs. The servers might be busy.";
        if (e.message === "HF_LOADING") {
            errorMsg = "⏳ The Whisper AI model is currently booting up. Please try again in 20 seconds!";
        }

        await sock.sendMessage(from, { text: errorMsg }, { quoted: msg });
        await sock.sendMessage(from, { react: { text: "❌", key: msg.key } }).catch(() => { });
    }
};
