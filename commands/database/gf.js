const settings = require("../../settings");
const small_lib = require("../../lib/small_lib");

// Shared global game state (same as guessflag.js)
if (!global.__GUESS_FLAG__) global.__GUESS_FLAG__ = {};
const GUESS_FLAG = global.__GUESS_FLAG__;

module.exports = async (sock, msg, from, text, args) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    const number = sender.replace(/\D/g, "");

    // Init per-chat game state if not exists
    if (!GUESS_FLAG[from]) {
        GUESS_FLAG[from] = { active: false, answer: null, timeout: null };
    }

    const game = GUESS_FLAG[from];

    // No active game
    if (!game.active) {
        return sock.sendMessage(from, {
            text: `❌ No active flag game.\nUse *${settings.prefix}guessflag* to start one!`
        }, { quoted: msg });
    }

    const userAnswer = args.join(" ").toLowerCase().trim();

    // No answer provided
    if (!userAnswer) {
        return sock.sendMessage(from, {
            text: `Usage: *${settings.prefix}gf <country name>*\n\n_Example: ${settings.prefix}gf france_`
        }, { quoted: msg });
    }

    // CORRECT ANSWER
    if (userAnswer === game.answer) {
        clearTimeout(game.timeout);
        game.active = false;

        const winMsg = `🎉 *CONGRATULATIONS!* 🎉\n\n` +
            `@${number} guessed it correctly!\n` +
            `🏳️ Country: *${game.answer.toUpperCase()}*\n\n` +
            `> ${small_lib.author}`;

        return sock.sendMessage(from, { text: winMsg, mentions: [sender] }, { quoted: msg });
    }

    // WRONG ANSWER
    return sock.sendMessage(from, { text: "❌ Wrong answer! Try again or wait for timeout." }, { quoted: msg });
};
