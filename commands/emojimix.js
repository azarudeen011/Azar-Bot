// commands/emojimix.js
// 🎭 Emoji Kitchen Mixer — mix two emojis into a sticker
// powered by AzarTech ⚡

const axios = require("axios");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

module.exports = async function emojimix(sock, msg, from, text, args) {
    try {
        await sock.sendMessage(from, { react: { text: "🎭", key: msg.key } });

        const input = args.join(" ").trim();

        if (!input || !input.includes("+")) {
            return sock.sendMessage(
                from,
                { text: "❌ Use: `.emojimix 😈+🔥`" },
                { quoted: msg }
            );
        }

        // Clean spaces: "🔥 + 😈" → "🔥+😈"
        const clean = input.replace(/\s+/g, "");

        const [emoji1, emoji2] = clean.split("+");

        if (!emoji1 || !emoji2) {
            return sock.sendMessage(
                from,
                { text: "⚠️ Provide 2 emojis!\nExample: `.emojimix 😍+🤝`" },
                { quoted: msg }
            );
        }

        // Try Tenor API (Google's Emoji Kitchen v5) first - this is the official emoji mix
        console.log(`emojimix: trying Tenor API with ${emoji1}+${emoji2}`);
        
        const tenorUrl = `https://tenor.googleapis.com/v2/featured?key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&contentfilter=high&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5&q=${encodeURIComponent(emoji1)}_${encodeURIComponent(emoji2)}`;
        
        let imgBuf = null;
        
        try {
            const tenorRes = await axios.get(tenorUrl, { timeout: 5000 });
            const data = tenorRes.data;
            
            if (data.results && data.results.length > 0) {
                const imageUrl = data.results[0].url;
                console.log(`emojimix: got result from Tenor, downloading image`);
                
                const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 5000 });
                imgBuf = Buffer.from(imgRes.data);
                
                if (imgBuf.length > 200) {
                    console.log(`emojimix: successfully fetched from Tenor API`);
                } else {
                    imgBuf = null;
                }
            }
        } catch (tenorErr) {
            console.warn(`emojimix: Tenor API failed:`, tenorErr.message ? tenorErr.message.slice(0, 100) : 'unknown');
        }

        // If Tenor fails, try other emoji mix APIs
        if (!imgBuf || imgBuf.length < 200) {
            console.warn('emojimix: Tenor failed, trying alternative APIs');
            
            const apis = [
                `https://emojik.vercel.app/api?emoji1=${encodeURIComponent(emoji1)}&emoji2=${encodeURIComponent(emoji2)}`,
                `https://emoji-api.herokuapp.com/emojimix/${encodeURIComponent(emoji1)}/${encodeURIComponent(emoji2)}`,
            ];

            for (const api of apis) {
                try {
                    const res = await axios.get(api, { responseType: "arraybuffer", timeout: 5000 });
                    if (!res.data) continue;

                    const testBuf = Buffer.from(res.data);

                    if (testBuf.length >= 200) {
                        let snippet = '';
                        try { snippet = testBuf.toString('utf8', 0, Math.min(100, testBuf.length)); } catch (e) { snippet = ''; }
                        const trimmed = snippet.trim();
                        
                        if (!trimmed.startsWith('{') && !trimmed.startsWith('[') && !trimmed.startsWith('<') && !/^error|failed/i.test(trimmed)) {
                            console.log('emojimix: successfully fetched from:', api.split('/')[2]);
                            imgBuf = testBuf;
                            break;
                        }
                    }
                } catch (apiErr) {
                    console.warn(`emojimix: API ${api.split('/')[2]} failed:`, apiErr.message ? apiErr.message.slice(0, 100) : 'unknown');
                    continue;
                }
            }
        }

        // If all APIs fail, create a blended sticker from raw emoji images
        if (!imgBuf || imgBuf.length < 200) {
            console.warn('emojimix: all real mix APIs failed, attempting local blend from emoji images');
            try {
                const sharp = require('sharp');
                
                // Convert emoji to Unicode codepoint for fetching from emoji CDN
                const getEmojiUrl = (emoji) => {
                    const codePoints = Array.from(emoji)
                        .map(char => char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'))
                        .join('-');
                    return `https://cdn.jsdelivr.net/npm/emoji-datasource-google/img/google/64/${codePoints.toLowerCase()}.png`;
                };
                
                const url1 = getEmojiUrl(emoji1);
                const url2 = getEmojiUrl(emoji2);
                
                console.log(`emojimix: fetching emoji images for blending`);
                
                // Fetch both emoji images
                let buf1 = null, buf2 = null;
                try {
                    const res1 = await axios.get(url1, { responseType: 'arraybuffer', timeout: 3000 });
                    buf1 = Buffer.from(res1.data);
                } catch (e1) {
                    console.warn('emojimix: failed to fetch first emoji image');
                }
                
                try {
                    const res2 = await axios.get(url2, { responseType: 'arraybuffer', timeout: 3000 });
                    buf2 = Buffer.from(res2.data);
                } catch (e2) {
                    console.warn('emojimix: failed to fetch second emoji image');
                }
                
                // If both emojis fetched, create a blend
                if (buf1 && buf2) {
                    const emoji1Img = await sharp(buf1)
                        .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                        .toBuffer({ resolveWithObject: true });
                    
                    const emoji2Img = await sharp(buf2)
                        .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                        .toBuffer({ resolveWithObject: true });
                    
                    imgBuf = await sharp({
                        create: {
                            width: 512,
                            height: 512,
                            channels: 4,
                            background: { r: 255, g: 255, b: 255, alpha: 0 }
                        }
                    })
                    .composite([
                        { input: emoji1Img.data, top: 128, left: 128, blend: 'over' },
                        { input: emoji2Img.data, top: 128, left: 128, blend: 'multiply' }
                    ])
                    .png()
                    .toBuffer();
                    
                    console.log('emojimix: local blend created');
                } else {
                    console.warn('emojimix: could not fetch both emoji images for blending');
                    return sock.sendMessage(
                        from,
                        { text: `❌ Couldn't mix those emojis. Try different ones!` },
                        { quoted: msg }
                    );
                }
            } catch (localErr) {
                console.warn('emojimix: local blend creation failed:', localErr && localErr.message ? localErr.message : localErr);
                return sock.sendMessage(
                    from,
                    { text: `❌ Emoji mix failed. Try: .emojimix ${emoji1}+${emoji2}` },
                    { quoted: msg }
                );
            }
        }

        // Helper: try to convert buffer -> webp sticker using sharp, with fallback to jimp
        async function bufferToWebp(buff) {
            try {
                const sharp = require('sharp');
                const out = await sharp(buff, { animated: false })
                    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .webp({ quality: 90 })
                    .toBuffer();
                return out;
            } catch (sErr) {
                console.warn('sharp conversion failed:', sErr && sErr.message ? sErr.message : sErr);
                
                // Try Jimp as fallback
                try {
                    const Jimp = require('jimp');
                    const j = await Jimp.read(buff);

                    if (typeof j.contain === 'function') {
                        j.contain(512, 512, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE);
                    } else {
                        j.resize(512, 512, Jimp.RESIZE_BEZIER);
                    }

                    const pngBuf = await j.getBufferAsync(Jimp.MIME_PNG);

                    try {
                        const sharp = require('sharp');
                        const out = await sharp(pngBuf)
                            .webp({ quality: 90 })
                            .toBuffer();
                        return out;
                    } catch (innerSharpErr) {
                        console.warn('sharp (second pass) failed:', innerSharpErr && innerSharpErr.message ? innerSharpErr.message : innerSharpErr);
                        return null;
                    }
                } catch (jErr) {
                    console.warn('Jimp conversion failed:', jErr && jErr.message ? jErr.message : jErr);
                    return null;
                }
            }
        }

        // Attempt conversion to webp sticker
        const webpBuf = await bufferToWebp(imgBuf);

        if (webpBuf && webpBuf.length > 0) {
            try {
                await sock.sendMessage(from, { sticker: webpBuf }, { quoted: msg });
                await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });
                return;
            } catch (sendErr) {
                console.warn('Failed to send sticker, will fallback to image:', sendErr && sendErr.message ? sendErr.message : sendErr);
            }
        }

        // If we reach here either conversion failed or sticker send failed — send as an image fallback
        try {
            await sock.sendMessage(
                from,
                { image: imgBuf, caption: '🔀 Mixed emoji (could not convert to sticker)' },
                { quoted: msg }
            );
            await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });
        } catch (finalErr) {
            console.error('EmojiMix final fallback failed:', finalErr && finalErr.message ? finalErr.message : finalErr);
            await sock.sendMessage(
                from,
                { text: '❌ Could not deliver mixed emoji — the output format is not supported.' },
                { quoted: msg }
            );
        }

        await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (err) {
        console.error("EmojiMix Error:", err.message);

        await sock.sendMessage(
            from,
            { text: "❌ Couldn't mix emojis. Not all combos are supported." },
            { quoted: msg }
        );
    }
};
