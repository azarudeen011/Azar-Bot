const fs = require("fs");
const path = require("path");

const goodbyeFile = path.join(process.cwd(), "data", "goodbye.json");

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
            settings = { welcome: true }; // Use same setting for fallback
        }
    }

    if (!isAdmin) {
        return sock.sendMessage(from, { text: "❌ Only group admins can configure the goodbye system." }, { quoted: msg });
    }

    let goodbyeData = {};
    if (fs.existsSync(goodbyeFile)) {
        try { goodbyeData = JSON.parse(fs.readFileSync(goodbyeFile)); } catch { }
    }

    const cmd = args[0]?.toLowerCase();

    if (cmd === "on") {
        if (goodbyeData[from] && typeof goodbyeData[from] === "object") {
            goodbyeData[from].enabled = true;
        } else {
            goodbyeData[from] = true;
        }
        if (!fs.existsSync(path.dirname(goodbyeFile))) fs.mkdirSync(path.dirname(goodbyeFile), { recursive: true });
        fs.writeFileSync(goodbyeFile, JSON.stringify(goodbyeData, null, 2));
        return sock.sendMessage(from, { text: "✅ Goodbye messages *ENABLED* for this group." }, { quoted: msg });
    } else if (cmd === "off") {
        if (goodbyeData[from] && typeof goodbyeData[from] === "object") {
            goodbyeData[from].enabled = false;
        } else {
            goodbyeData[from] = false;
        }
        if (!fs.existsSync(path.dirname(goodbyeFile))) fs.mkdirSync(path.dirname(goodbyeFile), { recursive: true });
        fs.writeFileSync(goodbyeFile, JSON.stringify(goodbyeData, null, 2));
        return sock.sendMessage(from, { text: "❌ Goodbye messages *DISABLED* for this group." }, { quoted: msg });
    } else if (cmd === "set") {
        const customText = args.slice(1).join(" ");
        if (!customText) {
            return sock.sendMessage(from, { 
                text: "❌ *Please provide the goodbye message!*\n\n" +
                      "💡 *Example:* `.goodbye set @user has left *@group* 😢 We'll miss them!`\n\n" +
                      "🎨 *Available Placeholders:*\n" +
                      "• `@user` - Mention the member who left\n" +
                      "• `@group` - Group name\n" +
                      "• `@desc` - Group description\n" +
                      "• `@members` - Group members count"
            }, { quoted: msg });
        }

        goodbyeData[from] = {
            enabled: true,
            text: customText
        };
        if (!fs.existsSync(path.dirname(goodbyeFile))) fs.mkdirSync(path.dirname(goodbyeFile), { recursive: true });
        fs.writeFileSync(goodbyeFile, JSON.stringify(goodbyeData, null, 2));

        return sock.sendMessage(from, {
            text: `✅ *Custom Goodbye Message Configured!* 🥳\n\n` +
                  `📝 *Your Custom Message:*\n"${customText}"\n\n` +
                  `💡 _Any members who leave will now be sent off with this style!_`
        }, { quoted: msg });
    } else if (cmd === "reset") {
        goodbyeData[from] = true; // Reset back to standard/AI greetings
        if (!fs.existsSync(path.dirname(goodbyeFile))) fs.mkdirSync(path.dirname(goodbyeFile), { recursive: true });
        fs.writeFileSync(goodbyeFile, JSON.stringify(goodbyeData, null, 2));

        return sock.sendMessage(from, { 
            text: "🔄 *Goodbye message reset to default!* (Smart AI-generated farewells will now be used)" 
        }, { quoted: msg });
    } else {
        const auto = global.autoConfig || {};
        
        let isGroupEnabled = false;
        let isCustom = false;
        let currentCustomText = null;

        if (goodbyeData[from] === true) {
            isGroupEnabled = true;
        } else if (goodbyeData[from] && typeof goodbyeData[from] === "object") {
            isGroupEnabled = goodbyeData[from].enabled !== false;
            isCustom = true;
            currentCustomText = goodbyeData[from].text;
        }

        const status = isGroupEnabled ? "ON ✅" : "OFF ❌";
        const isGlobalOn = settings.welcome !== false && auto.welcome !== false;
        const globalStatus = isGlobalOn ? "Active ✅" : "Disabled ⚠️";

        let response = `👋 *Goodbye Message Dashboard*\n`;
        response += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        response += `📍 *Group:* _${metadata.subject}_\n`;
        response += `🔔 *Goodbye Status:* *${status}*\n`;
        response += `🌐 *Global System:* *${globalStatus}*\n`;
        response += `📝 *Farewell Mode:* *${isCustom ? "Custom Text ✍️" : "Smart AI ✨"}*\n`;
        
        if (isCustom && currentCustomText) {
            response += `\n💬 *Custom Message:*\n"${currentCustomText}"\n`;
        }

        response += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        response += `⚙️ *Admin Commands:*\n`;
        response += `• \`.goodbye on\` - Enable farewells\n`;
        response += `• \`.goodbye off\` - Disable farewells\n`;
        response += `• \`.goodbye set <text>\` - Set a custom goodbye message\n`;
        response += `• \`.goodbye reset\` - Reset to Smart AI-generated farewells\n\n`;
        response += `💡 *Available Placeholders:*\n`;
        response += `• \`@user\` - Mention the departing member\n`;
        response += `• \`@group\` - Name of the group\n`;
        response += `• \`@desc\` - Group description\n`;
        response += `• \`@members\` - Total group member count\n`;

        return sock.sendMessage(from, { text: response }, { quoted: msg });
    }
};
