const axios = require("axios");

module.exports = async (sock, msg, from, text, args) => {
    // Expected usage: .fakeiphone @user <text>
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const targetUser = mentioned[0];
    
    if (!targetUser || args.length < 2) {
        return sock.sendMessage(from, { text: "⚠️ Usage: `.fakeiphone @user Your custom text`" }, { quoted: msg });
    }

    // Extract the text by removing the mention
    const customText = text.replace(/@\d+/g, "").trim();
    if (!customText) {
        return sock.sendMessage(from, { text: "⚠️ Please provide some text for the fake message." }, { quoted: msg });
    }

    await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } });

    try {
        // Get user's profile picture
        let ppUrl = "https://i.ibb.co/3Fh9Q6M/empty-profile.png"; // Default fallback
        try {
            ppUrl = await sock.profilePictureUrl(targetUser, "image");
        } catch { }

        // Get user's name
        let contactName = targetUser.split("@")[0];
        try {
            // If there's a cached name from contacts, use it, otherwise fallback to number
            const contact = await sock.contactDB?.get(targetUser);
            if (contact?.name) contactName = contact.name;
        } catch {}

        // -------------------------------------------------------------
        // 🔥 API CONFIGURATION
        // Insert your API endpoint for the iOS Highlight Fake Reply here.
        // Example uses a standard query structure common in WA bots.
        // -------------------------------------------------------------
        const API_URL = "https://api.botcahx.eu.org/api/maker/fakereply"; 
        const API_KEY = "YOUR_API_KEY_HERE"; // 👈 PUT YOUR API KEY HERE

        const response = await axios.get(API_URL, {
            params: {
                text: customText,
                name: contactName,
                avatar: ppUrl,
                apikey: API_KEY
            },
            responseType: "arraybuffer"
        });

        const imageBuffer = Buffer.from(response.data, "binary");

        await sock.sendMessage(from, { 
            image: imageBuffer,
            caption: "📱 *iPhone Highlight Generated!*",
            mentions: [targetUser]
        }, { quoted: msg });

    } catch (err) {
        console.error("FakeiPhone Error:", err.message);
        await sock.sendMessage(from, { 
            text: "❌ Failed to generate the fake iPhone chat.\n\n*(Did you forget to add your API Key in `src/commands/fakeiphone.js`?)*" 
        }, { quoted: msg });
    }
};
