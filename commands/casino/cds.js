const eco = require("../../lib/economy");
const cooldownManager = require("../../lib/cooldownManager");
const { requireRegistration } = require("../../lib/guards");

module.exports = async (sock, msg, from, text, args) => {
    const senderJid = msg.key.participant || msg.key.remoteJid;
    if (!(await requireRegistration(sock, from, senderJid, msg))) return;

    const cooldowns = cooldownManager.getUserCooldowns(senderJid);

    if (cooldowns.length === 0) {
        return sock.sendMessage(from, { 
            text: "✅ *COOLDOWN STATUS*\n\nAll your systems are GO! You have no active casino cooldowns. Go win some coins! 🎰💰" 
        }, { quoted: msg });
    }

    let response = `⏳ *ACTIVE COOLDOWNS*\n\nHere are your current wait times:\n━━━━━━━━━━━━━━\n`;
    
    cooldowns.forEach(cd => {
        const gameName = cd.game.toUpperCase();
        response += `🎮 *${gameName}:* ${cooldownManager.formatTime(cd.remaining)}\n`;
    });

    response += `━━━━━━━━━━━━━━\n_Check back soon to play again!_`;

    await sock.sendMessage(from, { text: response }, { quoted: msg });
};
