const sharp = require('sharp');
const axios = require('axios');

async function getBuffer(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(res.data, 'binary');
    } catch (e) {
        return null;
    }
}

/**
 * Renders a "Battle Poster" for pet duels.
 */
async function renderDuelImage(p1, p2) {
    try {
        const [img1, img2] = await Promise.all([
            getBuffer(p1.url),
            getBuffer(p2.url)
        ]);

        if (!img1 || !img2) return null;

        // 🎨 Settings
        const width = 800;
        const height = 400;
        const petSize = 300;

        // Process Pet 1 (Left)
        const pet1 = await sharp(img1)
            .resize(petSize, petSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .toBuffer();

        // Process Pet 2 (Right)
        const pet2 = await sharp(img2)
            .resize(petSize, petSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .flop() // Face left
            .toBuffer();

        // Create Background
        const background = await sharp({
            create: {
                width: width,
                height: height,
                channels: 4,
                background: { r: 15, g: 15, b: 25, alpha: 1 } // Dark Blue/Black
            }
        }).png().toBuffer();

        // Composite VS Image
        const result = await sharp(background)
            .composite([
                { input: pet1, top: 50, left: 50 },
                { input: pet2, top: 50, left: 450 },
                { 
                    input: Buffer.from('<svg width="800" height="400"><text x="400" y="220" font-family="Arial" font-size="80" fill="red" font-weight="bold" text-anchor="middle">VS</text></svg>'),
                    top: 0,
                    left: 0
                },
                {
                    input: Buffer.from(`<svg width="800" height="400">
                        <text x="200" y="380" font-family="Arial" font-size="24" fill="white" font-weight="bold" text-anchor="middle">${p1.name.toUpperCase()}</text>
                        <text x="600" y="380" font-family="Arial" font-size="24" fill="white" font-weight="bold" text-anchor="middle">${p2.name.toUpperCase()}</text>
                    </svg>`),
                    top: 0,
                    left: 0
                }
            ])
            .png()
            .toBuffer();

        return result;
    } catch (e) {
        console.error("[DuelRenderer] Error:", e);
        return null;
    }
}

module.exports = { renderDuelImage };
