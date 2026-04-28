const eco = require('../../lib/economy');

const RED_NUMS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const BLACK_NUMS = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];
const GREEN_NUMS = [0];

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

module.exports = async (sock, msg, from, text, args) => {
    try {
        const sender = msg.key.participant || msg.key.remoteJid;
        
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

        let spinText = `🎡 *ROULETTE WHEEL* 🎡\n━━━━━━━━━━━━━━\n`;
        spinText += `Bet: *$${bet.toLocaleString()}* on *${colorBet.toUpperCase()}*\n\n`;
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
            if (resultColor === 'green') winAmount = bet * 14;
            else winAmount = bet * 2;
        }

        let resultMsg = "";
        if (winAmount > 0) {
            eco.addMoney(sender, winAmount);
            resultMsg = `🎉 *YOU WON!* 🎉\nPayout: *$${winAmount.toLocaleString()}*`;
        } else {
            resultMsg = `💥 *YOU LOST!* 💥\nBetter luck next time.`;
        }

        const newBal = eco.getUser(sender).balance;

        let finalFrame = `🎡 *ROULETTE WHEEL* 🎡\n━━━━━━━━━━━━━━\n`;
        finalFrame += `The ball landed on: *${resultNum} ${emoji} ${resultColor.toUpperCase()}*\n`;
        finalFrame += `━━━━━━━━━━━━━━\n`;
        finalFrame += `${resultMsg}\n\n`;
        finalFrame += `💵 Balance: *$${newBal.toLocaleString()}*`;

        try {
            await sock.sendMessage(from, { text: finalFrame, edit: sentMsg.key });
        } catch (e) {
            await sock.sendMessage(from, { text: finalFrame }, { quoted: msg });
        }

    } catch (e) {
        console.error("Roulette Error:", e);
    }
};
