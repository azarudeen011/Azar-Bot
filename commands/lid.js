// ==============================================
// 🆔 Azahrabot LID Command
// Returns the unique Long-term Identifier (LID) of a user
// ==============================================

module.exports = async (sock, msg, from, text, args) => {
  try {
    // 1. Get potential targets from message context
    const context = msg.message?.extendedTextMessage?.contextInfo || {};
    const quotedSender = context.participant;
    const mentionedJid = context.mentionedJid?.[0];
    const currentSender = msg.key.participant || msg.key.remoteJid || "";

    // 2. Resolve target (Priority: Quoted > Mentioned > Sender)
    let targetJid = quotedSender || mentionedJid || currentSender;

    // 3. Search for LID
    // In recent Baileys, the LID might be in msg.key.participant while remoteJid is @s.whatsapp.net
    // Or it might be in msg.sender (if processed by smsg)
    
    let lid = null;

    // Check if target is already an LID
    if (targetJid && targetJid.endsWith("@lid")) {
      lid = targetJid;
    } else {
      // Look for any LID in the message object (sometimes Baileys includes it in different fields)
      // We check the raw message keys and values
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

      lid = searchForLid(msg);
    }

    if (lid) {
      const response = `🆔 *User LID:* \n\n${lid}\n\n_This is a permanent identifier separate from the phone number._`;
      await sock.sendMessage(from, { text: response }, { quoted: msg });
    } else {
      // If still no LID found, it might be because the user hasn't generated one or the session doesn't see it
      await sock.sendMessage(from, { 
        text: `❌ *LID Not Found*\n\nCould not retrieve a Long-term Identifier for this user. They may be using a standard phone number identity only.` 
      }, { quoted: msg });
    }

  } catch (err) {
    console.error("LID Command Error:", err);
    await sock.sendMessage(from, { text: "❌ Error retrieving LID." }, { quoted: msg });
  }
};
