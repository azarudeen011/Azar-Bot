const eco = require('../../lib/economy');
const firebaseManager = require('../../lib/firebaseManager');
const cooldownManager = require('../../lib/cooldownManager');
const { requireRegistration } = require('../../lib/guards');

const RED_NUMS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACK_NUMS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
const GREEN_NUMS = [0];

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

module.exports = async (sock, msg, from, text, args) => {
    try {
        const sender = msg.key.participant || msg.key.remoteJid;
        // Global guard in index.js handles requireRegistration

        if (!args[0] || !args[1]) {
            return await sock.sendMessage(from, {
                text: `🎡 *ROULETTE* 🎡\n━━━━━━━━━━━━━━\n⚠️ *Usage:* \`.roulette <color> <bet>\`\n\n` +
                    `🔴 *Red* (x2 Payout)\n` +
                    `⚫ *Black* (x2 Payout)\n` +
                    `🟢 *Green* (x14 Payout)\n\n` +
                    `Example: \`.roulette red 500\``
            }, { quoted: msg });
        }

        const colorBet = args[0].toLowerCase();
        if (!['red', 'black', 'green'].includes(colorBet)) {
            return await sock.sendMessage(from, { text: "❌ Invalid color! Choose red, black, or green." }, { quoted: msg });
        }

        const user = await eco.getUser(sender);

        // ⏳ Per-Game Cooldown Check
        const cd = cooldownManager.check(sender, 'roulette');
        if (cd.onCooldown) {
            return await sock.sendMessage(from, {
                text: `⏳ *ROULETTE COOLDOWN* ⏳\n\nYou're playing too fast! Please wait **${cooldownManager.formatTime(cd.remaining)}** before your next spin.\n\n_Tip: You can still play other games like .slot!_`
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

        await firebaseManager.logTx(sender, { type: "casino", amount: -bet, note: "Roulette Bet" });

        let spinText = `🎡 *ROULETTE WHEEL* 🎡\n━━━━━━━━━━━━━━\n`;
        spinText += `Bet: *$${currency.format(bet)}* on *${colorBet.toUpperCase()}*\n\n`;
        spinText += `🔄 Spinning the wheel...`;

        const sentMsg = await sock.sendMessage(from, { text: spinText }, { quoted: msg });

        await sleep(2500);

        const resultNum = Math.floor(Math.random() * 37); // 0-36
        let resultColor = '';
        let emoji = '';

        if (RED_NUMS.includes(resultNum)) { resultColor = 'red'; emoji = '🔴'; }
        else if (BLACK_NUMS.includes(resultNum)) { resultColor = 'black'; emoji = '⚫'; }
        else { resultColor = 'green'; emoji = '🟢'; }

        let winAmount = 0;
        if (resultColor === colorBet) {
            if (resultColor === 'green') winAmount = bet * 35;
            else winAmount = Math.floor(bet * 2);
        }

        let resultMsg = "";
        if (winAmount > 0) {
            await eco.addMoney(sender, winAmount);
            await firebaseManager.logTx(sender, { type: "casino", amount: winAmount, note: "Roulette Win" });
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

        let finalFrame = `🎡 *ROULETTE WHEEL* 🎡\n━━━━━━━━━━━━━━\n`;
        finalFrame += `The ball landed on: *${resultNum} ${emoji} ${resultColor.toUpperCase()}*\n`;
        finalFrame += `━━━━━━━━━━━━━━\n`;
        finalFrame += `${resultMsg}\n\n`;
        finalFrame += balanceMsg;

        try {
            await sock.sendMessage(from, { text: finalFrame, edit: sentMsg.key });
        } catch (e) {
            await sock.sendMessage(from, { text: finalFrame }, { quoted: msg });
        }

        // 🛡️ Set Cooldown (5 minutes)
        cooldownManager.set(sender, 'roulette', 300);

    } catch (e) {
        console.error("Roulette Error:", e);
    }
};
