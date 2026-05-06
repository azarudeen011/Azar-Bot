/**
 * .myid Command
 * Helps users identify which ID they should use for website registration
 */

module.exports = async function (sock, msg, from, text, args) {
    const sender = msg.key.participant || msg.key.remoteJid;
    const isLid = sender.includes('@lid');
    const rawId = sender.split('@')[0].split(':')[0];
    
    let response = `🆔 *YOUR BOT IDENTIFIER* 🆔\n\n`;
    response += `📌 *Your ID:* \`${rawId}\`\n`;
    response += `📡 *Type:* ${isLid ? "LID (New Account System)" : "WhatsApp Number"}\n\n`;
    
    if (isLid) {
        response += `⚠️ *Note:* You are using a new WhatsApp LID. If registration with your phone number fails, please use the ID \`${rawId}\` on the website.\n\n`;
    } else {
        response += `✅ You are using a standard WhatsApp number. Register on the website using: \`${rawId}\`\n\n`;
    }
    
    response += `🔗 *Website:* https://azahraverse.lovable.app`;

    await sock.sendMessage(from, { text: response }, { quoted: msg });
};
