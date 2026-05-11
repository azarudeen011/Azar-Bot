/**
 * .buycard Command
 * Purchase a specific card using wallet balance
 */

const { requireRegistration } = require("../lib/guards");
const firebaseManager = require("../lib/firebaseManager");
const cards = require("../lib/cardData");

const TIER_PRICES = {
    "TX": 250000000,
    "TS": 50000000,
    "T6": 10000000,
    "T5": 2500000,
    "T4": 500000,
    "T3": 100000,
    "T2": 25000,
    "T1": 10000
};

module.exports = async function (sock, msg, from, text, args) {
    const sender = msg.key.participant || msg.key.remoteJid;
    
    // 1. Check Registration
    if (!(await requireRegistration(sock, from, sender, msg))) return;

    // 2. Validate Card ID
    const cardId = args[0]?.toLowerCase();
    if (!cardId) return sock.sendMessage(from, { text: "❌ Usage: \`.buycard <card_id>\`" });

    const card = cards.find(c => c.id.toLowerCase() === cardId);
    if (!card) return sock.sendMessage(from, { text: "❌ Card not found in database!" });

    // 3. Check Funds
    const user = await firebaseManager.fetchUser(sender);
    const price = TIER_PRICES[card.tier] || 1000000;

    if ((user.wallet || 0) < price) {
        return sock.sendMessage(from, { 
            text: `❌ Insufficient funds! You need $${price.toLocaleString()} in your wallet to buy this ${card.tier} card.` 
        });
    }

    // 4. Confirmation / Process Purchase
    const userCards = user.cards || {};
    userCards[card.id] = (userCards[card.id] || 0) + 1;

    const success = await firebaseManager.updateUser(sender, {
        wallet: (user.wallet || 0) - price,
        cards: userCards
    });

    if (success) {
        const response = `🛍️ *PURCHASE SUCCESSFUL!* 🛍️
        
🃏 *Card:* ${card.name} (${card.tier})
💰 *Paid:* $${price.toLocaleString()}
💰 *New Wallet:* $${((user.wallet || 0) - price).toLocaleString()}

✅ Card added to your collection! Sync with website complete.`;

        await sock.sendMessage(from, { text: response }, { quoted: msg });
    } else {
        await sock.sendMessage(from, { text: "❌ Transaction failed. Please try again later." });
    }
};
