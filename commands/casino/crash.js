const eco = require('../../lib/economy');
const firebaseManager = require('../../lib/firebaseManager');
const cooldownManager = require('../../lib/cooldownManager');
const { requireRegistration } = require('../../lib/guards');

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function getCrashPoint() {
    // Standard casino crash algorithm (House edge ~ 5%)
    const e = 2 ** 52;
    const h = Math.floor(Math.random() * e);
    if (h % 10 === 0) return 1.00; // 10% chance of instant crash
    return Math.max(1.00, Math.floor((95 * e - h) / (e - h)) / 100.0);
}

module.exports = async (sock, msg, from, text, args) => {
    try {
        const sender = msg.key.participant || msg.key.remoteJid;
        // Global guard in index.js handles requireRegistration

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

        const user = await eco.getUser(sender);

        // ⏳ Per-Game Cooldown Check
        const cd = cooldownManager.check(sender, 'crash');
        if (cd.onCooldown) {
            return await sock.sendMessage(from, {
                text: `⏳ *CRASH COOLDOWN* ⏳\n\nYou're playing too fast! Please wait *${cooldownManager.formatTime(cd.remaining)}* before your next run.\n\n_Tip: You can still play other games like .slot!_`
            }, { quoted: msg });
        }

        let bet = parseInt(args[1]);
        if (args[1].toLowerCase() === "all") bet = user.balance;

        if (isNaN(bet) || bet <= 0) {
            return await sock.sendMessage(from, { text: "❌ Invalid bet amount!" }, { quoted: msg });
        }

        const currency = new Intl.NumberFormat('en-US');
        const payResult = await eco.spend(sender, bet);
        if (!payResult.success) {
            if (payResult.error === "not_registered") {
                return await sock.sendMessage(from, { text: "❌ You are not registered on the website!" }, { quoted: msg });
            }
            if (payResult.needsBlackCard) {
                return await sock.sendMessage(from, { text: `❌ Insufficient wallet balance! You have enough in your bank ($${currency.format(payResult.currentBank || 0)}), but you need a *Black Card* to spend from bank directly.` }, { quoted: msg });
            }
            const currentWallet = payResult.currentWallet || 0;
            return await sock.sendMessage(from, { text: `❌ You don't have enough money!\nYour wallet: *$${currency.format(currentWallet)}*` }, { quoted: msg });
        }

        await firebaseManager.logTx(sender, { type: "casino", amount: -bet, note: "Crash Bet" });

        let spinText = `🚀 *CRASH GAME* 🚀\n━━━━━━━━━━━━━━\n`;
        spinText += `Bet: *$${currency.format(bet)}*\n`;
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
            await eco.addMoney(sender, winAmount);
            await firebaseManager.logTx(sender, { type: "casino", amount: winAmount, note: "Crash Win" });
            resultMsg = `🎉 *YOU CASHED OUT!* 🎉\nYou successfully escaped at *${cashout}x* before it crashed!\n\nPayout: *$${currency.format(winAmount)}*`;
        } else {
            const cloverResult = await eco.applyClover(sender, bet, true);
            if (cloverResult.active) {
                resultMsg = `🍀 *LUCKY CLOVER ACTIVATED!* 🍀\n\nYour *Lucky Clover* glowed and returned **$${currency.format(cloverResult.returned)}** to your wallet! ✨\n_(75% protection, 500M cap applied)_`;
            } else {
                resultMsg = `💥 *CRASHED!* 💥\nThe rocket blew up before reaching ${cashout}x!\nBetter luck next time.`;
            }
        }

        // Even if the user won, we must ensure the clover is consumed (Single Charge Rule)
        if (winAmount > 0) {
            await eco.applyClover(sender, bet, false);
        }

        const finalUser = await eco.getUser(sender);
        let balanceMsg = `💵 Wallet: *$${currency.format(finalUser.balance)}*`;
        if (payResult.from === "bank") balanceMsg = `🏦 Bank: *$${currency.format(finalUser.bank)}* (via Black Card)`;

        let finalFrame = `🚀 *CRASH GAME* 🚀\n━━━━━━━━━━━━━━\n`;
        finalFrame += `💥 Crashed at: *${actualCrash.toFixed(2)}x*\n`;
        finalFrame += `━━━━━━━━━━━━━━\n`;
        finalFrame += `${resultMsg}\n\n`;
        finalFrame += balanceMsg;

        try {
            await sock.sendMessage(from, { text: finalFrame, edit: sentMsg.key });
        } catch (e) {
            await sock.sendMessage(from, { text: finalFrame }, { quoted: msg });
        }

        // 🛡️ Set Cooldown (5 minutes)
        cooldownManager.set(sender, 'crash', 300);

    } catch (e) {
        console.error("Crash Error:", e);
    }
};
