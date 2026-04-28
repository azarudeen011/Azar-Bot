const eco = require('../../lib/economy');

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

module.exports = async (sock, msg, from, text, args) => {
    try {
        const sender = msg.key.participant || msg.key.remoteJid;
        
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

        let spinText = `🪙 *COINFLIP* 🪙\n━━━━━━━━━━━━━━\n`;
        spinText += `Bet: *$${bet.toLocaleString()}* on *${normalizedChoice.toUpperCase()}*\n\n`;
        spinText += `🔄 Flipping the coin...`;

        const sentMsg = await sock.sendMessage(from, { text: spinText }, { quoted: msg });

        await sleep(2000);

        const resultSide = Math.random() < 0.5 ? 'heads' : 'tails';
        const emoji = resultSide === 'heads' ? '🗣️' : '🦅';

        let winAmount = 0;
        if (resultSide === normalizedChoice) {
            winAmount = bet * 2;
            eco.addMoney(sender, winAmount);
        }

        let resultMsg = "";
        if (winAmount > 0) {
            resultMsg = `🎉 *YOU WON!* 🎉\nPayout: *$${winAmount.toLocaleString()}*`;
        } else {
            resultMsg = `💥 *YOU LOST!* 💥\nBetter luck next time.`;
        }

        const newBal = eco.getUser(sender).balance;

        let finalFrame = `🪙 *COINFLIP* 🪙\n━━━━━━━━━━━━━━\n`;
        finalFrame += `The coin landed on: *${resultSide.toUpperCase()}* ${emoji}\n`;
        finalFrame += `━━━━━━━━━━━━━━\n`;
        finalFrame += `${resultMsg}\n\n`;
        finalFrame += `💵 Balance: *$${newBal.toLocaleString()}*`;

        try {
            await sock.sendMessage(from, { text: finalFrame, edit: sentMsg.key });
        } catch (e) {
            await sock.sendMessage(from, { text: finalFrame }, { quoted: msg });
        }

    } catch (e) {
        console.error("Coinflip Error:", e);
    }
};
