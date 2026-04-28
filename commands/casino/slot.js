const eco = require('../../lib/economy');

const SYMBOLS = ["🍒", "🍋", "🔔", "🍉", "💎", "7️⃣"];

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function getPayout(bet, result) {
    const [r1, r2, r3] = result;
    if (r1 === r2 && r2 === r3) {
        if (r1 === "7️⃣") return bet * 10;
        if (r1 === "💎") return bet * 8;
        if (r1 === "🍒") return bet * 5;
        return bet * 3;
    }
    if (r1 === r2 || r2 === r3 || r1 === r3) {
        return Math.floor(bet * 1.5);
    }
    return 0;
}

module.exports = async (sock, msg, from, text, args) => {
    try {
        const sender = msg.key.participant || msg.key.remoteJid;
        
        if (!args[0]) {
            return await sock.sendMessage(from, { text: "⚠️ Usage: \`.slot <bet_amount>\`\nExample: \`.slot 100\`" }, { quoted: msg });
        }

        let bet = parseInt(args[0]);
        if (args[0].toLowerCase() === "all") {
            bet = eco.getUser(sender).balance;
        }

        if (isNaN(bet) || bet <= 0) {
            return await sock.sendMessage(from, { text: "❌ Invalid bet amount!" }, { quoted: msg });
        }

        const userBal = eco.getUser(sender).balance;
        if (userBal < bet) {
            return await sock.sendMessage(from, { text: `❌ You don't have enough money!\nYour balance: *$${userBal}*` }, { quoted: msg });
        }

        // Deduct bet initially
        eco.removeMoney(sender, bet);

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
            
            // Edit message (if Baileys supports it, otherwise it might fail gracefully or we just wait)
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
            eco.addMoney(sender, winAmount);
            resultMsg = `🎉 *YOU WON!* 🎉\nPayout: *$${winAmount.toLocaleString()}*`;
        } else {
            resultMsg = `💥 *YOU LOST!* 💥\nBetter luck next time.`;
        }

        const newBal = eco.getUser(sender).balance;

        let finalFrame = `🎰 *AZAR SLOTS* 🎰\n━━━━━━━━━━━━━━\n`;
        finalFrame += `[ ${final1} | ${final2} | ${final3} ]\n`;
        finalFrame += `━━━━━━━━━━━━━━\n`;
        finalFrame += `${resultMsg}\n\n`;
        finalFrame += `💵 Balance: *$${newBal.toLocaleString()}*`;

        try {
            await sock.sendMessage(from, { text: finalFrame, edit: sentMsg.key });
        } catch (e) {
            // Fallback if edit fails
            await sock.sendMessage(from, { text: finalFrame }, { quoted: msg });
        }

    } catch (e) {
        console.error("Slot Error:", e);
    }
};
