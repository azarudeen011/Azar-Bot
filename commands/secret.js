module.exports = async (sock, msg, from, text, args) => {
    try {
        const isGroup = from.endsWith("@g.us");
        const sender = msg.key.participant || msg.key.remoteJid;
        const prefix = global.getPrefix ? global.getPrefix() : ".";

        if (isGroup) {
            return sock.sendMessage(from, { 
                text: `❌ This command can only be used in Private Messages (DM) to protect your privacy!` 
            }, { quoted: msg });
        }

        if (!global.secretSessions) global.secretSessions = {};

        if (args.length === 0) {
            return sock.sendMessage(from, {
                text: `🎭 *ANONYMOUS CHAT ROUTER* 🎭\n━━━━━━━━━━━━━━\n\n` +
                      `Send a completely anonymous message to anyone! They will only see it's from the bot, but they can reply back to you!\n\n` +
                      `*Usage:*\n` +
                      `\`${prefix}secret <Phone_Number> <Your Message>\`\n\n` +
                      `*Example:*\n` +
                      `\`${prefix}secret 919876543210 I know what you did last summer\``
            }, { quoted: msg });
        }

        const firstArg = args[0];

        // CHECK IF IT'S A REPLY TO A PREVIOUS SESSION
        if (firstArg.startsWith("anon_")) {
            const sessionId = firstArg;
            const originalSender = global.secretSessions[sessionId];

            if (!originalSender) {
                return sock.sendMessage(from, { text: "❌ This secret session has expired or is invalid." }, { quoted: msg });
            }

            const replyMessage = args.slice(1).join(" ");
            if (!replyMessage) return sock.sendMessage(from, { text: "❌ You need to type a message to reply with!" }, { quoted: msg });

            const outgoingText = `📩 *ANONYMOUS REPLY RECEIVED* 📩\n━━━━━━━━━━━━━━\n\n` +
                                 `_"${replyMessage}"_\n\n` +
                                 `━━━━━━━━━━━━━━\n` +
                                 `_They replied to your secret message!_\n` +
                                 `*(To reply back, just use the exact same format!)*`;

            await sock.sendMessage(originalSender, { text: outgoingText });
            return sock.sendMessage(from, { text: "✅ *Your anonymous reply was sent securely!*" }, { quoted: msg });
        }

        // CREATE A NEW ANONYMOUS MESSAGE TO A NUMBER
        const targetNumber = firstArg.replace(/[^0-9]/g, "");
        if (targetNumber.length < 10) {
            return sock.sendMessage(from, { text: "❌ Invalid phone number." }, { quoted: msg });
        }

        const targetJid = targetNumber + "@s.whatsapp.net";
        const secretMessage = args.slice(1).join(" ");

        if (!secretMessage) {
            return sock.sendMessage(from, { text: "❌ You need to type a message to send!" }, { quoted: msg });
        }

        // Generate a random session ID so the target can reply without knowing who sent it
        const sessionId = "anon_" + Math.floor(10000 + Math.random() * 90000);
        
        // Save who sent it so we can route the reply back to them
        global.secretSessions[sessionId] = sender;

        const outgoingText = `🎭 *YOU RECEIVED A SECRET MESSAGE* 🎭\n━━━━━━━━━━━━━━\n\n` +
                             `_"${secretMessage}"_\n\n` +
                             `━━━━━━━━━━━━━━\n` +
                             `🕵️‍♂️ _Identity: Hidden_\n\n` +
                             `*Want to reply to them anonymously?*\n` +
                             `Copy/Paste and send this exact command here:\n\n` +
                             `${prefix}secret ${sessionId} <type your reply here>`;

        try {
            await sock.sendMessage(targetJid, { text: outgoingText });
            return sock.sendMessage(from, { text: `✅ *Message sent anonymously!* If they reply, the bot will forward it here.` }, { quoted: msg });
        } catch (e) {
            return sock.sendMessage(from, { text: `❌ Failed to send. That person might not be using WhatsApp or I am blocked.` }, { quoted: msg });
        }

    } catch (e) {
        console.error("Secret error:", e);
        await sock.sendMessage(from, { text: "❌ Error: " + e.message }, { quoted: msg });
    }
};
