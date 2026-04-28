module.exports = async (sock, msg, from) => {
    const text = `
🎰 *WELCOME TO THE AZAR CASINO!* 🎰
━━━━━━━━━━━━━━━━━━━━━━
Are you ready to risk it all and become a billionaire? Or will you go totally bankrupt? 🤑 
Here is your ultimate guide to playing the most highly-addictive games in this bot!

💰 *1. THE BANK (Economy)*
Before you can play, you need cash!
*👉 \`.daily\`* — Claim your free $1,000 to $3,000 every 12 hours. Don't forget this!
*👉 \`.balance\`* — Flex your wallet! Check your current balance, total wins, and total losses.

*(For all games below, you can bet a specific amount like \`500\`, or type \`all\` to go ALL-IN!)*

🍒 *2. SLOT MACHINE (The Classic!)*
*👉 \`.slot <bet>\`* (Example: \`.slot 1000\`)
Watch the reels spin live! If they match, you win BIG!
🔥 *Jackpot:* 7️⃣7️⃣7️⃣ pays *10x* your bet!
💎 *Diamonds:* 💎💎💎 pays *8x*
🍒 *Cherries:* 🍒🍒🍒 pays *5x*
*(Even 2 matching symbols gives you 1.5x your money back!)*

🎡 *3. ROULETTE (The Big Wheel!)*
*👉 \`.roulette <color> <bet>\`* (Example: \`.roulette red 500\`)
Predict where the spinning ball will land!
🔴 *Red* or ⚫ *Black* — Safe bet. Doubles your money (2x).
🟢 *Green* — The ultimate risk! Only 1 number is green. If it hits, you win *14x* your bet!! 

🪙 *4. COINFLIP (50/50 Chance!)*
*👉 \`.coinflip <heads/tails> <bet>\`* (Example: \`.coinflip tails all\`)
No complex math. No strategies. Just pure 50/50 luck.
Guess right? You instantly double your cash (2x). Guess wrong? You lose it all.

🚀 *5. CRASH (The Crypto Game!)*
*👉 \`.crash <target_multiplier> <bet>\`* (Example: \`.crash 2.5 500\`)
A rocket 🚀 takes off and the multiplier climbs (*1.5x, 1.8x, 2.3x...*).
You must guess a safe target to cash out at before it explodes 💥!
*If you guess 2.5x:*
✅ The rocket reaches 2.6x... YOU WIN! You get exactly 2.5x your bet!
❌ The rocket blows up at 1.4x... YOU LOSE!

*💡 PRO TIP:* The bot actually animates the games in real-time by editing its messages! Play in a group for maximum hype!

💸 *6. TRANSFER MONEY*
*👉 \`.transfermoney @user <amount>\`* (Example: \`.transfermoney @user 500\`)
Send your hard-earned (or gambled!) cash to a friend. Use \`all\` to send everything!
*(Only works in groups — mention the person you want to pay!)*
`.trim();

    await sock.sendMessage(from, { text }, { quoted: msg });
};
