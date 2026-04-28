const eco = require('../../lib/economy');

module.exports = async (sock, msg, from, text, args) => {
    try {
        const sender = msg.key.participant || msg.key.remoteJid;
        
        // Find target
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const target = mentioned[0] || sender;
        const isSelf = target === sender;

        const user = eco.getUser(target);

        let msgText = `💰 *AZAR CASINO BANK* 💰\n━━━━━━━━━━━━━━\n`;
        msgText += `👤 *User:* @${target.split("@")[0]}\n`;
        msgText += `💵 *Balance:* $${user.balance.toLocaleString()}\n`;
        msgText += `📈 *Total Won:* $${user.totalWon.toLocaleString()}\n`;
        msgText += `📉 *Total Lost:* $${user.totalLost.toLocaleString()}\n`;
        msgText += `━━━━━━━━━━━━━━\n`;
        if (isSelf) msgText += `💡 Tip: Use \`.daily\` for free money or \`.slot\` to gamble!`;

        await sock.sendMessage(from, { text: msgText, mentions: [target] }, { quoted: msg });
    } catch (e) {
        console.error("Balance Error:", e);
        await sock.sendMessage(from, { text: "❌ Error fetching balance." }, { quoted: msg });
    }
};
