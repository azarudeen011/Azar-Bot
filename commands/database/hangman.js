// ==============================================
// 🎯 Hangman Game — Azahrabot
// Works in Group & DM
// ==============================================

if (!global.__HANGMAN__) global.__HANGMAN__ = {};
const GAMES = global.__HANGMAN__;

// Unique word pool (you can expand this)
const WORDS = [
  "shadow", "mystery", "galaxy", "marvel", "lesbian",
  "transgender", "fantastic", "midnight", "gravity", "eclipse",
  "azar", "gay", "storm", "indian", "cipher",
  "legend", "frozen", "mirror", "silent", "thunder", "hangman",
  "javascript", "programming", "developer", "computer", "internet",
  "bot", "whatsapp", "message", "chat", "fuck", "pussy"
];

// Get random unused word
function getUniqueWord(chatId) {
  if (!GAMES.__USED__) GAMES.__USED__ = new Set();

  let available = WORDS.filter(w => !GAMES.__USED__.has(w));
  if (!available.length) {
    GAMES.__USED__.clear();
    available = WORDS;
  }

  const word = available[Math.floor(Math.random() * available.length)];
  GAMES.__USED__.add(word);
  return word;
}

// Mask word
function maskWord(word, guessed) {
  return word
    .split("")
    .map(l => (guessed.includes(l) ? l : "_"))
    .join(" ");
}

module.exports = async (sock, msg, from, text, args) => {

  const isHangman = text.startsWith(".hangman");
  const isGuess = text.startsWith(".guess");

  // Init game object per chat
  if (!GAMES[from]) {
    GAMES[from] = {
      active: false,
      word: "",
      guessed: [],
      tries: 5
    };
  }

  const game = GAMES[from];

  // =====================================
  // START GAME
  // =====================================
  if (isHangman) {

    if (game.active) {
      return sock.sendMessage(from, {
        text: "⚠️ Hangman already running in this chat!"
      }, { quoted: msg });
    }

    const word = getUniqueWord(from);

    game.active = true;
    game.word = word;
    game.guessed = [];
    game.tries = 5;

    return sock.sendMessage(from, {
      text:
        "🎯 *Hangman Game Started!*\n\n" +
        `Word: ${maskWord(word, [])}\n` +
        `❤️ Tries Left: 5\n\n` +
        "Use `.guess <letter>` to guess a letter"
    }, { quoted: msg });
  }

  // =====================================
  // GUESS LETTER
  // =====================================
  if (isGuess) {

    if (!game.active) {
      return sock.sendMessage(from, {
        text: "❌ No active Hangman game. Use `.hangman` to start."
      }, { quoted: msg });
    }

    const letter = args[0]?.toLowerCase();

    if (!letter || !/^[a-z]$/.test(letter)) {
      return sock.sendMessage(from, {
        text: "⚠️ Guess a single valid letter.\nExample: `.guess a`"
      }, { quoted: msg });
    }

    if (game.guessed.includes(letter)) {
      return sock.sendMessage(from, {
        text: `⚠️ Letter "${letter}" already guessed.`
      }, { quoted: msg });
    }

    game.guessed.push(letter);

    if (!game.word.includes(letter)) {
      game.tries--;
    }

    const masked = maskWord(game.word, game.guessed);

    // WIN
    if (!masked.includes("_")) {
      const winWord = game.word;
      game.active = false;

      return sock.sendMessage(from, {
        text:
          `🎉 *YOU WON!*\n\n` +
          `Word: ${winWord}\n` +
          `Remaining Tries: ${game.tries}`
      }, { quoted: msg });
    }

    // LOSE
    if (game.tries <= 0) {
      const loseWord = game.word;
      game.active = false;

      return sock.sendMessage(from, {
        text:
          `💀 *Game Over!*\n\n` +
          `Correct Word: ${loseWord}`
      }, { quoted: msg });
    }

    // CONTINUE
    return sock.sendMessage(from, {
      text:
        `🔤 Word: ${masked}\n` +
        `❤️ Tries Left: ${game.tries}\n` +
        `📝 Guessed: ${game.guessed.join(", ")}`
    }, { quoted: msg });
  }

};
