const eco = require('../../lib/economy');
const firebaseManager = require('../../lib/firebaseManager');
const cooldownManager = require('../../lib/cooldownManager');
const { requireRegistration } = require('../../lib/guards');

// Memory storage for active games
const activeGames = new Map();

/**
 * Mines Multiplier Formula (Standard Casino Logic)
 */
function getMultiplier(mines, gemsFound) {
    if (gemsFound === 0) return 0;
    let mult = 0.97; // House edge (3%)
    
    // Multiplier Calculation: (25! / (25-n)!) / ((25-m)! / (25-m-n)!)
    const n = gemsFound;
    const m = mines;
    
    let waysToWin = 1;
    let waysToLose = 1;
    
    for (let i = 0; i < n; i++) {
        waysToWin *= (25 - m - i);
        waysToLose *= (25 - i);
    }
    
    mult = mult * (waysToLose / waysToWin);
    return mult;
}

function generateGrid(minesCount) {
    const grid = new Array(25).fill('gem');
    let placedMines = 0;
    while (placedMines < minesCount) {
        const rand = Math.floor(Math.random() * 25);
        if (grid[rand] === 'gem') {
            grid[rand] = 'mine';
            placedMines++;
        }
    }
    return grid;
}

function renderGrid(revealed, grid, gameOver = false) {
    let text = "";
    const nums = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟","⑪","⑫","⑬","⑭","⑮","⑯","⑰","⑱","⑲","⑳","㉑","㉒","㉓","㉔","㉕"];
    for (let i = 0; i < 25; i++) {
        if (revealed.has(i)) {
            text += grid[i] === 'mine' ? "💥 " : "💎 ";
        } else {
            if (gameOver) {
                text += grid[i] === 'mine' ? "💣 " : "⬛ ";
            } else {
                text += "⬛ ";
            }
        }
        if ((i + 1) % 5 === 0) text += "\n";
    }
    return text;
}

function createProgressBar(current, total) {
    const size = 10;
    const progress = Math.round((current / total) * size);
    const empty = size - progress;
    return "🟩".repeat(progress) + "⬜".repeat(empty);
}

