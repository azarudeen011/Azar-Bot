const axios = require("axios");
const settings = require("../../settings");
const small_lib = require("../../lib/small_lib");

// SKZ-style prompt variants for different engines
const SKZ_PROMPT = (text) =>
    `Stray Kids (SKZ) kpop style logo, aggressive grunge aesthetic, red and black theme, with the exact text "${text}" written in bold rough brush typography, high quality, dark background`;

const SKZ_PROMPT_ALT = (text) =>
    `create a bold dark kpop logo design inspired by Stray Kids with text "${text}", glitch effects, neon red accents on black background, street style grunge typography`;

module.exports = async (sock, msg, from, body, args) => {
    const text = args.join(" ").trim();
    
    if (!text) {
        return sock.sendMessage(from, { text: "🎨 *SKZ LOGO MAKER*\n\nUsage: " + settings.prefix + "skzlogo <text>\nExample: " + settings.prefix + "skzlogo AzarTech" }, { quoted: msg });
    }

    await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } }).catch(() => { });

    let imageBuffer = null;
    let engine = "";

    // ─── Engine 1: Pollinations AI (Flux model — best quality) ───
    try {
        const seed = Math.floor(Math.random() * 100000);
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(SKZ_PROMPT(text))}?width=1024&height=1024&nologo=true&model=flux&seed=${seed}`;
        const res = await axios.get(url, { responseType: "arraybuffer", timeout: 60000 });
        if (res.data && res.data.byteLength > 5000) {
            imageBuffer = Buffer.from(res.data);
            engine = "Pollinations Flux";
        }
    } catch (e) {
        console.log("skzlogo Pollinations Flux failed:", e.message);
    }

    // ─── Engine 2: Pollinations AI (Default model — faster) ───
    if (!imageBuffer) {
        try {
            const seed = Math.floor(Math.random() * 100000);
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(SKZ_PROMPT_ALT(text))}?width=1024&height=1024&nologo=true&seed=${seed}`;
            const res = await axios.get(url, { responseType: "arraybuffer", timeout: 60000 });
            if (res.data && res.data.byteLength > 5000) {
                imageBuffer = Buffer.from(res.data);
                engine = "Pollinations Default";
            }
        } catch (e) {
            console.log("skzlogo Pollinations Default failed:", e.message);
        }
    }

    // ─── Engine 3: EliteProTech Imagine API ───
    if (!imageBuffer) {
        try {
            const url = `https://eliteprotech-apis.zone.id/imagine?prompt=${encodeURIComponent(SKZ_PROMPT(text))}`;
            const res = await axios.get(url, { responseType: "arraybuffer", timeout: 60000 });
            if (res.data && res.data.byteLength > 5000) {
                imageBuffer = Buffer.from(res.data);
                engine = "EliteProTech";
            }
        } catch (e) {
            console.log("skzlogo EliteProTech failed:", e.message);
        }
    }

    // ─── Engine 4: PrinceTechn Flux API ───
    if (!imageBuffer) {
        try {
            const url = `https://api.princetechn.com/api/ai/flux?apikey=prince&prompt=${encodeURIComponent(SKZ_PROMPT_ALT(text))}`;
            const res = await axios.get(url, { timeout: 30000 });
            if (res.data?.success && res.data?.result?.image_url) {
                const imgRes = await axios.get(res.data.result.image_url, { responseType: "arraybuffer", timeout: 30000 });
                imageBuffer = Buffer.from(imgRes.data);
                engine = "PrinceTechn";
            }
        } catch (e) {
            console.log("skzlogo PrinceTechn failed:", e.message);
        }
    }

    // ─── Engine 5: Stability AI (if key available) ───
    if (!imageBuffer && small_lib.api?.stability) {
        try {
            const res = await axios.post(
                "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
                {
                    text_prompts: [{ text: SKZ_PROMPT(text), weight: 1 }],
                    cfg_scale: 7, height: 1024, width: 1024, steps: 30, samples: 1
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${small_lib.api.stability}`,
                        "Accept": "application/json"
                    },
                    timeout: 60000
                }
            );
            if (res.data?.artifacts?.[0]?.base64) {
                imageBuffer = Buffer.from(res.data.artifacts[0].base64, "base64");
                engine = "Stability AI";
            }
        } catch (e) {
            console.log("skzlogo Stability failed:", e.message);
        }
    }

    // ─── Final Result ───
    if (imageBuffer) {
        const caption = `🎨 *LOGO GENERATED: SKZ LOGO* 🎨\n\n> ${small_lib.author}`;
        await sock.sendMessage(from, { image: imageBuffer, caption }, { quoted: msg });
        await sock.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => { });
    } else {
        await sock.sendMessage(from, { text: "❌ All logo engines are busy. Please try again in a moment." }, { quoted: msg });
        await sock.sendMessage(from, { react: { text: "⚠️", key: msg.key } }).catch(() => { });
    }
};
