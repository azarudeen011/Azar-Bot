module.exports = async (sock, msg, from, text, args) => {
    const isGroup = from.endsWith("@g.us");
    const sender = msg.key.participant || msg.key.remoteJid;
    const prefix = global.getPrefix ? global.getPrefix() : ".";

    // Initialize global confess map
    if (!global.confessMap) global.confessMap = {};

    // 1. Triggered inside a Group
    if (isGroup) {
        // Generate a random 4-digit code for this specific group session
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        
        // Save the mapping
        global.confessMap[code] = from;

        // Delete their message so no one sees they initiated a confession
        try {
            await sock.sendMessage(from, { delete: msg.key });
        } catch (e) {
            console.log("Could not delete .confess message from group");
        }

        // Send them a DM
        const dmText = `🎭 *ANONYMOUS CONFESSION* 🎭\n\n` +
                       `You requested to send an anonymous confession to the group!\n\n` +
                       `To send it securely, simply reply to me here with:\n` +
                       `*${prefix}confess ${code} Your secret message*`;
        
        await sock.sendMessage(sender, { text: dmText });
        return sock.sendMessage(from, { text: `🤫 Someone is writing a secret confession... Check your DMs if it's you!` });
    }

    // 2. Triggered inside DM
    if (!isGroup) {
        if (args.length < 2) {
            return sock.sendMessage(from, { text: `❌ Invalid format.\nUsage: *${prefix}confess <secret_code OR group_link> <your secret message>*` }, { quoted: msg });
        }

        const targetArg = args[0];
        const secretMessage = args.slice(1).join(" ");
        let targetGroup = null;

        // Check if user provided a WhatsApp Group Link
        if (targetArg.includes("chat.whatsapp.com/")) {
            try {
                const inviteCode = targetArg.split("chat.whatsapp.com/")[1].split(" ")[0];
                const groupInfo = await sock.groupGetInviteInfo(inviteCode);
                targetGroup = groupInfo.id;
            } catch (err) {
                return sock.sendMessage(from, { text: `❌ Invalid group link or I don't have access to that group.` }, { quoted: msg });
            }
        } else {
            // Check if user provided the Secret Code
            targetGroup = global.confessMap[targetArg];
            if (!targetGroup) {
                return sock.sendMessage(from, { text: `❌ Invalid or expired code!\n\nType \`${prefix}confess\` in the group to get a new code, OR just paste the group link:\n\n*Example:* \`${prefix}confess https://chat.whatsapp.com/... I love pizza\`` }, { quoted: msg });
            }
            // Clean up code so it can't be reused
            delete global.confessMap[targetArg];
        }

        // Send the anonymous confession to the target group
        const confessCard = `💌 *ANONYMOUS CONFESSION* 💌\n━━━━━━━━━━━━━━\n\n` +
                            `_"${secretMessage}"_\n\n` +
                            `━━━━━━━━━━━━━━\n` +
                            `🕵️‍♂️ _Identity: Hidden_\n` +
                            `*(Someone just sent this anonymous message to the group!)*\n\n` +
                            `Want to confess? Type \`${prefix}confess\``;

        try {
            await sock.sendMessage(targetGroup, { text: confessCard });
            return sock.sendMessage(from, { text: "✅ *Confession Delivered Successfully!* Your identity is 100% safe." }, { quoted: msg });
        } catch (e) {
            return sock.sendMessage(from, { text: "❌ Failed to send. Make sure I am inside that group and allowed to send messages." }, { quoted: msg });
        }
    }
};
