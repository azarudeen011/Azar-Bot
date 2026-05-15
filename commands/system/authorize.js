/**
 * .authorize / .unauthorize Command
 * Manages the list of groups authorized to use the bot in 'groups' mode.
 */

module.exports = async function (sock, msg, from, text, args) {
    const { isAuthorizedGroup, setGroupAuthorization } = global;
    const { isSudo } = require("../../lib/guards");
    
    // Security: Only Owner/Sudo can manage authorizations
    if (!(await isSudo(sock, msg))) {
        return sock.sendMessage(from, { text: "❌ Only the bot owner can manage group authorizations." }, { quoted: msg });
    }

    const isGroup = from.endsWith("@g.us");
    if (!isGroup) {
        return sock.sendMessage(from, { text: "⚠️ This command can only be used in a group!" }, { quoted: msg });
    }

    const arg = args[0]?.toLowerCase();

    // 📖 HELP MENU
    if (arg === "help" || (!arg && !isGroup)) {
        let helpMsg = `╭━━━〔 🏰 *ɢʀᴏᴜᴘ ᴀᴜᴛʜ* 〕━━━⬣\n`;
        helpMsg += `┃\n`;
        helpMsg += `┃ 🛠️ *Commands:*\n`;
        helpMsg += `┃ • \`.authorize on\` - Allow this group\n`;
        helpMsg += `┃ • \`.authorize off\` - Block this group\n`;
        helpMsg += `┃ • \`.authorize list\` - View allowed IDs\n`;
        helpMsg += `┃\n`;
        helpMsg += `┃ 💡 *Usage:* Use these to control\n`;
        helpMsg += `┃ where the bot works when in\n`;
        helpMsg += `┃ *Groups* mode (\`.mode groups\`).\n`;
        helpMsg += `┃\n`;
        helpMsg += `╰━━━━━━━━━━━━━━━━━━━━━━⬣\n`;
        helpMsg += `> ✨ AzahraBot Security 🚀`;
        return sock.sendMessage(from, { text: helpMsg }, { quoted: msg });
    }

    if (arg === "list") {
        const groups = global.getAuthorizedGroups ? global.getAuthorizedGroups() : [];
        if (groups.length === 0) {
            return sock.sendMessage(from, { text: "🏰 *AUTHORIZED GROUPS* 🏰\n\nNo groups have been authorized yet." }, { quoted: msg });
        }

        let listMsg = `🏰 *AUTHORIZED GROUPS* 🏰\n━━━━━━━━━━━━━━\n`;
        for (const [i, g] of groups.entries()) {
            listMsg += `${i + 1}. ${g}\n`;
        }
        listMsg += `━━━━━━━━━━━━━━\nTotal: ${groups.length}`;
        return sock.sendMessage(from, { text: listMsg }, { quoted: msg });
    }
    
    if (arg === "on" || arg === "allow" || arg === "authorize") {
        if (isAuthorizedGroup(from)) {
            return sock.sendMessage(from, { text: "✅ This group is already authorized." }, { quoted: msg });
        }
        
        setGroupAuthorization(from, true);
        const metadata = await sock.groupMetadata(from).catch(() => ({ subject: "This Group" }));

        return sock.sendMessage(from, { 
            text: `✅ *GROUP AUTHORIZED!* 🏰\n━━━━━━━━━━━━━━\n🏰 *Group:* ${metadata.subject}\n🆔 *ID:* ${from}\n━━━━━━━━━━━━━━\nThis group can now use all bot commands in *Groups* mode.\n\n_Tip: Use .mode groups to restrict the bot to authorized groups only._` 
        }, { quoted: msg });
    }

    if (arg === "off" || arg === "block" || arg === "unauthorize" || arg === "disallow") {
        if (!isAuthorizedGroup(from)) {
            return sock.sendMessage(from, { text: "❌ This group is not in the authorized list." }, { quoted: msg });
        }
        
        setGroupAuthorization(from, false);
        return sock.sendMessage(from, { 
            text: "🚫 *GROUP UNAUTHORIZED!* 🏰\n━━━━━━━━━━━━━━\nThis group has been removed from the allowed list." 
        }, { quoted: msg });
    }
};
