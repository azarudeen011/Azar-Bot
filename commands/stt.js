const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const small = require('../lib/small_lib');
const fs = require('fs');
const os = require('os');
const path = require('path');

module.exports = async (sock, msg, from, text, args) => {
    try {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        // Ensure they quoted an audio message
        const isAudio = quoted?.audioMessage;
        if (!isAudio) {
            return sock.sendMessage(from, { 
                text: "❌ Please reply to a Voice Note or Audio file with `.stt` to transcribe it." 
            }, { quoted: msg });
        }

        const apiKey = small.api?.gemini;
        if (!apiKey) {
            return sock.sendMessage(from, { text: "❌ Gemini API key is missing. Contact the owner." }, { quoted: msg });
        }

        await sock.sendMessage(from, { react: { text: "🎧", key: msg.key } }).catch(() => {});

        // 1. Download the audio buffer
        const buffer = await downloadMediaMessage(
            { message: quoted },
            'buffer',
            {},
            { logger: require('pino')({ level: 'silent' }) }
        );

        // 2. Transcribe using Gemini 2.5 Flash
        // Gemini supports base64 inline audio for Speech-to-Text!
        const base64Audio = buffer.toString('base64');
        const mimeType = quoted.audioMessage.mimetype || "audio/ogg";

        const endpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{
                parts: [
                    { text: "Please transcribe this audio exactly as it is spoken. Do not add any commentary, just return the transcription text. If it is empty or music, say 'No speech detected'." },
                    { 
                        inlineData: {
                            mimeType: mimeType.split(';')[0], // e.g. audio/ogg
                            data: base64Audio
                        }
                    }
                ]
            }]
        };

        const response = await axios.post(endpoint, payload, {
            headers: { "Content-Type": "application/json" }
        });

        const transcription = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!transcription) {
            throw new Error("Empty response from AI.");
        }

        const replyMsg = `🎙️ *SPEECH TO TEXT* 🎙️\n━━━━━━━━━━━━━━\n\n"${transcription}"\n\n━━━━━━━━━━━━━━\n> _Transcribed by AzahraBot AI_`;

        await sock.sendMessage(from, { text: replyMsg }, { quoted: msg });
        await sock.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});

    } catch (e) {
        console.error("STT error:", e.response?.data || e.message);
        await sock.sendMessage(from, { text: "❌ Failed to transcribe the audio. It might be too long or an unsupported format." }, { quoted: msg });
        await sock.sendMessage(from, { react: { text: "❌", key: msg.key } }).catch(() => {});
    }
};
