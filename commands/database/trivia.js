// ==============================================
// 🧠 TRIVIA GAME — Azahrabot
// .trivia  → start question
// .answer <text> → answer
// ==============================================

if (!global.__TRIVIA__) global.__TRIVIA__ = {};
const TRIVIA = global.__TRIVIA__;

// Simple GK Question Bank (you can expand later)
const QUESTIONS = [
  {
    q: "What is the capital of France?",
    options: ["Paris", "London", "Berlin", "Madrid"],
    a: "Paris"
  },
  {
    q: "Which planet is known as the Red Planet?",
    options: ["Earth", "Mars", "Jupiter", "Venus"],
    a: "Mars"
  },
  {
    q: "Who wrote Romeo and Juliet?",
    options: ["Shakespeare", "Dickens", "Homer", "Tolstoy"],
    a: "Shakespeare"
  },
  {
    q: "What is the largest ocean in the world?",
    options: ["Indian Ocean", "Atlantic Ocean", "Pacific Ocean", "Arctic Ocean"],
    a: "Pacific Ocean"
  },
  {
    q: "How many continents are there?",
    options: ["5", "6", "7", "8"],
    a: "7"
  },
  {
    q: "What gas do humans breathe in?",
    options: ["Carbon Dioxide", "Oxygen", "Nitrogen", "Hydrogen"],
    a: "Oxygen"
  },
  {
    q: "Which country invented pizza?",
    options: ["France", "Italy", "USA", "Spain"],
    a: "Italy"
  }
];

module.exports = async (sock, msg, from, text, args) => {
  const sender =
    msg.key.participant || msg.key.remoteJid;

  const number = sender.replace(/\D/g, "");

  if (!TRIVIA[from]) {
    TRIVIA[from] = {
      active: false,
      question: null,
      answer: null,
      timeout: null
    };
  }

  const game = TRIVIA[from];

  const command = text.split(" ")[0].replace(".", "").toLowerCase();

  // =========================
  // START TRIVIA
  // =========================
  if (command === "trivia") {
    if (game.active) {
      return sock.sendMessage(from, {
        text: "⚠️ A trivia question is already active!"
      }, { quoted: msg });
    }

    const random = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];

    game.active = true;
    game.question = random.q;
    game.answer = random.a.toLowerCase();

    // 60 sec timeout
    game.timeout = setTimeout(() => {
      if (game.active) {
        sock.sendMessage(from, {
          text: `⏰ Time's up!\nCorrect answer was: *${random.a}*`
        });
        game.active = false;
      }
    }, 60_000);

    return sock.sendMessage(from, {
      text:
        `🧠 *TRIVIA QUESTION*\n\n` +
        `📌 ${random.q}\n\n` +
        random.options.map(o => `• ${o}`).join("\n") +
        `\n\nType: *.answer <option>*\n⏳ 60 seconds`
    }, { quoted: msg });
  }

  // =========================
  // ANSWER TRIVIA
  // =========================
  if (command === "answer") {
    if (!game.active) {
      return sock.sendMessage(from, {
        text: "❌ No active trivia question. Use .trivia first."
      }, { quoted: msg });
    }

    const userAnswer = args.join(" ").trim().toLowerCase();

    if (!userAnswer) {
      return sock.sendMessage(from, {
        text: "Usage: .answer <full option text>"
      }, { quoted: msg });
    }

    clearTimeout(game.timeout);

    if (userAnswer === game.answer) {
      game.active = false;

      return sock.sendMessage(from, {
        text:
          `🎉 Correct! @${number} got it right!\n` +
          `✅ Answer: *${game.answer}*`,
        mentions: [sender]
      }, { quoted: msg });
    } else {
      game.active = false;

      return sock.sendMessage(from, {
        text:
          `❌ Wrong answer!\n` +
          `Correct answer was: *${game.answer}*`
      }, { quoted: msg });
    }
  }
};
