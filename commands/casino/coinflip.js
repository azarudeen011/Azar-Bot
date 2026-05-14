const eco = require('../../lib/economy');
const firebaseManager = require('../../lib/firebaseManager');
const cooldownManager = require('../../lib/cooldownManager');
const { requireRegistration } = require('../../lib/guards');

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

module.exports = async (sock, msg, from, text, args) => {
    try {
        const sender = msg.key.participant || msg.key.remoteJid;
        // Global guard in index.js handles requireRegistration

        if (!args[0] || !args[1]) {
            return await sock.sendMessage(from, {
                text: `🪙 *COINFLIP* 🪙\n━━━━━━━━━━━━━━\n⚠️ *Usage:* \`.coinflip <side> <bet>\`\n\n` +
                    `🪙 *Sides:* heads, tails\n` +
                    `Example: \`.coinflip heads 100\``
            }, { quoted: msg });
        }

        const choice = args[0].toLowerCase();
        if (!['heads', 'tails', 'head', 'tail', 'h', 't'].includes(choice)) {
            return await sock.sendMessage(from, { text: "❌ Invalid side! Choose heads or tails." }, { quoted: msg });
        }

        const normalizedChoice = choice.startsWith('h') ? 'heads' : 'tails';

        const user = await eco.getUser(sender);

        // ⏳ Per-Game Cooldown Check
        const cd = cooldownManager.check(sender, 'coinflip');
        if (cd.onCooldown) {
            return await sock.sendMessage(from, {
                text: `⏳ *COINFLIP COOLDOWN* ⏳\n\nYou're playing too fast! Please wait *${cooldownManager.formatTime(cd.remaining)}* before your next flip.\n\n_Tip: You can still play other games like .slot!_`
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

        await firebaseManager.logTx(sender, { type: "casino", amount: -bet, note: "Coinflip Bet" });

        let spinText = `🪙 *COINFLIP* 🪙\n━━━━━━━━━━━━━━\n`;
        spinText += `Bet: *$${currency.format(bet)}* on *${normalizedChoice.toUpperCase()}*\n\n`;
        spinText += `🔄 Flipping the coin...`;

        const sentMsg = await sock.sendMessage(from, { text: spinText }, { quoted: msg });

        await sleep(2000);

        const resultSide = Math.random() < 0.46 ? normalizedChoice : (normalizedChoice === 'heads' ? 'tails' : 'heads');
        const emoji = resultSide === 'heads' ? '🗣️' : '🦅';

        let winAmount = 0;
        if (resultSide === normalizedChoice) {
            winAmount = Math.floor(bet * 1.9);
            await eco.addMoney(sender, winAmount);
            await firebaseManager.logTx(sender, { type: "casino", amount: winAmount, note: "Coinflip Win" });
        }

        let resultMsg = "";
        if (winAmount > 0) {
            resultMsg = `🎉 *YOU WON!* 🎉\nPayout: *$${currency.format(winAmount)}*`;
        } else {
            // 🍀 CHECK FOR ACTIVE LUCKY CLOVER (Must be .used first)
            const cleanSender = sender.split(':')[0].split('@')[0] + (sender.includes('@lid') ? '@lid' : '@s.whatsapp.net');
            const phoneDigits = require('../../lib/identityManager').resolveNumber(cleanSender);
            const freshUser = await firebaseManager.fetchUser(phoneDigits);

            if (freshUser?.cloverActive) {
                // Return money instantly
                await eco.addMoney(sender, bet);
                
                // Consume Activation
                await firebaseManager.updateUser(phoneDigits, { cloverActive: false });

                resultMsg = `🍀 *LUCKY CLOVER ACTIVATED!* 🍀\n\nYou were about to lose *$${currency.format(bet)}*...\nBut your *Lucky Clover* glowed and returned your bet to your wallet! ✨`;
            } else {
                resultMsg = `💥 *YOU LOST!* 💥\nBetter luck next time.`;
            }
        }

        const finalUser = await eco.getUser(sender);
        let balanceMsg = `💵 Wallet: *$${currency.format(finalUser.balance)}*`;
        if (payResult.from === "bank") balanceMsg = `🏦 Bank: *$${currency.format(finalUser.bank)}* (via Black Card)`;

        let finalFrame = `🪙 *COINFLIP* 🪙\n━━━━━━━━━━━━━━\n`;
        finalFrame += `The coin landed on: *${resultSide.toUpperCase()}* ${emoji}\n`;
        finalFrame += `━━━━━━━━━━━━━━\n`;
        finalFrame += `${resultMsg}\n\n`;
        finalFrame += balanceMsg;

        try {
            await sock.sendMessage(from, { text: finalFrame, edit: sentMsg.key });
        } catch (e) {
            await sock.sendMessage(from, { text: finalFrame }, { quoted: msg });
        }

        // 🛡️ Set Cooldown (5 minutes)
        cooldownManager.set(sender, 'coinflip', 300);

    } catch (e) {
        console.error("Coinflip Error:", e);
    }
};
