const fs = require('fs');
const path = require('path');
const settings = require('../settings');
const { isPairedOwner } = require("../lib/guards");

/**
 * .setlid Command
 * Updates the bot's owner LID in real-time.
 * Must be used by replying to a message from the user whose LID you want to set.
 */
module.exports = async (sock, msg, from, text, args) => {
    try {
        // 1. Owner Check
        if (!isPairedOwner(msg)) {
            return sock.sendMessage(from, { text: "❌ This command is restricted to the bot owner." }, { quoted: msg });
        }

        // 2. Get the target LID from reply
        const context = msg.message?.extendedTextMessage?.contextInfo || {};
        if (!context || !context.quotedMessage) {
            return sock.sendMessage(from, { 
                text: "⚠️ Please *reply* to a message sent by the user whose LID you want to set as the owner LID." 
            }, { quoted: msg });
        }

        // Search for LID in the message object
        // Baileys often includes the LID in various fields depending on the account type
        let targetLid = null;

        // Strategy A: Check participant field (common for replies)
        if (context.participant && context.participant.endsWith("@lid")) {
            targetLid = context.participant;
        }

        // Strategy B: Recursive search in the quoted message context (fallback)
        if (!targetLid) {
            const searchForLid = (obj) => {
                if (!obj || typeof obj !== "object") return null;
                for (const key in obj) {
                    const val = obj[key];
                    if (typeof val === "string" && val.endsWith("@lid")) return val;
                    if (typeof val === "object") {
                        const found = searchForLid(val);
                        if (found) return found;
                    }
                }
                return null;
            };
            // Search in the full context of the quoted message
            targetLid = searchForLid(context);
        }

        // 3. Validation: "check if its lid too before set"
        if (!targetLid || !targetLid.endsWith("@lid")) {
            return sock.sendMessage(from, { 
                text: "❌ Could not find a valid LID in the replied message.\n\n_Note: Standard accounts might not have an LID yet._" 
            }, { quoted: msg });
        }

        // 4. Check if already set
        if (settings.ownerLid === targetLid) {
            return sock.sendMessage(from, { text: "ℹ️ This LID is already set as the owner LID." }, { quoted: msg });
        }

        // 5. Update in memory (Real-time update)
        settings.ownerLid = targetLid;

        // 6. Persist to settings.js (Survives restart)
        // We look for settings.js in the parent directory of where this command resides at RUNTIME
        // Since this file is in 'commands' or 'src/commands', we look for '../settings.js'
        const settingsPath = path.join(process.cwd(), 'settings.js');
        
        if (fs.existsSync(settingsPath)) {
            let content = fs.readFileSync(settingsPath, 'utf8');
            
            if (content.includes('ownerLid')) {
                // Replace existing ownerLid
                content = content.replace(/ownerLid\s*:\s*["'`][^"'`]*["'`]/, `ownerLid: "${targetLid}"`);
            } else {
                // Add ownerLid after ownerNumber if it doesn't exist
                content = content.replace(/(ownerNumber\s*:\s*["'`].*?["'`]\s*,)/, `$1\n  ownerLid: "${targetLid}",`);
            }
            
            fs.writeFileSync(settingsPath, content, 'utf8');
            console.log(`✅ Owner LID updated in settings.js: ${targetLid}`);
        }

        // 7. Respond Success
        await sock.sendMessage(from, { 
            text: `✅ *Owner LID Updated Successfully!*\n\n*New LID:* ${targetLid}\n\n_This change has been applied in real-time and saved to settings._` 
        }, { quoted: msg });

    } catch (err) {
        console.error("SetLID Command Error:", err);
        await sock.sendMessage(from, { text: `⚠️ Failed to set LID: ${err.message}` }, { quoted: msg });
    }
};
