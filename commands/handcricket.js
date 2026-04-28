const path = require("path");
const fs = require("fs");

const PROJECT_ROOT = process.cwd();
const SAVE_FILE = path.join(PROJECT_ROOT, "data/handcricket_games.json");

function loadGames() {
    try {
        if (fs.existsSync(SAVE_FILE)) {
            return JSON.parse(fs.readFileSync(SAVE_FILE, "utf8"));
        }
    } catch (e) {
        console.log("⚠️ Handcricket: Could not load saved games:", e.message);
    }
    return {};
}

function saveGames(games) {
    try {
        const dir = path.dirname(SAVE_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        
        // 🧹 GARBAGE COLLECTOR: Remove abandoned games older than 2 hours (7200000 ms)
        const now = Date.now();
        for (const gId in games) {
            if (now - (games[gId].lastUpdate || now) > 7200000) {
                delete games[gId];
            }
        }
        
        fs.writeFileSync(SAVE_FILE, JSON.stringify(games, null, 2));
    } catch (e) {
        console.log("⚠️ Handcricket: Could not save games:", e.message);
    }
}

if (!global.__HANDCRICKET_GAMES__) {
    global.__HANDCRICKET_GAMES__ = loadGames();
}
const games = global.__HANDCRICKET_GAMES__;

async function announce(sock, game, msgText) {
    // Send to group
    if (game.groupJid) {
        await sock.sendMessage(game.groupJid, { text: msgText, mentions: [game.p1.jid, game.p2.jid] });
    }
    // Send to P1 DM
    await sock.sendMessage(game.p1.jid, { text: `[HandCricket Match]\n\n${msgText}` });
    // Send to P2 DM if not Bot
    if (!game.p2.isBot) {
        await sock.sendMessage(game.p2.jid, { text: `[HandCricket Match]\n\n${msgText}` });
    }
}

function getBatter(game) {
    return game.p1.role === 'bat' ? game.p1 : game.p2;
}
function getBowler(game) {
    return game.p1.role === 'bowl' ? game.p1 : game.p2;
}

module.exports = async (sock, msg, from, text, args) => {
    const cmd = args[0] ? args[0].toLowerCase() : "";
    const sender = msg.key.participant || msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');

    // Help Menu
    if (!cmd) {
        return sock.sendMessage(from, {
            text: `🏏 *HAND CRICKET* 🏏\n━━━━━━━━━━━━━━\n\n` +
                  `\`.hc create\` — Create match in group\n` +
                  `\`.hc join\` — Join a match\n` +
                  `\`.hc auto\` — Play against AzahraBot!\n` +
                  `\`.hc stop\` — Stop your match\n\n` +
                  `*Gameplay Commands (Use in DM!):*\n` +
                  `\`.hc odd\` or \`.hc even\` — Pick toss\n` +
                  `\`.hc bat\` or \`.hc bowl\` — Pick after winning toss\n` +
                  `\`.hc <1-6>\` — Play a number for toss/match\n`
        }, { quoted: msg });
    }

    // Find if sender is in an active game
    let activeGameId = null;
    let activeGame = null;
    for (const [gId, g] of Object.entries(games)) {
        if (g.p1?.jid === sender || g.p2?.jid === sender || (g.creator === sender && g.status === 'waiting')) {
            activeGameId = gId;
            activeGame = g;
            g.lastUpdate = Date.now(); // Bump activity timer
            break;
        }
    }

    // CREATE
    if (cmd === "create") {
        if (!isGroup) return sock.sendMessage(from, { text: "❌ Please create games in a group!" }, { quoted: msg });
        if (activeGame) return sock.sendMessage(from, { text: "❌ You are already in a match!" }, { quoted: msg });
        if (games[from]) return sock.sendMessage(from, { text: "❌ A game is already waiting in this group! Use \`.hc join\`" }, { quoted: msg });

        games[from] = {
            groupJid: from,
            status: "waiting",
            lastUpdate: Date.now(), // Track for garbage collector
            creator: sender,
            p1: { jid: sender, name: msg.pushName || "Player 1", score: 0, role: null },
            p2: null,
            toss: { oddEvenChoice: null, oddEvenPlayer: null, p1Move: null, p2Move: null, winner: null },
            currentInnings: 1,
            target: null,
            p1Move: null,
            p2Move: null
        };
        saveGames(games);
        return sock.sendMessage(from, { text: `🏏 *HANDCRICKET LOBBY CREATED!*\n━━━━━━━━━━━━━━\nWaiting for an opponent to join...\n\n👉 Type \`.hc join\` to play against @${sender.split("@")[0]}!`, mentions: [sender] }, { quoted: msg });
    }

    // JOIN
    if (cmd === "join") {
        if (!isGroup) return sock.sendMessage(from, { text: "❌ Use this in a group to join!" }, { quoted: msg });
        if (activeGame) return sock.sendMessage(from, { text: "❌ You are already in a match!" }, { quoted: msg });
        
        const g = games[from];
        if (!g || g.status !== "waiting") return sock.sendMessage(from, { text: "❌ No waiting match in this group." }, { quoted: msg });
        if (g.p1.jid === sender) return sock.sendMessage(from, { text: "❌ You can't join your own match!" }, { quoted: msg });

        g.p2 = { jid: sender, name: msg.pushName || "Player 2", score: 0, role: null };
        g.status = "toss_pick";
        saveGames(games);

        const txt = `🏏 *HANDCRICKET MATCH STARTED!* 🏏\n━━━━━━━━━━━━━━\n` +
                    `👤 @${g.p1.jid.split("@")[0]} 🆚 @${g.p2.jid.split("@")[0]}\n━━━━━━━━━━━━━━\n\n` +
                    `🪙 @${g.p1.jid.split("@")[0]}, please choose ODD or EVEN by sending \`.hc odd\` or \`.hc even\`!`;
        return sock.sendMessage(from, { text: txt, mentions: [g.p1.jid, g.p2.jid] }, { quoted: msg });
    }

    // AUTO (Play against Bot)
    if (cmd === "auto") {
        if (!isGroup) return sock.sendMessage(from, { text: "❌ Use this in a group!" }, { quoted: msg });
        if (activeGame && activeGame.status !== "waiting") return sock.sendMessage(from, { text: "❌ You are already in a match!" }, { quoted: msg });
        
        const g = games[from];
        if (!g || g.status !== "waiting") return sock.sendMessage(from, { text: "❌ No waiting match in this group. Type `.hc create` first!" }, { quoted: msg });
        if (g.p1.jid !== sender) return sock.sendMessage(from, { text: "❌ Only the creator can start auto mode!" }, { quoted: msg });

        const botJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";
        g.p2 = { jid: botJid, name: "🤖 AzahraBot", score: 0, role: null, isBot: true };
        g.status = "toss_pick";
        saveGames(games);

        const txt = `🏏 *HANDCRICKET (AUTO MODE) STARTED!* 🏏\n━━━━━━━━━━━━━━\n` +
                    `👤 @${g.p1.jid.split("@")[0]} 🆚 🤖 Bot\n━━━━━━━━━━━━━━\n\n` +
                    `🪙 @${g.p1.jid.split("@")[0]}, please choose ODD or EVEN by sending \`.hc odd\` or \`.hc even\`!`;
        return sock.sendMessage(from, { text: txt, mentions: [g.p1.jid] }, { quoted: msg });
    }

    // STOP
    if (cmd === "stop") {
        if (!activeGame) return sock.sendMessage(from, { text: "❌ You are not in a match." }, { quoted: msg });
        delete games[activeGameId];
        saveGames(games);
        return sock.sendMessage(from, { text: "🛑 Handcricket match stopped." }, { quoted: msg });
    }

    if (!activeGame) return sock.sendMessage(from, { text: "❌ You are not in an active match! Type \`.hc create\`" }, { quoted: msg });
    const g = activeGame;
    const isP1 = g.p1.jid === sender;

    // TOSS ODD/EVEN PICK
    if (cmd === "odd" || cmd === "even") {
        if (g.status !== "toss_pick") return sock.sendMessage(from, { text: "❌ Not time for this!" }, { quoted: msg });
        if (!isP1) return sock.sendMessage(from, { text: "❌ Only Player 1 picks odd/even!" }, { quoted: msg });

        g.toss.oddEvenChoice = cmd; // "odd" or "even"
        g.toss.oddEvenPlayer = sender;
        g.status = "toss_play";
        saveGames(games);

        const p2Choice = cmd === "odd" ? "even" : "odd";
        return announce(sock, g, `🪙 *TOSS PHASE* 🪙\n━━━━━━━━━━━━━━\n` +
                                 `👤 @${g.p1.jid.split("@")[0]} gets *${cmd.toUpperCase()}*\n` +
                                 `👤 @${g.p2.jid.split("@")[0]} gets *${p2Choice.toUpperCase()}*\n━━━━━━━━━━━━━━\n\n` +
                                 `📱 Both players, DM me a number (1-6) like \`.hc 4\``);
    }

    // BAT/BOWL PICK
    if (cmd === "bat" || cmd === "bowl") {
        if (g.status !== "bat_bowl_pick") return sock.sendMessage(from, { text: "❌ Not time for this!" }, { quoted: msg });
        if (g.toss.winner !== sender) return sock.sendMessage(from, { text: "❌ You didn't win the toss!" }, { quoted: msg });

        const winnerP = isP1 ? g.p1 : g.p2;
        const loserP = isP1 ? g.p2 : g.p1;

        winnerP.role = cmd; // 'bat' or 'bowl'
        loserP.role = cmd === 'bat' ? 'bowl' : 'bat';
        
        g.status = "playing";
        saveGames(games);

        const batter = getBatter(g);
        const bowler = getBowler(g);

        return announce(sock, g, `🏏 Toss winner @${winnerP.jid.split("@")[0]} chose to *${cmd.toUpperCase()}*!\n\n` +
                                 `🔥 *INNINGS 1 STARTS* 🔥\n━━━━━━━━━━━━━━\n` + 
                                 `🏏 Batter: @${batter.jid.split("@")[0]}\n🥎 Bowler: @${bowler.jid.split("@")[0]}\n━━━━━━━━━━━━━━\n\n` +
                                 `📱 Both players, DM me your numbers \`.hc <1-6>\``);
    }

    // NUMBER PLAY (1-6)
    const num = parseInt(cmd);
    if (!isNaN(num) && num >= 1 && num <= 6) {
        if (isGroup) {
            return sock.sendMessage(from, { text: "🤫 *Shhh!* You must send your numbers (\`.hc <1-6>\`) to me in a *Private Message (DM)* so your opponent can't see it!" }, { quoted: msg });
        }

        if (g.status === "toss_play") {
            if (isP1) g.toss.p1Move = num;
            else g.toss.p2Move = num;

            // Auto Mode Bot Move
            if (g.p2.isBot && isP1) {
                g.toss.p2Move = Math.floor(Math.random() * 6) + 1;
            }

            sock.sendMessage(from, { text: `✅ Recorded ${num} for toss!` }, { quoted: msg });

            if (g.toss.p1Move !== null && g.toss.p2Move !== null) {
                const sum = g.toss.p1Move + g.toss.p2Move;
                const isSumEven = sum % 2 === 0;
                const result = isSumEven ? "even" : "odd";
                
                let winnerJid = null;
                if (g.toss.oddEvenChoice === result) winnerJid = g.toss.oddEvenPlayer;
                else winnerJid = (g.p1.jid === g.toss.oddEvenPlayer) ? g.p2.jid : g.p1.jid;

                g.toss.winner = winnerJid;
                g.status = "bat_bowl_pick";
                saveGames(games);

                // If bot wins toss, randomly select bat or bowl automatically
                if (g.p2.isBot && winnerJid === g.p2.jid) {
                    const botChoice = Math.random() > 0.5 ? 'bat' : 'bowl';
                    g.p2.role = botChoice;
                    g.p1.role = botChoice === 'bat' ? 'bowl' : 'bat';
                    g.status = "playing";
                    saveGames(games);
                    
                    const batter = getBatter(g);
                    const bowler = getBowler(g);

                    return announce(sock, g, `🪙 *TOSS RESULT* 🪙\n━━━━━━━━━━━━━━\n` +
                                             `👤 @${g.p1.jid.split("@")[0]} -> *[ ${g.toss.p1Move} ]*\n` +
                                             `🤖 Bot -> *[ ${g.toss.p2Move} ]*\n━━━━━━━━━━━━━━\n` +
                                             `🔢 Sum: *${sum}* (${result.toUpperCase()})\n` +
                                             `🏆 *WINNER:* 🤖 Bot\n\n🤖 Bot chose to *${botChoice.toUpperCase()}*!\n\n` +
                                             `🔥 *INNINGS 1 STARTS* 🔥\n━━━━━━━━━━━━━━\n` + 
                                             `🏏 Batter: @${batter.jid.split("@")[0].replace("s.whatsapp.net", "Bot")}\n🥎 Bowler: @${bowler.jid.split("@")[0].replace("s.whatsapp.net", "Bot")}\n━━━━━━━━━━━━━━\n\n` +
                                             `📱 Send your number \`.hc <1-6>\` in DM!`);
                }

                // If human wins or it's a multiplayer match
                return announce(sock, g, `🪙 *TOSS RESULT* 🪙\n━━━━━━━━━━━━━━\n` +
                                         `👤 @${g.p1.jid.split("@")[0]} -> *[ ${g.toss.p1Move} ]*\n` +
                                         `${g.p2.isBot ? "🤖 Bot" : `👤 @${g.p2.jid.split("@")[0]}`} -> *[ ${g.toss.p2Move} ]*\n` +
                                         `━━━━━━━━━━━━━━\n` +
                                         `🔢 Sum: *${sum}* (${result.toUpperCase()})\n` +
                                         `🏆 *WINNER:* ${winnerJid === g.p2.jid && g.p2.isBot ? "🤖 Bot" : `@${winnerJid.split("@")[0]}`}\n\n` +
                                         `👉 Winner, please choose: \`.hc bat\` or \`.hc bowl\``);
            }
            return;
        }

        if (g.status === "playing") {
            if (isP1) g.p1Move = num;
            else g.p2Move = num;

            // Auto Mode Bot Move
            if (g.p2.isBot && isP1) {
                g.p2Move = Math.floor(Math.random() * 6) + 1;
            }

            sock.sendMessage(from, { text: `✅ Recorded ${num}!` }, { quoted: msg });

            if (g.p1Move !== null && g.p2Move !== null) {
                const batter = getBatter(g);
                const bowler = getBowler(g);
                const batMove = batter.jid === g.p1.jid ? g.p1Move : g.p2Move;
                const bowlMove = bowler.jid === g.p1.jid ? g.p1Move : g.p2Move;

                g.p1Move = null;
                g.p2Move = null;

                const batterName = batter.isBot ? "🤖 Bot" : `@${batter.jid.split("@")[0]}`;
                const bowlerName = bowler.isBot ? "🤖 Bot" : `@${bowler.jid.split("@")[0]}`;

                if (batMove === bowlMove) {
                    // OUT!
                    let outMsg = `💥 *WICKET! HE IS OUT!* 💥\n━━━━━━━━━━━━━━\n` +
                                 `🏏 Batter ${batterName} -> *[ ${batMove} ]*\n` +
                                 `🥎 Bowler ${bowlerName} -> *[ ${bowlMove} ]*\n` +
                                 `━━━━━━━━━━━━━━\n` +
                                 `📊 *FINAL SCORE: ${batter.score}*\n`;
                    
                    if (g.currentInnings === 1) {
                        g.target = batter.score + 1;
                        g.currentInnings = 2;
                        batter.role = 'bowl';
                        bowler.role = 'bat';
                        saveGames(games);

                        outMsg += `\n🔄 *INNINGS 2 STARTS*\n` +
                                  `🎯 Target: *${g.target}* runs to win\n\n` +
                                  `🏏 New Batter: ${bowlerName}\n` +
                                  `🥎 New Bowler: ${batterName}\n\n` +
                                  `📱 Send \`.hc <1-6>\` in DM!`;
                        return announce(sock, g, outMsg);
                    } else {
                        // Match Over
                        let finalMsg = outMsg + `\n🎯 Target was: *${g.target}*\n━━━━━━━━━━━━━━\n`;
                        if (batter.score >= g.target) {
                            finalMsg += `🏆 *WINNER:* ${batterName} chased it down!`;
                        } else if (batter.score === g.target - 1) {
                            finalMsg += `🤝 *MATCH TIED!* Incredible finish!`;
                        } else {
                            finalMsg += `🏆 *WINNER:* ${bowlerName} wins by ${g.target - batter.score - 1} runs!`;
                        }
                        
                        delete games[activeGameId];
                        saveGames(games);
                        return announce(sock, g, finalMsg);
                    }
                } else {
                    // Run Scored
                    batter.score += batMove;
                    
                    const comments = {
                        6: "🚀 SIXER! Out of the park!",
                        5: "🏃‍♂️ QUICK FIVE! Amazing running!",
                        4: "☄️ FOUR! Pierced the gap!",
                        3: "🏏 THREE RUNS! Great placement!",
                        2: "✌️ TWO RUNS! Pushing hard!",
                        1: "☝️ SINGLE! Rotating the strike!"
                    };
                    
                    let runMsg = `🔥 *${comments[batMove] || "GOOD SHOT!"}* 🔥\n━━━━━━━━━━━━━━\n` +
                                 `🏏 ${batterName} hits *[ ${batMove} ]*\n` +
                                 `🥎 (Bowler sent [ ${bowlMove} ])\n` +
                                 `━━━━━━━━━━━━━━\n` +
                                 `📈 *CURRENT SCORE: ${batter.score}*\n`;

                    if (g.currentInnings === 2) {
                        runMsg += `🎯 Target: *${g.target}* (${g.target - batter.score} runs needed)\n`;
                        if (batter.score >= g.target) {
                            runMsg += `━━━━━━━━━━━━━━\n🏆 *GAME OVER!* ${batterName} WINS by chasing the target!`;
                            delete games[activeGameId];
                            saveGames(games);
                            return announce(sock, g, runMsg);
                        }
                    } else {
                        runMsg += `\n📱 Next ball! Send \`.hc <1-6>\` in DM!`;
                    }
                    
                    saveGames(games);
                    return announce(sock, g, runMsg);
                }
            }
            return;
        }

        return sock.sendMessage(from, { text: "❌ Not time to send numbers!" }, { quoted: msg });
    }

    return sock.sendMessage(from, { text: "❌ Invalid HandCricket command! Type \`.hc\` for help." }, { quoted: msg });
};
