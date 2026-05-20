const sudoManager = require('../../lib/sudoManager');
const { isPairedOwner } = require('../../lib/guards');
let settings;
try {
    settings = require("./settings");
} catch {
    try {
        settings = require("../settings");
    } catch {
        try {
            settings = require("../../settings");
        } catch {
            try {
                settings = require("../../../settings");
            } catch {
                console.error("❌ Failed to load settings.js from sudo.js");
            }
        }
    }
}

module.exports = async (sock, msg, from, text, args) => {
    try {
        const sender = msg.key.participant || msg.key.remoteJid;

        // 🔒 ONLY PRIMARY OWNER CAN MANAGE SUDO
        if (!(await isPairedOwner(sock, msg))) {
            return sock.sendMessage(from, { text: "❌ *ACCESS DENIED*\n\nOnly the primary bot owner can manage the Sudo list." }, { quoted: msg });
        }

        const action = args[0]?.toLowerCase();

        if (!action || !['add', 'del', 'list', 'rm'].includes(action)) {
            let help = `🛡️ *SUDO MANAGEMENT* 🛡️\n\n`;
            help += `👉 \`.sudo add @user\`\n`;
            help += `👉 \`.sudo del @user\`\n`;
            help += `👉 \`.sudo list\`\n\n`;
            help += `_Sudo users have full owner permissions in groups._`;
            return sock.sendMessage(from, { text: help }, { quoted: msg });
        }

        // --- LIST ---
        if (action === 'list') {
            const sudos = await sudoManager.fetchSudos();
            const keys = Object.keys(sudos);

            if (keys.length === 0) {
                return sock.sendMessage(from, { text: "ℹ️ No Sudo users found in the database." }, { quoted: msg });
            }

            let list = `🛡️ *ACTIVE SUDO USERS* 🛡️\n━━━━━━━━━━━━━━\n`;
            keys.forEach((num, i) => {
                list += `👤 *${i + 1}.* @${num}\n`;
            });
            list += `━━━━━━━━━━━━━━\nTotal: ${keys.length}`;

            return sock.sendMessage(from, {
                text: list,
                mentions: keys.map(n => n + "@s.whatsapp.net")
            }, { quoted: msg });
        }

        // --- ADD / DEL ---
        const target = msg.mentionedJid?.[0] || msg.quoted?.sender;
        if (!target) {
            return sock.sendMessage(from, { text: `❌ Please mention a user or reply to their message to ${action} them.` }, { quoted: msg });
        }

        const targetNum = target.split('@')[0].split(':')[0];

        if (action === 'add') {
            await sudoManager.addSudo(target);
            return sock.sendMessage(from, { text: `✅ *SUDO ADDED*\n\nUser @${targetNum} now has Sudo privileges.`, mentions: [target] }, { quoted: msg });
        }

        if (action === 'del' || action === 'rm') {
            await sudoManager.removeSudo(target);
            return sock.sendMessage(from, { text: `🗑️ *SUDO REMOVED*\n\nUser @${targetNum} no longer has Sudo privileges.`, mentions: [target] }, { quoted: msg });
        }

    } catch (e) {
        console.error("Sudo Command Error:", e);
        sock.sendMessage(from, { text: "❌ An error occurred while managing Sudos." }, { quoted: msg });
    }
};
