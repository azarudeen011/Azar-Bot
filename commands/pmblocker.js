// ==============================================
// 🚫 Azahrabot PM Blocker Command
// Automatically blocks anyone who DMs the bot
// Owner Only • Persistent
// ==============================================

const fs = require("fs");
const path = require("path");

module.exports = async (sock, msg, from, text, args) => {
    try {
        const sender = msg.key.participant || msg.key.remoteJid;
        
        // 👑 Verify owner
        let ownerNum = global.getOwner?.() || "";
        const isOwner = msg.key.fromMe || sender.replace(/[^0-9]/g, "") === ownerNum;

        if (!isOwner) {
            return await sock.sendMessage(from, { text: "❌ *Access Denied:* This command is reserved for the Bot Owner only." }, { quoted: msg });
        }

        const arg = args[0]?.toLowerCase();
        
        if (arg === "on" || arg === "off") {
            const isActive = arg === "on";
            
            // Update global config in memory
            if (!global.autoConfig) global.autoConfig = {};
            global.autoConfig.pmblocker = isActive;

            // Save to disk persistently
            const automationPath = path.join(__dirname, "../data/automation.json");
            try {
                if (!fs.existsSync(path.dirname(automationPath))) {
                    fs.mkdirSync(path.dirname(automationPath), { recursive: true });
                }
                fs.writeFileSync(automationPath, JSON.stringify(global.autoConfig, null, 2));
                
                return await sock.sendMessage(from, { 
                    text: `🛡️ *PM BLOCKER UPDATE*\n────────────────────\nStatus: *${arg.toUpperCase()}*\n\n` +
                          (isActive 
                              ? `🔒 The bot will now automatically block ANY non-owner who sends a private message.` 
                              : `🔓 PMs are now open. Users will no longer be automatically blocked.`)
                }, { quoted: msg });
            } catch (e) {
                console.error("PM Blocker config save error:", e);
                return await sock.sendMessage(from, { text: "❌ Failed to save configuration to disk!" }, { quoted: msg });
            }
        } else {
            return await sock.sendMessage(from, { 
                text: `⚠️ *Usage:* \`.pmblocker on\` or \`.pmblocker off\`\n\n` +
                      `Current Status: *${global.autoConfig?.pmblocker ? 'ON' : 'OFF'}*` 
            }, { quoted: msg });
        }
    } catch (err) {
        console.error("❌ .pmblocker error:", err);
        await sock.sendMessage(from, { text: `⚠️ An error occurred: ${err.message}` }, { quoted: msg });
    }
};
