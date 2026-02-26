// ==============================================
// 🎮 WCG — Word Chain Game (FINAL FIXED VERSION)
// Features:
// ✅ Winner announcement when only one player remains
// ✅ Proper mentions in status and leaderboard
// ✅ Player elimination on timeout
// ✅ Game ends when only one player left
// ==============================================

const { isDictionaryWord } = require("../lib/dictionary");
const wcgStore = require("../lib/wcgStore");

// -----------------------------
// In-memory game state (per chat)
// -----------------------------
if (!global.__WCG__) global.__WCG__ = {};
const GAMES = global.__WCG__;

// -----------------------------
// Helpers
// -----------------------------
const now = () => Date.now();
const numFromJid = (jid) => jid?.replace(/\D/g, "") || "";

// Clean number from mention or JID
function cleanNumber(input) {
  if (!input) return "";
  return input.toString().replace(/[^0-9]/g, "");
}

// Format time remaining
function formatTime(seconds) {
  if (seconds <= 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

// Get mention string for a player
function getMention(jid) {
  return `@${jid.split('@')[0]}`;
}

// Generate random 3-letter word from common words
function getRandomStartWord() {
  const starters = [
    "cat", "dog", "sun", "moon", "star", "fish", "bird", "tree", 
    "book", "pen", "car", "bus", "red", "blue", "big", "small",
    "hot", "cold", "new", "old", "good", "bad", "happy", "sad",
    "run", "walk", "talk", "eat", "drink", "sleep", "play", "work"
  ];
  return starters[Math.floor(Math.random() * starters.length)];
}

// Check if word meets current level length requirement
function isValidLength(word, level) {
  const requiredLength = 3 + Math.floor((level - 1) / 2);
  return word.length === requiredLength;
}

// Check if game should end (only one player left) and announce winner
function checkForWinner(sock, from, game) {
  if (!game.active) return false;

  const playerCount = Object.keys(game.players).length;

  if (playerCount === 1) {
    // Only one player left - they are the winner!
    const winnerJid = Object.keys(game.players)[0];
    const winner = game.players[winnerJid];

    // End the game
    game.active = false;
    if (game.turnTimeout) clearTimeout(game.turnTimeout);

    // Announce winner
    sock.sendMessage(from, {
      text: `🏆 *GAME OVER - WINNER!* 🏆\n\n` +
            `🎉 Congratulations ${getMention(winnerJid)}!\n` +
            `📊 Final Score: ${winner.score} points\n` +
            `📈 Level reached: ${game.level}\n\n` +
            `_Game ended - all other players left or were eliminated_`,
      mentions: [winnerJid]
    });
    return true;
  }

  return false;
}

// -----------------------------
// Main Command
// -----------------------------
module.exports = async function (sock, msg, from, text, args) {
  const senderJid = msg.key.participant || msg.key.remoteJid;
  const senderNumber = senderJid.split("@")[0];
  const senderName = msg.pushName || `Player`;
  const isGroup = from.endsWith("@g.us");

  // Initialize game for this chat if not exists
  if (!GAMES[from]) {
    GAMES[from] = {
      active: false,
      players: {},          // jid -> { score, name, number }
      usedWords: new Set(),
      currentWord: null,
      level: 1,
      timeLimit: 60,        // seconds per turn
      joinTimeLimit: 120,   // seconds to join before game starts
      lastMoveAt: 0,
      startedAt: 0,
      currentPlayer: null,  // whose turn it is
      turnOrder: [],        // array of player jids
      turnIndex: 0,
      starter: null,        // who started the game
      gameStartTimeout: null,
      turnTimeout: null,
    };
  }

  const game = GAMES[from];
  const cmd = args[0]?.toLowerCase();

  // =================================================
  // HELP / NO COMMAND
  // =================================================
  if (!cmd || cmd === "help") {
    const requiredLength = game.active ? 3 + Math.floor((game.level - 1) / 2) : 3;
    const helpText = `🎮 *WORD CHAIN GAME (WCG)* 🎮

*Commands:*
┌─────────────────────────┐
│ .wcg start    - Start new game │
│ .wcg join     - Join the game   │
│ .wcg leave    - Leave the game  │
│ .wcg status   - Game status     │
│ .wcg end      - End game (owner)│
│ .wcg [word]   - Play a word     │
│ .wcg leaderboard - Top players  │
└─────────────────────────┘

*Rules:*
• Words must be real English dictionary words
• Current level: ${game.active ? game.level : 1} → ${requiredLength} letters required
• Each word must start with last letter of previous word
• Longer words = more points
• Higher levels = faster time limits

*Points:* Word length + Level
Example: "cat" (3 letters) at level 1 = 4 points

${isGroup ? "📱 *Group Mode:* Anyone can join" : "💬 *DM Mode:* 1-on-1 with bot"}`;

    return sock.sendMessage(from, { text: helpText }, { quoted: msg });
  }

  // =================================================
  // START GAME
  // =================================================
  if (cmd === "start") {
    if (game.active) {
      return sock.sendMessage(from, { 
        text: "⚠️ A game is already running in this chat.\nUse `.wcg end` to stop it first." 
      }, { quoted: msg });
    }

    // Clear any existing timeouts
    if (game.gameStartTimeout) clearTimeout(game.gameStartTimeout);
    if (game.turnTimeout) clearTimeout(game.turnTimeout);

    // Reset game
    game.active = true;
    game.players = {};
    game.usedWords = new Set();
    game.currentWord = null;
    game.level = 1;
    game.timeLimit = 60;
    game.joinTimeLimit = 120;
    game.lastMoveAt = now();
    game.startedAt = now();
    game.currentPlayer = null;
    game.turnOrder = [];
    game.turnIndex = 0;
    game.starter = senderJid;

    // Auto-add the starter
    game.players[senderJid] = { 
      score: 0,
      name: senderName,
      number: senderNumber
    };

    // Set join timeout
    game.gameStartTimeout = setTimeout(() => {
      if (game.active) {
        // Check if we have at least the starter
        if (Object.keys(game.players).length >= 1) {
          // Start the game
          startGame(sock, from, game);
        } else {
          game.active = false;
          sock.sendMessage(from, { 
            text: "❌ *Game Cancelled*\nNo one joined within 120 seconds." 
          });
        }
      }
    }, game.joinTimeLimit * 1000);

    const joinTimeLeft = formatTime(game.joinTimeLimit);

    return sock.sendMessage(from, { 
      text: `🎮 *Word Chain Game Started by ${getMention(senderJid)}!*\n\n` +
            `• Type \`.wcg join\` to participate\n` +
            `• Join window: ${joinTimeLeft}\n` +
            `• Game will start automatically when players join\n` +
            `• You are automatically in the game as starter`,
      mentions: [senderJid]
    }, { quoted: msg });
  }

  // =================================================
  // JOIN
  // =================================================
  if (cmd === "join") {
    if (!game.active) {
      return sock.sendMessage(from, { 
        text: "❌ No active game. Start one with `.wcg start`" 
      }, { quoted: msg });
    }

    // Check if join window still open
    if (game.turnOrder.length > 0 || game.currentWord !== null) {
      return sock.sendMessage(from, { 
        text: "❌ Game has already started. Wait for next round or new game." 
      }, { quoted: msg });
    }

    if (game.players[senderJid]) {
      return sock.sendMessage(from, { 
        text: `✅ You're already in the game!` 
      }, { quoted: msg });
    }

    // Add player
    game.players[senderJid] = { 
      score: 0,
      name: senderName,
      number: senderNumber
    };

    const playerCount = Object.keys(game.players).length;
    const joinTimeLeft = Math.max(0, Math.floor(
      (game.startedAt + game.joinTimeLimit * 1000 - now()) / 1000
    ));

    return sock.sendMessage(from, { 
      text: `✅ *${getMention(senderJid)}* joined the game!\n` +
            `Players: ${playerCount}\n` +
            `⏳ Join window: ${formatTime(joinTimeLeft)}`,
      mentions: [senderJid]
    }, { quoted: msg });
  }

  // =================================================
  // START GAME FUNCTION (called when join window ends)
  // =================================================
  function startGame(sock, from, game) {
    if (!game.active || game.turnOrder.length > 0) return;

    game.turnOrder = Object.keys(game.players);
    game.turnIndex = 0;
    game.currentPlayer = game.turnOrder[0];

    // Bot gives initial word
    const startWord = getRandomStartWord();
    game.currentWord = startWord;
    game.usedWords.add(startWord);
    game.lastMoveAt = now();

    // Clear join timeout
    if (game.gameStartTimeout) {
      clearTimeout(game.gameStartTimeout);
      game.gameStartTimeout = null;
    }

    // Set turn timeout
    setTurnTimeout(sock, from, game);

    // Send start message with initial word
    let playersList = game.turnOrder.map(jid => getMention(jid)).join(", ");
    sock.sendMessage(from, { 
      text: `🎮 *GAME STARTED!*\n\n` +
            `Players: ${playersList}\n\n` +
            `🔤 *Initial word:* "${startWord}"\n` +
            `📏 Level ${game.level}: 3-letter words required\n` +
            `🎯 Next turn: ${getMention(game.currentPlayer)}\n` +
            `⏳ Time limit: ${game.timeLimit}s`,
      mentions: game.turnOrder
    });
  }

  // =================================================
  // SET TURN TIMEOUT
  // =================================================
  function setTurnTimeout(sock, from, game) {
    if (game.turnTimeout) clearTimeout(game.turnTimeout);

    game.turnTimeout = setTimeout(() => {
      if (!game.active) return;

      const currentPlayer = game.currentPlayer;

      // Remove current player from game (eliminated)
      game.turnOrder = game.turnOrder.filter(jid => jid !== currentPlayer);
      delete game.players[currentPlayer];

      // Check if game should end (winner)
      if (checkForWinner(sock, from, game)) {
        return;
      }

      if (game.turnOrder.length === 0) {
        // No players left
        game.active = false;
        return sock.sendMessage(from, { 
          text: "⏰ *GAME OVER*\nNo players remaining." 
        });
      }

      // Move to next player
      game.turnIndex = game.turnIndex % game.turnOrder.length;
      game.currentPlayer = game.turnOrder[game.turnIndex];
      game.lastMoveAt = now();

      // Set new timeout
      setTurnTimeout(sock, from, game);

      sock.sendMessage(from, { 
        text: `⏰ ${getMention(currentPlayer)} timed out and was *ELIMINATED*!\n` +
              `New turn: ${getMention(game.currentPlayer)} (${game.timeLimit}s)`,
        mentions: [currentPlayer, game.currentPlayer]
      });
    }, game.timeLimit * 1000);
  }

  // =================================================
  // LEAVE
  // =================================================
  if (cmd === "leave") {
    if (!game.active) {
      return sock.sendMessage(from, { text: "❌ No active game." }, { quoted: msg });
    }

    if (!game.players[senderJid]) {
      return sock.sendMessage(from, { text: "❌ You're not in the game." }, { quoted: msg });
    }

    // Remove player
    delete game.players[senderJid];

    // Update turn order if game started
    if (game.turnOrder.length > 0) {
      game.turnOrder = game.turnOrder.filter(jid => jid !== senderJid);

      // Check if game should end (winner)
      if (checkForWinner(sock, from, game)) {
        return;
      }

      // Adjust if current player left
      if (game.currentPlayer === senderJid) {
        if (game.turnOrder.length > 0) {
          game.turnIndex = game.turnIndex % game.turnOrder.length;
          game.currentPlayer = game.turnOrder[game.turnIndex];
          game.lastMoveAt = now();

          // Reset timeout for new player
          if (game.turnTimeout) {
            clearTimeout(game.turnTimeout);
            setTurnTimeout(sock, from, game);
          }
        } else {
          // No players left
          game.active = false;
          if (game.turnTimeout) clearTimeout(game.turnTimeout);
          return sock.sendMessage(from, { 
            text: "🏁 Game ended. No players remaining." 
          }, { quoted: msg });
        }
      } else {
        // Adjust index if player before current left
        const currentIndex = game.turnOrder.findIndex(jid => jid === game.currentPlayer);
        if (currentIndex >= 0) {
          game.turnIndex = currentIndex;
        }
      }
    }

    // If no players left, end game
    if (Object.keys(game.players).length === 0) {
      game.active = false;
      if (game.turnTimeout) clearTimeout(game.turnTimeout);
      return sock.sendMessage(from, { 
        text: "🏁 Game ended. No players remaining." 
      }, { quoted: msg });
    }

    return sock.sendMessage(from, { 
      text: `👋 ${getMention(senderJid)} left the game.`,
      mentions: [senderJid]
    }, { quoted: msg });
  }

  // =================================================
  // END GAME (force end - owner only)
  // =================================================
  if (cmd === "end") {
    // Check if user is owner
    const ownerNumber = require("../settings").ownerNumber?.replace(/\D/g, "");
    const isOwner = msg.key.fromMe || senderNumber === ownerNumber;

    if (!isOwner) {
      return sock.sendMessage(from, { 
        text: "❌ Only bot owner can force end a game." 
      }, { quoted: msg });
    }

    if (!game.active) {
      return sock.sendMessage(from, { text: "❌ No active game." }, { quoted: msg });
    }

    game.active = false;
    if (game.gameStartTimeout) clearTimeout(game.gameStartTimeout);
    if (game.turnTimeout) clearTimeout(game.turnTimeout);

    return sock.sendMessage(from, { 
      text: "🛑 Game ended by owner." 
    }, { quoted: msg });
  }

  // =================================================
  // STATUS
  // =================================================
  if (cmd === "status") {
    if (!game.active) {
      return sock.sendMessage(from, { 
        text: "❌ No active game. Start one with `.wcg start`" 
      }, { quoted: msg });
    }

    let statusText = `🎮 *WCG STATUS*\n\n`;

    // Players list with proper mentions
    const playersList = Object.keys(game.players).map(jid => {
      const p = game.players[jid];
      return `• ${getMention(jid)} - ${p.score} pts`;
    }).join("\n");

    statusText += `*Players:* ${Object.keys(game.players).length}\n${playersList || "None yet"}\n\n`;

    // Required word length for current level
    const requiredLength = 3 + Math.floor((game.level - 1) / 2);

    statusText += `*Level:* ${game.level}\n`;
    statusText += `*Required letters:* ${requiredLength}\n`;
    statusText += `*Time limit:* ${game.timeLimit}s per move\n\n`;

    if (game.turnOrder.length > 0) {
      // Game in progress
      const timeLeft = Math.max(0, Math.floor(
        (game.lastMoveAt + game.timeLimit * 1000 - now()) / 1000
      ));
      statusText += `*Current turn:* ${getMention(game.currentPlayer)}\n`;
      statusText += `*Time left:* ${formatTime(timeLeft)}\n`;
      statusText += `*Current word:* "${game.currentWord || "None"}"\n`;
      statusText += `*Words used:* ${game.usedWords.size}`;
      statusText += `\n\nType \`.wcg leave\` to leave the game.`;

      return sock.sendMessage(from, { 
        text: statusText,
        mentions: Object.keys(game.players)
      }, { quoted: msg });
    } else {
      // Join window
      const joinTimeLeft = Math.max(0, Math.floor(
        (game.startedAt + game.joinTimeLimit * 1000 - now()) / 1000
      ));
      statusText += `*Status:* Waiting for players\n`;
      statusText += `*Join window:* ${formatTime(joinTimeLeft)}\n`;
      statusText += `*Starter:* ${getMention(game.starter)}`;
      statusText += `*Starter:* ${getMention(game.starter)}`;

      return sock.sendMessage(from, { 
        text: statusText,
        mentions: [game.starter]
      }, { quoted: msg });
    }
  }

  // =================================================
  // LEADERBOARD (GLOBAL)
  // =================================================
  if (cmd === "leaderboard") {
    const top = wcgStore.getTop(10);

    if (!top.length) {
      return sock.sendMessage(from, { 
        text: "📉 No WCG scores yet. Play a game to earn points!" 
      }, { quoted: msg });
    }

    const textLb = top
      .map((p, i) => {
        const medal =
          i === 0 ? "🥇" :
          i === 1 ? "🥈" :
          i === 2 ? "🥉" : "🎮";

        return `${medal} ${i + 1}. +${p.number} — ${p.score} pts`;
      })
      .join("\n");

    return sock.sendMessage(from, {
      text: `🏆 *WCG Global Leaderboard* 🏆\n\n${textLb}`
    }, { quoted: msg });
  }

  // =================================================
  // PLAY WORD (.wcg <word>)
  // =================================================
  if (!game.active) return;

  // Check if player is in game
  if (!game.players[senderJid]) {
    return sock.sendMessage(from, { 
      text: `❌ You're not in the game. Join with \`.wcg join\`` 
    }, { quoted: msg });
  }

  // Check if game has started (current word exists)
  if (!game.currentWord) {
    return sock.sendMessage(from, { 
      text: `⏳ Game hasn't started yet. Waiting for players to join...` 
    }, { quoted: msg });
  }

  // Check if it's this player's turn
  if (game.currentPlayer !== senderJid) {
    return sock.sendMessage(from, { 
      text: `❌ It's ${getMention(game.currentPlayer)}'s turn, not yours.`,
      mentions: [game.currentPlayer]
    }, { quoted: msg });
  }

  const word = cmd.toLowerCase();

  // Format check (letters only)
  if (!/^[a-z]+$/i.test(word)) {
    return sock.sendMessage(from, { 
      text: `❌ ${getMention(senderJid)} invalid format.\nUse only letters (A-Z).`,
      mentions: [senderJid]
    }, { quoted: msg });
  }

  // Check word length for current level
  const requiredLength = 3 + Math.floor((game.level - 1) / 2);
  if (word.length !== requiredLength) {
    return sock.sendMessage(from, { 
      text: `❌ ${getMention(senderJid)} word must be **${requiredLength}** letters long at Level ${game.level}.`,
      mentions: [senderJid]
    }, { quoted: msg });
  }

  // Dictionary check (REAL WORD)
  const isDict = await isDictionaryWord(word);
  if (!isDict) {
    return sock.sendMessage(from, { 
      text: `❌ ${getMention(senderJid)} "${word}" is not a valid dictionary word.\nTry again.`,
      mentions: [senderJid]
    }, { quoted: msg });
  }

  // Check if word already used
  if (game.usedWords.has(word)) {
    return sock.sendMessage(from, { 
      text: `❌ ${getMention(senderJid)} "${word}" already used in this game.`,
      mentions: [senderJid]
    }, { quoted: msg });
  }

  // Chain rule check
  const lastLetter = game.currentWord.slice(-1);
  if (word[0] !== lastLetter) {
    return sock.sendMessage(from, { 
      text: `❌ ${getMention(senderJid)} word must start with '${lastLetter}'.`,
      mentions: [senderJid]
    }, { quoted: msg });
  }

  // =================================================
  // ACCEPT MOVE - VALID WORD
  // =================================================

  // Add to used words
  game.usedWords.add(word);
  game.currentWord = word;

  // Calculate points
  const points = word.length + game.level;
  game.players[senderJid].score += points;

  // Save to global leaderboard
  wcgStore.addScore(senderNumber, points);

  // Move to next player
  game.turnIndex = (game.turnIndex + 1) % game.turnOrder.length;
  game.currentPlayer = game.turnOrder[game.turnIndex];
  game.lastMoveAt = now();

  // Reset turn timeout for next player
  if (game.turnTimeout) {
    clearTimeout(game.turnTimeout);
    setTurnTimeout(sock, from, game);
  }

  // Level up after each full round (all players played once)
  const playersCount = game.turnOrder.length;
  if (game.usedWords.size % playersCount === 0) {
    game.level++;
    // Reduce time limit as level increases (min 15s)
    game.timeLimit = Math.max(15, 60 - (game.level * 2));

    // Announce level up
    const newRequiredLength = 3 + Math.floor((game.level - 1) / 2);
    sock.sendMessage(from, { 
      text: `🎉 *LEVEL UP! Now Level ${game.level}*\n` +
            `📏 Required letters: ${newRequiredLength}\n` +
            `⏳ Time limit: ${game.timeLimit}s`
    });
  }

  // Required length for next turn
  const nextRequiredLength = 3 + Math.floor((game.level - 1) / 2);

  // Send success message
  let responseText = `✅ ${getMention(senderJid)} played *${word}*\n` +
                     `🎯 +${points} points (Total: ${game.players[senderJid].score})\n` +
                     `📈 Level: ${game.level}\n` +
                     `📏 Next word: ${nextRequiredLength} letters\n` +
                     `🎯 Next turn: ${getMention(game.currentPlayer)} (${game.timeLimit}s)\n\n` +
                     `Type \`.wcg leave\` to leave the game.`;

  await sock.sendMessage(from, { 
    text: responseText,
    mentions: [senderJid, game.currentPlayer]
  }, { quoted: msg });

  // Check if after this move, only one player remains (due to some leaving during turn)
  checkForWinner(sock, from, game);
};
