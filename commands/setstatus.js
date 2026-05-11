const { isPairedOwner } = require("../lib/guards");
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

/**
 * .setstatus Command
 * Uploads a text, image, or video status to your WhatsApp Story (Status broadcast).
 * Also updates the profile "About" text.
 * Restricted to bot owner.
 */
module.exports = async (sock, msg, from, text, args, store) => {
    // 1. Check if sender is owner
    if (!(await isPairedOwner(sock, msg))) {
        return sock.sendMessage(from, { text: "❌ This command is only for the bot owner." }, { quoted: msg });
    }

    try {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        // Find media either in direct message or quoted message
        const hasMedia = msg.message?.imageMessage || msg.message?.videoMessage || 
                         quoted?.imageMessage || quoted?.videoMessage;

        const ownJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        
        // 🛡️ Optimized Status Visibility Logic
        // We collect JIDs from the store to ensure visibility without crashing the bot.
        let statusJidList = new Set([ownJid]);
        
        if (store) {
            if (store.contacts) Object.keys(store.contacts).forEach(j => statusJidList.add(j));
            if (store.chats) Object.keys(store.chats).forEach(j => {
                if (j.endsWith('@s.whatsapp.net')) statusJidList.add(j);
            });
        }
        
        // Filter to ensure only individual WhatsApp JIDs are included and limit to 500
        const jidList = Array.from(statusJidList)
            .filter(j => j.endsWith('@s.whatsapp.net'))
            .slice(0, 500);

        if (hasMedia) {
            // --- Handle Image/Video Status ---
            await sock.sendMessage(from, { react: { text: "⏳", key: msg.key } }).catch(() => {});
            
            let mediaMessage;
            let messageType;
            if (msg.message?.imageMessage) {
                mediaMessage = msg.message.imageMessage;
                messageType = 'image';
            } else if (msg.message?.videoMessage) {
                mediaMessage = msg.message.videoMessage;
                messageType = 'video';
            } else if (quoted?.imageMessage) {
                mediaMessage = quoted.imageMessage;
                messageType = 'image';
            } else if (quoted?.videoMessage) {
                mediaMessage = quoted.videoMessage;
                messageType = 'video';
            }

            const stream = await downloadContentFromMessage(mediaMessage, messageType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const caption = text || mediaMessage.caption || "";

            // 🚀 Send Media Status with broadcast: true and full JID list
            await sock.sendMessage('status@broadcast', { 
                [messageType]: buffer, 
                caption: caption,
                contextInfo: {
                    statusJidList: jidList
                }
            }, { 
                statusJidList: jidList,
                broadcast: true
            });

            await sock.sendMessage(from, { text: `✅ Media status uploaded successfully! Shared with ${jidList.length} contacts.` }, { quoted: msg });
            await sock.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});

        } else if (text) {
            // --- Handle Text Status ---
            // 🚀 Send Text Status with broadcast: true and styling
            await sock.sendMessage('status@broadcast', { 
                text: text,
                backgroundColor: '#313432',
                font: 1,
                contextInfo: {
                    statusJidList: jidList
                }
            }, { 
                statusJidList: jidList,
                broadcast: true
            });

            // Also update the profile "About" text
            await sock.updateProfileStatus(text).catch(() => {});

            await sock.sendMessage(from, { text: `✅ Status updated successfully! Shared with ${jidList.length} contacts.` }, { quoted: msg });
            await sock.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});

        } else {
            return sock.sendMessage(from, { 
                text: "❓ Please provide text or reply to an image/video.\n\n*Usage:*\n1. `.setstatus My Text Status` \n2. Reply to an image/video with `.setstatus Optional Caption`" 
            }, { quoted: msg });
        }

    } catch (err) {
        console.error("Error in setstatus command:", err);
        await sock.sendMessage(from, { 
            text: "❌ Failed to upload status: " + (err.message || "Unknown error") 
        }, { quoted: msg });
        await sock.sendMessage(from, { react: { text: "❌", key: msg.key } }).catch(() => {});
    }
};
