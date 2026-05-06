let settings;
try {
  settings = require("./settings");
} catch {
  try { settings = require("../settings"); } catch { settings = require("../../settings"); }
}

const { isPairedOwner } = require("../../lib/guards");

module.exports = async (sock, msg, from) => {
    try {
        const isOwner = await isPairedOwner(sock, msg);
        if (!isOwner) {
            return await sock.sendMessage(from, { text: "❌ This command is only for the owner!" }, { quoted: msg });
        }

        await sock.sendMessage(from, { text: "🔄 *Restarting...*\n\n_The bot will be back online in a few seconds._" }, { quoted: msg });

        setTimeout(() => {
            process.exit(0);
        }, 2000);

    } catch (err) {
        console.error("❌ Error in restart command:", err.message);
        await sock.sendMessage(from, { text: "⚠️ Failed to initiate restart." }, { quoted: msg });
    }
};
