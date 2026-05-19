const fs = require("fs");
const path = require("path");

const welcomeFile = path.join(process.cwd(), "data", "welcome.json");

module.exports = async (sock, msg, from, text, args) => {
    const isGroup = from.endsWith("@g.us");
    if (!isGroup) return sock.sendMessage(from, { text: "❌ This command is only for groups." }, { quoted: msg });

    // Fetch group metadata and sender
    const metadata = await sock.groupMetadata(from);
    const participants = metadata.participants || [];
    const sender = msg.key.participant || msg.key.remoteJid;

    // Check privileges
    const { isSudo } = require("../lib/guards");
    const isSudoUser = await isSudo(sock, msg);
    const admins = participants.filter(p => p.admin).map(p => p.id);
    const isAdmin = admins.includes(sender) || isSudoUser || msg.key.fromMe;
    
    let settings;
    try {
        settings = require("../settings");
    } catch {
        try {
            settings = require("../../settings");
        } catch {
            settings = { welcome: true }; // Fallback
        }
    }

    if (!isAdmin) {
        return sock.sendMessage(from, { text: "❌ Only group admins can configure the welcome system." }, { quoted: msg });
    }

    let welcomeData = {};
    if (fs.existsSync(welcomeFile)) {
        try { welcomeData = JSON.parse(fs.readFileSync(welcomeFile)); } catch { }
    }

    const cmd = args[0]?.toLowerCase();

    if (cmd === "on") {
        if (welcomeData[from] && typeof welcomeData[from] === "object") {
            welcomeData[from].enabled = true;
        } else {
            welcomeData[from] = true;
        }
        if (!fs.existsSync(path.dirname(welcomeFile))) fs.mkdirSync(path.dirname(welcomeFile), { recursive: true });
        fs.writeFileSync(welcomeFile, JSON.stringify(welcomeData, null, 2));
        return sock.sendMessage(from, { text: "✅ Welcome messages *ENABLED* for this group." }, { quoted: msg });
    } else if (cmd === "off") {
        if (welcomeData[from] && typeof welcomeData[from] === "object") {
            welcomeData[from].enabled = false;
        } else {
            welcomeData[from] = false;
        }
        if (!fs.existsSync(path.dirname(welcomeFile))) fs.mkdirSync(path.dirname(welcomeFile), { recursive: true });
        fs.writeFileSync(welcomeFile, JSON.stringify(welcomeData, null, 2));
        return sock.sendMessage(from, { text: "❌ Welcome messages *DISABLED* for this group." }, { quoted: msg });
    } else if (cmd === "set") {
        const customText = args.slice(1).join(" ");
        if (!customText) {
            return sock.sendMessage(from, { 
                text: "❌ *Please provide the welcome message!*\n\n" +
                      "💡 *Example:* `.welcome set Hey @user! Welcome to *@group* 💖 Enjoy your stay!`\n\n" +
                      "🎨 *Available Placeholders:*\n" +
                      "• `@user` - Mention the new member\n" +
                      "• `@group` - Group name\n" +
                      "• `@desc` - Group description\n" +
                      "• `@members` - Group members count"
            }, { quoted: msg });
        }

        welcomeData[from] = {
            enabled: true,
            text: customText
        };
        if (!fs.existsSync(path.dirname(welcomeFile))) fs.mkdirSync(path.dirname(welcomeFile), { recursive: true });
        fs.writeFileSync(welcomeFile, JSON.stringify(welcomeData, null, 2));

        return sock.sendMessage(from, {
            text: `✅ *Custom Welcome Message Configured!* 🥳\n\n` +
                  `📝 *Your Custom Message:*\n"${customText}"\n\n` +
                  `💡 _Any new members will now be greeted with this style!_`
        }, { quoted: msg });
    } else if (cmd === "reset") {
        welcomeData[from] = true; // Reset back to standard/AI greetings
        if (!fs.existsSync(path.dirname(welcomeFile))) fs.mkdirSync(path.dirname(welcomeFile), { recursive: true });
        fs.writeFileSync(welcomeFile, JSON.stringify(welcomeData, null, 2));

        return sock.sendMessage(from, { 
            text: "🔄 *Welcome message reset to default!* (Smart AI-generated greetings will now be used)" 
        }, { quoted: msg });
    } else {
        const auto = global.autoConfig || {};
        
        let isGroupEnabled = false;
        let isCustom = false;
        let currentCustomText = null;

        if (welcomeData[from] === true) {
            isGroupEnabled = true;
        } else if (welcomeData[from] && typeof welcomeData[from] === "object") {
            isGroupEnabled = welcomeData[from].enabled !== false;
            isCustom = true;
            currentCustomText = welcomeData[from].text;
        }

        const status = isGroupEnabled ? "ON ✅" : "OFF ❌";
        const isGlobalOn = settings.welcome !== false && auto.welcome !== false;
        const globalStatus = isGlobalOn ? "Active ✅" : "Disabled ⚠️";

        let response = `👋 *Welcome Message Dashboard*\n`;
        response += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        response += `📍 *Group:* _${metadata.subject}_\n`;
        response += `🔔 *Welcome Status:* *${status}*\n`;
        response += `🌐 *Global System:* *${globalStatus}*\n`;
        response += `📝 *Greeting Mode:* *${isCustom ? "Custom Text ✍️" : "Smart AI ✨"}*\n`;
        
        if (isCustom && currentCustomText) {
            response += `\n💬 *Custom Message:*\n"${currentCustomText}"\n`;
        }

        response += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        response += `⚙️ *Admin Commands:*\n`;
        response += `• \`.welcome on\` - Enable greetings\n`;
        response += `• \`.welcome off\` - Disable greetings\n`;
        response += `• \`.welcome set <text>\` - Set a custom greeting message\n`;
        response += `• \`.welcome reset\` - Reset to Smart AI-generated greetings\n\n`;
        response += `💡 *Available Placeholders:*\n`;
        response += `• \`@user\` - Mention the new member\n`;
        response += `• \`@group\` - Name of the group\n`;
        response += `• \`@desc\` - Group description\n`;
        response += `• \`@members\` - Total group member count\n`;

        return sock.sendMessage(from, { text: response }, { quoted: msg });
    }
};