module.exports = async (sock, msg, from, text, args) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    
    // Check Registration
    const isReg = await requireRegistration(sock, from, sender, msg);
    if (!isReg) return;

    // 1. Check if user is already in a game
    const game = activeGames.get(sender);

    // 2. Handle Game Interaction (Digging or Cashout)
    if (game) {
        const input = args[0]?.toLowerCase() || text.toLowerCase();
        
        // Handle Cashout
        if (input === 'cashout' || input === 'stop') {
            if (game.gemsFound === 0) {
                return await sock.sendMessage(from, { text: "❌ You need to find at least one gem to cash out!" }, { quoted: msg });
            }

            const currency = new Intl.NumberFormat('en-US');
            const finalMult = getMultiplier(game.minesCount, game.gemsFound);
            const winAmount = Math.floor(game.bet * finalMult);
            
            await eco.addMoney(sender, winAmount);
            await firebaseManager.logTx(sender, { type: "casino", amount: winAmount, note: "Mines Cashout" });
            
            activeGames.delete(sender);
            const gridText = renderGrid(game.revealed, game.grid, true);

            let cashoutFrame = `💰 *MINES: CASHOUT* 💰\n━━━━━━━━━━━━━━\n`;
            cashoutFrame += gridText;
            cashoutFrame += `━━━━━━━━━━━━━━\n`;
            cashoutFrame += `🎉 *VICTORY!*\n`;
            cashoutFrame += `📈 Multiplier: *${finalMult.toFixed(2)}x*\n`;
            cashoutFrame += `Payout: *$${currency.format(winAmount)}*\n\n`;
            cashoutFrame += `_Your winnings have been added to your wallet._`;

            return await sock.sendMessage(from, { text: cashoutFrame, edit: game.msgKey });
        }

        // Handle Digging
        const cellIndex = parseInt(input) - 1;
        if (!isNaN(cellIndex) && cellIndex >= 0 && cellIndex < 25) {
            if (game.revealed.has(cellIndex)) return; // Ignore already revealed

            // Clear inactivity timer
            if (game.timer) clearTimeout(game.timer);

            // Check if it's a mine
            if (game.grid[cellIndex] === 'mine') {
                const currency = new Intl.NumberFormat('en-US');
                game.revealed.add(cellIndex);
                activeGames.delete(sender);
                const gridText = renderGrid(game.revealed, game.grid, true);
                
                let lossFrame = `💣 *MINES: EXPLODED* 💣\n━━━━━━━━━━━━━━\n`;
                lossFrame += gridText;
                lossFrame += `━━━━━━━━━━━━━━\n`;
                lossFrame += `💥 *BOOM!* You hit a mine at square ${cellIndex + 1}.\n`;
                lossFrame += `Loss: *$${currency.format(game.bet)}*`;
                
                return await sock.sendMessage(from, { text: lossFrame, edit: game.msgKey });
            } else {
                // GEM FOUND
                const currency = new Intl.NumberFormat('en-US');
                game.revealed.add(cellIndex);
                game.gemsFound++;
                
                const currentMult = getMultiplier(game.minesCount, game.gemsFound);
                const currentProfit = Math.floor(game.bet * currentMult);
                
                const gridText = renderGrid(game.revealed, game.grid);
                const progress = createProgressBar(game.gemsFound, 25 - game.minesCount);

                let winFrame = `💣 *MINES GAME* 💣\n━━━━━━━━━━━━━━\n`;
                winFrame += gridText;
                winFrame += `━━━━━━━━━━━━━━\n`;
                winFrame += `💎 *Gems:* ${game.gemsFound}/${25 - game.minesCount}\n`;
                winFrame += `📊 *Progress:* ${progress}\n`;
                winFrame += `📈 *Multiplier:* ${currentMult.toFixed(2)}x\n`;
                winFrame += `💰 *Value:* $${currency.format(currentProfit)}\n\n`;
                winFrame += `👉 Type \`.mines <1-25>\` to dig.\n`;
                winFrame += `👉 Type \`.mines cashout\` to win!`;

                await sock.sendMessage(from, { text: winFrame, edit: game.msgKey });
                
                // Reset inactivity timer (5 mins)
                game.timer = setTimeout(() => {
                    activeGames.delete(sender);
                }, 300000);
                
                return;
            }
        }
    }

    // 3. Start New Game
    if (!args[0] || isNaN(parseInt(args[0]))) {
        return await sock.sendMessage(from, {
            text: `💣 *MINES CASINO* 💣\n━━━━━━━━━━━━━━\n` +
                `Find gems to multiply your coins, but avoid the hidden mines!\n\n` +
                `*Usage:* \`.mines <bet> [mines_count]\`\n` +
                `*Example:* \`.mines 5000 3\`\n\n` +
                `_You can choose between 1 to 24 mines._`
        }, { quoted: msg });
    }

    // Starting logic
    let bet = parseInt(args[0]);
    if (args[0].toLowerCase() === "all") {
        const user = await eco.getUser(sender);
        bet = user.balance;
    }

    if (isNaN(bet) || bet <= 0) return await sock.sendMessage(from, { text: "❌ Invalid bet amount!" }, { quoted: msg });
    if (bet < 100) return await sock.sendMessage(from, { text: "❌ Minimum bet is $100!" }, { quoted: msg });

    const minesCount = Math.min(24, Math.max(1, parseInt(args[1]) || 3));

    // Check Cooldown
    const cd = cooldownManager.check(sender, 'mines');
    if (cd.onCooldown) {
        return await sock.sendMessage(from, {
            text: `⏳ *MINES COOLDOWN* ⏳\nWait *${cooldownManager.formatTime(cd.remaining)}* before starting a new game.`
        }, { quoted: msg });
    }

    // Spend Money
    const currency = new Intl.NumberFormat('en-US');
    const payResult = await eco.spend(sender, bet);
    if (!payResult.success) {
        return await sock.sendMessage(from, { text: `❌ You don't have enough money! (Wallet: $${currency.format(payResult.currentWallet || 0)})` }, { quoted: msg });
    }

    await firebaseManager.logTx(sender, { type: "casino", amount: -bet, note: "Mines Start" });

    // Initialize Game
    const grid = generateGrid(minesCount);
    const revealed = new Set();
    
    let startFrame = `💣 *MINES GAME* 💣\n━━━━━━━━━━━━━━\n`;
    startFrame += renderGrid(revealed, grid);
    startFrame += `━━━━━━━━━━━━━━\n`;
    startFrame += `Bet: *$${currency.format(bet)}*\n`;
    startFrame += `Mines: *${minesCount}*\n\n`;
    startFrame += `👉 Type \`.mines <1-25>\` to start digging!`;

    const sent = await sock.sendMessage(from, { text: startFrame }, { quoted: msg });

    activeGames.set(sender, {
        bet,
        minesCount,
        grid,
        revealed,
        gemsFound: 0,
        msgKey: sent.key,
        timer: setTimeout(() => activeGames.delete(sender), 300000)
    });

    cooldownManager.set(sender, 'mines', 30);
};
