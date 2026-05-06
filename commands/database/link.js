const identityManager = require('../../lib/identityManager');

module.exports = async (sock, msg, from, text, args) => {
    const sender = msg.key.participant || msg.key.remoteJid;
    const isLid = sender.includes('@lid');

    if (!isLid) {
        return sock.sendMessage(from, { 
            text: "✅ Your account is already using a standard WhatsApp ID. No linking required!" 
        }, { quoted: msg });
    }

    // Generate a secure 6-digit code
    const code = identityManager.generateCode(sender, from);

    // 1. Tell the user in the group to check their DM
    await sock.sendMessage(from, { 
        text: `🔐 *IDENTITY LINKING*\n\n@${sender.split('@')[0]}, I have sent a **Secret Code** to your private DM. Please check your messages and follow the instructions there!`,
        mentions: [sender]
    }, { quoted: msg });

    // 2. Send the code PRIVATELY to the LID
    const privateMessage = `🤫 *SECRET LINKING CODE*\n\nYour unique verification code is: *${code}*\n\nTo link your account, please reply to this message with:\n*.verify ${code}*\n\n_This code is private. Do not share it with anyone!_`;
    
    try {
        await sock.sendMessage(sender, { text: privateMessage });
    } catch (e) {
        // Fallback if the bot can't DM (some privacy settings block this)
        await sock.sendMessage(from, { 
            text: `❌ *ERROR:* I couldn't send you a private message. Please make sure your privacy settings allow messages from non-contacts, or message me first!` 
        }, { quoted: msg });
    }
};
