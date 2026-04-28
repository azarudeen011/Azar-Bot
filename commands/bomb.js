module.exports = async (sock, msg, from, text, args) => {
    try {
        const prefix = global.getPrefix ? global.getPrefix() : ".";

        if (args.length < 2) {
            return sock.sendMessage(from, { 
                text: `💣 *TIME-BOMB MESSAGE* 💣\n━━━━━━━━━━━━━━\n\n` +
                      `Send a message that self-destructs after a specific time!\n\n` +
                      `*Usage:*\n` +
                      `\`${prefix}bomb <time> <secret message>\`\n\n` +
                      `*Examples:*\n` +
                      `\`${prefix}bomb 10s The code is 4921\` (Deletes in 10 seconds)\n` +
                      `\`${prefix}bomb 2m Call me right now\` (Deletes in 2 minutes)` 
            }, { quoted: msg });
        }

        const timeStr = args[0].toLowerCase();
        const secretMessage = args.slice(1).join(" ");

        let ms = 0;
        if (timeStr.endsWith("s")) {
            ms = parseInt(timeStr) * 1000;
        } else if (timeStr.endsWith("m")) {
            ms = parseInt(timeStr) * 60 * 1000;
        } else {
            return sock.sendMessage(from, { text: "❌ Invalid time format. Use 's' for seconds or 'm' for minutes (e.g., 30s, 5m)." }, { quoted: msg });
        }

        if (isNaN(ms) || ms <= 0) {
            return sock.sendMessage(from, { text: "❌ Invalid time specified." }, { quoted: msg });
        }

        if (ms > 3600000) {
            return sock.sendMessage(from, { text: "❌ Maximum self-destruct time is 1 hour (60m)." }, { quoted: msg });
        }

        // Try to delete the command invocation so nobody sees the timer
        try {
            await sock.sendMessage(from, { delete: msg.key });
        } catch (e) {
            // Ignore if we can't delete
        }

        const bombCard = `💣 *SELF-DESTRUCTING MESSAGE* 💣\n━━━━━━━━━━━━━━\n\n` +
                         `_${secretMessage}_\n\n` +
                         `━━━━━━━━━━━━━━\n` +
                         `⏳ _This message will automatically delete in ${timeStr}_`;

        const sentMsg = await sock.sendMessage(from, { text: bombCard });

        // Schedule deletion
        setTimeout(async () => {
            try {
                await sock.sendMessage(from, { delete: sentMsg.key });
            } catch (e) {
                console.log("Failed to delete bomb message");
            }
        }, ms);

    } catch (e) {
        console.error("Bomb error:", e);
        await sock.sendMessage(from, { text: "❌ Error: " + e.message }, { quoted: msg });
    }
};
