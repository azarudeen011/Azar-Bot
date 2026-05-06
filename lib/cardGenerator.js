const axios = require('axios');
const sharp = require('sharp');

/**
 * Generates a beautiful profile card using Sharp (No Jimp needed!).
 */
async function generateProfileCard(data) {
    try {
        // 1. Resolve Avatar & Frame URLs
        let avatarUrl = data.avatarUrl || data.waAvatarUrl || "https://res.cloudinary.com/ds1lpf36n/image/upload/v1762079835/satoru-gojo-black-3840x2160-14684_1_amj5ys.png";
        
        // If it's a relative path or lib ID, try to resolve it via the website's new redirect endpoint
        if (avatarUrl && avatarUrl.startsWith("lib:")) {
            const avatarId = avatarUrl.split(":")[1];
            avatarUrl = `https://azahraverse.lovable.app/api/public/avatar-img/${avatarId}`;
        }

        let frameUrl = data.frameUrl || null;
        if (!frameUrl && data.frameId) {
            if (data.frameId.startsWith("lib:")) {
                const fId = data.frameId.split(":")[1];
                frameUrl = `https://azahraverse.lovable.app/api/public/frame-img/${fId}`;
            } else {
                frameUrl = `https://azahraverse.lovable.app/frames/${data.frameId}.webp`;
            }
        }

        // 2. Fetch Assets
        const bgUrl = "https://i.ibb.co/27N5XB73/bg-2.jpg";
        const fallbackAvatar = "https://res.cloudinary.com/ds1lpf36n/image/upload/v1762079835/satoru-gojo-black-3840x2160-14684_1_amj5ys.png";
        
        const [bgRes, avRes, frRes] = await Promise.all([
            axios.get(bgUrl, { responseType: 'arraybuffer' }),
            axios.get(avatarUrl, { responseType: 'arraybuffer' }).catch(() => axios.get(fallbackAvatar, { responseType: 'arraybuffer' })),
            frameUrl ? axios.get(frameUrl, { responseType: 'arraybuffer' }).catch(() => null) : Promise.resolve(null)
        ]);

        const avatarSize = 210; // Shrunk from 240 so it fits perfectly INSIDE the frame

        // 3. Process Avatar (Circle)
        const processedAvatar = await sharp(avRes.data)
            .resize(avatarSize, avatarSize)
            .composite([{
                input: Buffer.from(`<svg width="${avatarSize}" height="${avatarSize}"><circle cx="${avatarSize/2}" cy="${avatarSize/2}" r="${avatarSize/2}" /></svg>`),
                blend: 'dest-in'
            }])
            .png()
            .toBuffer();

        // 4. Process Frame
        let processedFrame = null;
        if (frRes && frRes.data) {
            processedFrame = await sharp(frRes.data)
                .resize(280, 280) // Frame stays 280x280
                .png()
                .toBuffer();
        }

        // 5. Create SVG Overlay (Text, Bar, UI)
        const xp = data.xp || 0;
        const level = data.level || 1;
        const xpMax = 100 * level;
        const xpPercent = Math.min(100, (xp / xpMax) * 100);
        const barWidth = 400;
        // Fix the progress bar minimum width so it doesn't look broken at low XP
        const fillWidth = Math.max(35, (xpPercent / 100) * barWidth);

        const clean = (str) => String(str || "").replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
        const name = clean(data.name);
        const bio = clean(data.bio);

        const svgOverlay = `
        <svg width="800" height="800" xmlns="http://www.w3.org/2000/svg">
            <style>
                .name { fill: white; font-size: 60px; font-family: sans-serif; font-weight: bold; }
                .bio { fill: #dddddd; font-size: 28px; font-family: sans-serif; font-style: italic; }
                .stats { fill: #00bfff; font-size: 32px; font-family: sans-serif; font-weight: bold; }
                .label { fill: #dddddd; font-size: 20px; font-family: sans-serif; }
                .value { fill: white; font-size: 22px; font-family: sans-serif; font-weight: bold; }
                .xp-text { fill: white; font-size: 18px; font-family: sans-serif; font-weight: bold; }
            </style>
            <text x="400" y="440" text-anchor="middle" class="name">${name || "Azahra Citizen"}</text>
            <text x="400" y="485" text-anchor="middle" class="bio">(${bio || "No bio set"})</text>
            <text x="400" y="540" text-anchor="middle" class="stats">Rank #${data.rank || "???"}  Level ${level}</text>
            <rect x="200" y="580" width="${barWidth}" height="35" rx="17.5" fill="#333333" />
            <rect x="200" y="580" width="${fillWidth}" height="35" rx="17.5" fill="#00bfff" />
            <text x="400" y="605" text-anchor="middle" class="xp-text">${xp} / ${xpMax} XP</text>
            <text x="40" y="50" class="label">Bank:</text>
            <text x="110" y="50" class="value">$${data.bank || 0}</text>
            <text x="40" y="85" class="label">Wallet:</text>
            <text x="125" y="85" class="value">$${data.wallet || 0}</text>
            
            <!-- Orbs Sync -->
            <image x="35" y="105" width="25" height="25" href="https://azahraverse.lovable.app/assets/orb-CRuYPI-1.png" />
            <text x="70" y="125" class="label">Orbs:</text>
            <text x="135" y="125" class="value">${data.orbs || 0}</text>

            <text x="400" y="750" text-anchor="middle" fill="#555555" font-size="20px" font-family="sans-serif">AZAHRAVERSE — Family</text>
        </svg>`;

        // 6. Composite Final Image
        // Center of 800x800 is 400x400. 
        // Frame is 280x280 -> left: 260, top: 120 (Center is 400, 260)
        // Avatar is 210x210 -> left: 295, top: 155 (Center is 400, 260)
        const layers = [{ input: processedAvatar, top: 155, left: 295 }];
        if (processedFrame) layers.push({ input: processedFrame, top: 120, left: 260 });
        layers.push({ input: Buffer.from(svgOverlay), top: 0, left: 0 });

        return await sharp(bgRes.data)
            .resize(800, 800, { fit: 'cover' })
            .blur(2)
            .composite(layers)
            .png()
            .toBuffer();

    } catch (e) {
        console.error("Sharp Card Gen Error:", e);
        throw e;
    }
}

module.exports = { generateProfileCard };
