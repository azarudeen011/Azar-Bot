const eco = require('../../lib/economy');

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function getCrashPoint() {
    // Standard casino crash algorithm (House edge ~ 4%)
    const e = 2 ** 52;
    const h = Math.floor(Math.random() * e);
    if (h % 25 === 0) return 1.00; // 4% chance of instant crash
    return Math.max(1.00, Math.floor((100 * e - h) / (e - h)) / 100.0);
}

module.exports = async (sock, msg, from, text, args) => {
    try {
        const sender = msg.key.participant || msg.key.remoteJid;
        
        if (!args[0] || !args[1]) {
            return await sock.sendMessage(from, { 
                text: `🚀 *CRASH GAME* 🚀\n━━━━━━━━━━━━━━\n⚠️ *Usage:* \`.crash <multiplier> <bet>\`\n\n` +
                      `Guess the cashout multiplier! If the rocket crashes *after* your multiplier, you win.\n\n` +
                      `Example: \`.crash 2.5 100\` (Cashout at 2.5x with $100 bet)` 
            }, { quoted: msg });
        }

        const cashout = parseFloat(args[0]);
        if (isNaN(cashout) || cashout < 1.01) {
            return await sock.sendMessage(from, { text: "❌ Invalid multiplier! Must be at least 1.01x." }, { quoted: msg });
        }

        let bet = parseInt(args[1]);
        if (args[1].toLowerCase() === "all") bet = eco.getUser(sender).balance;

        if (isNaN(bet) || bet <= 0) {
            return await sock.sendMessage(from, { text: "❌ Invalid bet amount!" }, { quoted: msg });
        }

        const userBal = eco.getUser(sender).balance;
        if (userBal < bet) {
            return await sock.sendMessage(from, { text: `❌ You don't have enough money!\nYour balance: *$${userBal.toLocaleString()}*` }, { quoted: msg });
        }

        eco.removeMoney(sender, bet);

        let spinText = `🚀 *CRASH GAME* 🚀\n━━━━━━━━━━━━━━\n`;
        spinText += `Bet: *$${bet.toLocaleString()}*\n`;
        spinText += `Target: *${cashout}x*\n\n`;
        spinText += `🚀 Preparing launch...`;

        const sentMsg = await sock.sendMessage(from, { text: spinText }, { quoted: msg });

        const actualCrash = getCrashPoint();
        
        // Animation
        let currentMult = 1.00;
        let animationSteps = [1.00, 1.20, 1.50, 1.80, 2.50, 4.00, 7.00, 10.00];
        
        for (let step of animationSteps) {
            if (step >= actualCrash || step >= cashout) break;
            currentMult = step;
            await sleep(800);
            let frame = `🚀 *CRASH GAME* 🚀\n━━━━━━━━━━━━━━\n`;
            frame += `🚀 Rocket is climbing!\n`;
            frame += `📈 Current: *${currentMult.toFixed(2)}x*\n`;
            try { await sock.sendMessage(from, { text: frame, edit: sentMsg.key }); } catch (e) { }
        }

        await sleep(800);
        
        let winAmount = 0;
        let resultMsg = "";
        
        if (actualCrash >= cashout) {
            winAmount = Math.floor(bet * cashout);
            eco.addMoney(sender, winAmount);
            resultMsg = `🎉 *YOU CASHED OUT!* 🎉\nYou successfully escaped at *${cashout}x* before it crashed!\n\nPayout: *$${winAmount.toLocaleString()}*`;
        } else {
            resultMsg = `💥 *CRASHED!* 💥\nThe rocket blew up before reaching ${cashout}x!\nBetter luck next time.`;
        }

        const newBal = eco.getUser(sender).balance;

        let finalFrame = `🚀 *CRASH GAME* 🚀\n━━━━━━━━━━━━━━\n`;
        finalFrame += `💥 Crashed at: *${actualCrash.toFixed(2)}x*\n`;
        finalFrame += `━━━━━━━━━━━━━━\n`;
        finalFrame += `${resultMsg}\n\n`;
        finalFrame += `💵 Balance: *$${newBal.toLocaleString()}*`;

        try {
            await sock.sendMessage(from, { text: finalFrame, edit: sentMsg.key });
        } catch (e) {
            await sock.sendMessage(from, { text: finalFrame }, { quoted: msg });
        }

    } catch (e) {
        console.error("Crash Error:", e);
    }
};
