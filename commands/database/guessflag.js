const axios = require("axios");
const settings = require("../../settings");
const small_lib = require("../../lib/small_lib");

// Shared global game state
if (!global.__GUESS_FLAG__) global.__GUESS_FLAG__ = {};
const GUESS_FLAG = global.__GUESS_FLAG__;

module.exports = async (sock, msg, from, text, args) => {
    // Init per-chat game state
    if (!GUESS_FLAG[from]) {
        GUESS_FLAG[from] = { active: false, answer: null, timeout: null };
    }

    const game = GUESS_FLAG[from];

    // USAGE / HELP
    if (args[0] === "help") {
        let usage = `🏁 *GUESS FLAG - USAGE* 🏁\n\n`;
        usage += `1️⃣ *${settings.prefix}guessflag* - Start a new game\n`;
        usage += `2️⃣ *${settings.prefix}gf <country>* - Submit your answer\n\n`;
        usage += `_Example: ${settings.prefix}gf united states_`;
        return sock.sendMessage(from, { text: usage }, { quoted: msg });
    }

    // BLOCK if already active
    if (game.active) {
        return sock.sendMessage(from, { text: "⚠️ A flag game is already active! Use `.gf <country>` to answer." }, { quoted: msg });
    }

    try {
        await sock.sendMessage(from, { react: { text: "🏁", key: msg.key } }).catch(() => { });

        const res = await axios.get(`https://anabot.my.id/api/games/fun/tebakbendera?apikey=freeApikey`, { timeout: 30000 });

        if (!res.data || !res.data.success || !res.data.data) {
            return sock.sendMessage(from, { text: "❌ Failed to fetch flag. API might be offline." }, { quoted: msg });
        }

        const { name, img } = res.data.data;
        game.active = true;
        game.answer = name.toLowerCase().trim();

        // 60-second auto-timeout
        game.timeout = setTimeout(() => {
            if (game.active) {
                sock.sendMessage(from, { text: `⏰ Time's up!\n\n🏳️ The flag was: *${name}*` });
                game.active = false;
            }
        }, 60_000);

        const caption = `🚩 *GUESS THE FLAG* 🚩\n\n` +
            `What country does this flag belong to?\n\n` +
            `💡 Use: *${settings.prefix}gf <answer>*\n` +
            `⏳ You have 60 seconds!\n\n` +
            `> ${small_lib.author}`;

        return sock.sendMessage(from, { image: { url: img }, caption }, { quoted: msg });

    } catch (e) {
        console.error("GuessFlag Error:", e.message);
        return sock.sendMessage(from, { text: "❌ Failed to start flag game. Try again later." }, { quoted: msg });
    }
};
