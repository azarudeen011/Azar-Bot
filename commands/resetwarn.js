// ==============================================
// 🔄 Azahrabot ResetWarn Command
// Resets user warnings
// Admin-only • Persistent Tracking • Group-based
// ==============================================

const fs = require("fs");
const path = require("path");
const secure = require("../lib/small_lib");

// ⚙️ Warning data storage
const dataFile = path.join(__dirname, "../data/warnings.json");
if (!fs.existsSync(path.dirname(dataFile))) fs.mkdirSync(path.dirname(dataFile), { recursive: true });
if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify({}, null, 2));

function loadWarnings() {
  try {
    return JSON.parse(fs.readFileSync(dataFile));
  } catch {
    return {};
  }
}

function saveWarnings(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

module.exports = async (sock, msg, from) => {
  try {
    // ✅ Ensure it's a group
    if (!from.endsWith("@g.us")) {
      return await sock.sendMessage(from, { text: "❌ This command can only be used in a group." }, { quoted: msg });
    }

    // 🧠 Fetch group metadata
    const metadata = await sock.groupMetadata(from);
    const participants = metadata.participants || [];
    const sender = msg.key.participant || msg.key.remoteJid;

    // 👑 Verify admin
    const admins = participants.filter(p => p.admin).map(p => p.id);
    const isAdmin = admins.includes(sender) || msg.key.fromMe;
    if (!isAdmin) {
      return await sock.sendMessage(from, { text: "❌ Only group admins can use .resetwarn command." }, { quoted: msg });
    }

    // 🎯 Identify target
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const quotedUser = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const target = mentioned[0] || quotedUser;

    if (!target) {
      return await sock.sendMessage(from, {
        text: "⚠️ Please *mention or reply* to a member to reset their warnings.\n\nExample:\n.resetwarn @user",
      }, { quoted: msg });
    }

    // 🧾 Load warning data
    const data = loadWarnings();
    if (!data[from]) data[from] = {};
    
    // Check if user has warnings
    if (!data[from][target] || data[from][target] === 0) {
      return await sock.sendMessage(from, {
        text: `✅ @${target.split("@")[0]} already has 0 warnings.`,
        mentions: [target]
      }, { quoted: msg });
    }

    // Reset warnings
    delete data[from][target];
    saveWarnings(data);

    // 🟡 Send success message
    const text = `
✅ *Warnings Reset!*
────────────────────
👤 *User:* @${target.split("@")[0]}
⚠️ *New Status:* 0/3 Warnings
👑 *By:* @${sender.split("@")[0]}
────────────────────
> powered by *${secure.author || "AzarTech"}* ⚡
`.trim();

    await sock.sendMessage(from, { text, mentions: [target, sender] }, { quoted: msg });

  } catch (err) {
    console.error("❌ .resetwarn error:", err);
    await sock.sendMessage(from, {
      text: `⚠️ Failed to reset warnings.\nError: ${err.message}`,
    }, { quoted: msg });
  }
};
