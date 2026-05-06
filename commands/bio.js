/**
 * .bio Command
 * Set your AzahraVerse profile bio via bot
 */

const { requireRegistration } = require("../lib/guards");
const firebaseManager = require("../lib/firebaseManager");

module.exports = async function (sock, msg, from, text, args) {
    const sender = msg.key.participant || msg.key.remoteJid;
    
    // 1. Check Registration
    const isReg = await requireRegistration(sock, from, sender, msg);
    if (!isReg) return;

    // 2. Get Bio Text
    const bioText = args.join(" ").trim();
    if (!bioText) {
        return sock.sendMessage(from, { text: "❌ Usage: `.bio <your new bio text>`" });
    }

    if (bioText.length > 150) {
        return sock.sendMessage(from, { text: "❌ Bio is too long! Max 150 characters." });
    }

    // 3. Update Firebase
    const success = await firebaseManager.updateUser(sender, { bio: bioText });

    if (success) {
        await sock.sendMessage(from, { 
            text: `✅ *Bio Updated!*\n\nNew Bio: _"${bioText}"_\n\nCheck your profile: https://azahraverse.lovable.app/profile` 
        }, { quoted: msg });
    } else {
        await sock.sendMessage(from, { text: "❌ Failed to update bio. Please try again later." });
    }
};
