const eco = require('../../lib/economy');

module.exports = async (sock, msg, from) => {
    try {
        const sender = msg.key.participant || msg.key.remoteJid;
        const res = eco.checkDaily(sender);

        if (res.success) {
            await sock.sendMessage(from, { 
                text: `🎁 *DAILY REWARD CLAIMED!* 🎁\n━━━━━━━━━━━━━━\n🎉 You received: *$${res.reward.toLocaleString()}*\n💵 Current Balance: *$${res.newBalance.toLocaleString()}*\n━━━━━━━━━━━━━━\nCome back in 12 hours!` 
            }, { quoted: msg });
        } else {
            const h = Math.floor(res.remaining / (1000 * 60 * 60));
            const m = Math.floor((res.remaining % (1000 * 60 * 60)) / (1000 * 60));
            await sock.sendMessage(from, { 
                text: `⏳ *PLEASE WAIT*\n━━━━━━━━━━━━━━\nYou already claimed your daily reward.\nCome back in *${h}h ${m}m*!` 
            }, { quoted: msg });
        }
    } catch (e) {
        console.error("Daily Error:", e);
    }
};
