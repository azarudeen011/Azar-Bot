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
        return sock.sendMessage(from, { text: "❌ Only group admins can toggle the welcome system." }, { quoted: msg });
    }

    let welcomeData = {};
    if (fs.existsSync(welcomeFile)) {
        try { welcomeData = JSON.parse(fs.readFileSync(welcomeFile)); } catch { }
    }

    const cmd = args[0]?.toLowerCase();

    if (cmd === "on") {
        welcomeData[from] = true;
        if (!fs.existsSync(path.dirname(welcomeFile))) fs.mkdirSync(path.dirname(welcomeFile), { recursive: true });
        fs.writeFileSync(welcomeFile, JSON.stringify(welcomeData, null, 2));
        return sock.sendMessage(from, { text: "✅ Welcome messages ENABLED for this group." }, { quoted: msg });
    } else if (cmd === "off") {
        welcomeData[from] = false;
        if (!fs.existsSync(path.dirname(welcomeFile))) fs.mkdirSync(path.dirname(welcomeFile), { recursive: true });
        fs.writeFileSync(welcomeFile, JSON.stringify(welcomeData, null, 2));
        return sock.sendMessage(from, { text: "❌ Welcome messages DISABLED for this group." }, { quoted: msg });
    } else {
        const auto = global.autoConfig || {};
        const status = welcomeData[from] ? "ON ✅" : "OFF ❌";
        const isGlobalOn = settings.welcome !== false && auto.welcome !== false;
        const globalStatus = isGlobalOn ? "Active ✅" : "Disabled ⚠️";
        return sock.sendMessage(from, {
            text: `👋 *Welcome Configuration*\n\n` +
                `Group Status: *${status}*\n` +
                `Global System: *${globalStatus}*\n\n` +
                `Usage:\n\`.welcome on\`\n\`.welcome off\``
        }, { quoted: msg });
    }
};
