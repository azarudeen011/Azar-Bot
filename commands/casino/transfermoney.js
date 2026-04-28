const eco = require('../../lib/economy');

module.exports = async (sock, msg, from, text, args) => {
    try {
        const sender = msg.key.participant || msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');

        // Must be in a group
        if (!isGroup) {
            return sock.sendMessage(from, {
                text: "❌ This command can only be used in groups!"
            }, { quoted: msg });
        }

        // Get mentioned user
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const target = mentioned[0];

        if (!target) {
            return sock.sendMessage(from, {
                text: `💸 *TRANSFER MONEY*\n━━━━━━━━━━━━━━\n\n` +
                      `*Usage:* \`.transfermoney @user <amount>\`\n\n` +
                      `*Examples:*\n` +
                      `• \`.transfermoney @user 500\` — Send $500\n` +
                      `• \`.transfermoney @user all\` — Send everything\n\n` +
                      `💡 Mention someone and specify the amount!`
            }, { quoted: msg });
        }

        // Can't transfer to yourself
        if (target === sender) {
            return sock.sendMessage(from, {
                text: "❌ You can't transfer money to yourself!"
            }, { quoted: msg });
        }

        // Parse amount from args (skip the @mention part)
        let amountArg = null;
        for (const arg of args) {
            if (arg.startsWith("@")) continue;
            if (arg.toLowerCase() === "all" || !isNaN(parseInt(arg))) {
                amountArg = arg.toLowerCase();
                break;
            }
        }

        if (!amountArg) {
            return sock.sendMessage(from, {
                text: "❌ Please specify an amount!\n\n*Usage:* `.transfermoney @user 500` or `.transfermoney @user all`"
            }, { quoted: msg });
        }

        const senderData = eco.getUser(sender);
        let amount;

        if (amountArg === "all") {
            amount = senderData.balance;
        } else {
            amount = parseInt(amountArg);
        }

        // Validation
        if (isNaN(amount) || amount <= 0) {
            return sock.sendMessage(from, {
                text: "❌ Please enter a valid amount greater than $0!"
            }, { quoted: msg });
        }

        if (amount < 10) {
            return sock.sendMessage(from, {
                text: "❌ Minimum transfer amount is *$10*!"
            }, { quoted: msg });
        }

        if (senderData.balance < amount) {
            return sock.sendMessage(from, {
                text: `❌ Insufficient funds!\n\n💰 Your balance: *$${senderData.balance.toLocaleString()}*\n💸 Trying to send: *$${amount.toLocaleString()}*`
            }, { quoted: msg });
        }

        // Process the transfer
        // Remove from sender (use removeMoney but don't track as "loss")
        const db = require('fs');
        const path = require('path');
        const DB_PATH = path.join(__dirname, '../../data/economy.json');
        
        let data = {};
        try { data = JSON.parse(db.readFileSync(DB_PATH, 'utf8')); } catch {}
        
        // Ensure both users exist
        if (!data[sender]) data[sender] = { balance: 5000, lastDaily: 0, totalWon: 0, totalLost: 0 };
        if (!data[target]) data[target] = { balance: 5000, lastDaily: 0, totalWon: 0, totalLost: 0 };
        
        // Transfer (doesn't count as win/loss — it's a gift)
        data[sender].balance -= amount;
        data[target].balance += amount;
        
        db.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

        const senderName = `@${sender.split("@")[0]}`;
        const targetName = `@${target.split("@")[0]}`;

        const receipt = `💸 *MONEY TRANSFER SUCCESSFUL!* 💸\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `👤 *From:* ${senderName}\n` +
                        `👤 *To:* ${targetName}\n` +
                        `💰 *Amount:* $${amount.toLocaleString()}\n\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `📊 *Updated Balances:*\n` +
                        `• ${senderName}: *$${data[sender].balance.toLocaleString()}*\n` +
                        `• ${targetName}: *$${data[target].balance.toLocaleString()}*\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━`;

        // React with money emoji
        await sock.sendMessage(from, {
            react: { text: "💸", key: msg.key }
        }).catch(() => {});

        await sock.sendMessage(from, {
            text: receipt,
            mentions: [sender, target]
        }, { quoted: msg });

    } catch (e) {
        console.error("Transfer Error:", e);
        await sock.sendMessage(from, {
            text: "❌ Transfer failed: " + e.message
        }, { quoted: msg });
    }
};
