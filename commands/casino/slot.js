const eco = require('../../lib/economy');
const firebaseManager = require('../../lib/firebaseManager');

const { requireRegistration } = require('../../lib/guards');

const SYMBOLS = ["🍒", "🍋", "🔔", "🍉", "💎", "7️⃣"];

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function getPayout(bet, result) {
    const [r1, r2, r3] = result;
    if (r1 === r2 && r2 === r3) {
        if (r1 === "7️⃣") return bet * 35;
        if (r1 === "💎") return bet * 20;
        if (r1 === "🍒") return bet * 10;
        return bet * 5;
    }
    if (r1 === r2 || r2 === r3 || r1 === r3) {
        return bet * 2; // Return 2x for mini-win (profit)
    }
    return 0;
}

const cooldownManager = require('../../lib/cooldownManager');

module.exports = async (sock, msg, from, text, args) => {
    try {
        const sender = msg.key.participant || msg.key.remoteJid;
        // Global guard in index.js handles requireRegistration

        if (!args[0]) {
            return await sock.sendMessage(from, { text: "⚠️ Usage: \`.slot <bet_amount>\`\nExample: \`.slot 100\`" }, { quoted: msg });
        }

        let bet = parseInt(args[0]);
        if (args[0].toLowerCase() === "all") {
            const user = await eco.getUser(sender);
            bet = user.balance;
        }

        if (isNaN(bet) || bet <= 0) {
            return await sock.sendMessage(from, { text: "❌ Invalid bet amount!" }, { quoted: msg });
        }

        const user = await eco.getUser(sender);

        // ⏳ Per-Game Cooldown Check
        const cd = cooldownManager.check(sender, 'slot');
        if (cd.onCooldown) {
            return await sock.sendMessage(from, {
                text: `⏳ *SLOTS COOLDOWN* ⏳\n\nYou're playing too fast! Please wait **${cooldownManager.formatTime(cd.remaining)}** before your next spin.\n\n_Tip: You can still play other games like .coinflip!_`
            }, { quoted: msg });
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

        await firebaseManager.logTx(sender, { type: "casino", amount: -bet, note: "Slots Bet" });

        let spinText = `🎰 *AZAR SLOTS* 🎰\n━━━━━━━━━━━━━━\n`;
        spinText += `[ 🔄 | 🔄 | 🔄 ]\n`;
        spinText += `━━━━━━━━━━━━━━\n`;
        spinText += `Bet: $${bet}\nSpinning...`;

        const sentMsg = await sock.sendMessage(from, { text: spinText }, { quoted: msg });

        // Animation frames
        for (let i = 0; i < 3; i++) {
            await sleep(600);
            const r1 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            const r2 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            const r3 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];

            let frame = `🎰 *AZAR SLOTS* 🎰\n━━━━━━━━━━━━━━\n`;
            frame += `[ ${r1} | ${r2} | ${r3} ]\n`;
            frame += `━━━━━━━━━━━━━━\n`;
            frame += `Bet: $${bet}\nSpinning...`;

            try {
                await sock.sendMessage(from, { text: frame, edit: sentMsg.key });
            } catch (e) { /* ignore edit errors */ }
        }

        // Final result
        await sleep(600);
        const final1 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        const final2 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        const final3 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];

        const winAmount = getPayout(bet, [final1, final2, final3]);
        let resultMsg = "";

        if (winAmount > 0) {
            await eco.addMoney(sender, winAmount);
            await firebaseManager.logTx(sender, { type: "casino", amount: winAmount, note: "Slots Win" });
            resultMsg = `🎉 *YOU WON!* 🎉\nPayout: *$${currency.format(winAmount)}*`;
        } else {
            const cloverResult = await eco.applyClover(sender, bet, true);
            if (cloverResult.active) {
                resultMsg = `🍀 *LUCKY CLOVER ACTIVATED!* 🍀\n\nYour *Lucky Clover* glowed and returned **$${currency.format(cloverResult.returned)}** to your wallet! ✨\n_(75% protection, 500M cap applied)_`;
            } else {
                resultMsg = `💥 *YOU LOST!* 💥\nBetter luck next time.`;
            }
        }

        // Even if the user won, we must ensure the clover is consumed (Single Charge Rule)
        if (winAmount > 0) {
            await eco.applyClover(sender, bet, false);
        }

        const finalUser = await eco.getUser(sender);
        let balanceMsg = `💵 Wallet: *$${currency.format(finalUser.balance)}*`;
        if (payResult.from === "bank") balanceMsg = `🏦 Bank: *$${currency.format(finalUser.bank)}* (via Black Card)`;

        let finalFrame = `🎰 *AZAR SLOTS* 🎰\n━━━━━━━━━━━━━━\n`;
        finalFrame += `[ ${final1} | ${final2} | ${final3} ]\n`;
        finalFrame += `━━━━━━━━━━━━━━\n`;
        finalFrame += `${resultMsg}\n\n`;
        finalFrame += balanceMsg;

        try {
            await sock.sendMessage(from, { text: finalFrame, edit: sentMsg.key });
        } catch (e) {
            await sock.sendMessage(from, { text: finalFrame }, { quoted: msg });
        }

        // 🛡️ Set Cooldown (5 minutes)
        cooldownManager.set(sender, 'slot', 300);

    } catch (e) {
        console.error("Slot Error:", e);
    }
};
