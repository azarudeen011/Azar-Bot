const fs = require("fs");
const path = require("path");

const welcomeFile = path.join(__dirname, "../data/welcome.json");

module.exports = async (sock, msg, from, text, args) => {
    const isGroup = from.endsWith("@g.us");
    if (!isGroup) return sock.sendMessage(from, { text: "❌ This command is only for groups." }, { quoted: msg });

    // Check admin
    const metadata = await sock.groupMetadata(from).catch(() => null);
    if (!metadata) return;
    const sender = msg.key.participant || msg.key.remoteJid;
    const { isPairedOwner } = require("../lib/guards");
    const isAdmin = metadata.participants.some(p => p.id === sender && p.admin);
    const isOwner = isPairedOwner(msg);

    if (!isAdmin && !isOwner) {
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
        const status = welcomeData[from] ? "ON ✅" : "OFF ❌";
        return sock.sendMessage(from, { text: `👋 *Welcome Configuration*\n\nCurrent Status: *${status}*\n\nUsage:\n\`.welcome on\`\n\`.welcome off\`` }, { quoted: msg });
    }
};
