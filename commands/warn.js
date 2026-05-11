// ==============================================
// ⚠️ Azahrabot Warn Command (v6.6 Stable)
// Gives user warnings — auto-kicks after 3
// Admin-only • Persistent Tracking • Group-based
// ==============================================

const fs = require("fs");
const path = require("path");
const settings = require("../settings");
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
      return await sock.sendMessage(from, { text: "❌ Only group admins can use .warn command." }, { quoted: msg });
    }

    // 🎯 Identify target
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const quotedUser = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const target = mentioned[0] || quotedUser;

    if (!target) {
      return await sock.sendMessage(from, {
        text: "⚠️ Please *mention or reply* to a member to warn.\n\nExample:\n.warn @user",
      }, { quoted: msg });
    }

    // 🧾 Load warning data
    const data = loadWarnings();
    if (!data[from]) data[from] = {};
    if (!data[from][target]) data[from][target] = 0;

    data[from][target] += 1;
    saveWarnings(data);

    const warns = data[from][target];
    const limit = 3;

    // 🟡 Send warning message
    const text = `
⚠️ *Warning Issued!*
────────────────────
👤 *User:* @${target.split("@")[0]}
⚠️ *Warnings:* ${warns}/${limit}
👑 *By:* @${sender.split("@")[0]}
────────────────────
> powered by *${secure.author || "AzarTech"}* ⚡
`.trim();

    await sock.sendMessage(from, { text, mentions: [target, sender] }, { quoted: msg });

    // 🔥 Auto kick if 3 warnings
    if (warns >= limit) {
      try {
        await sock.groupParticipantsUpdate(from, [target], "remove");

        await sock.sendMessage(from, {
          text: `
🚫 *User Auto-Kicked!*
────────────────────
👤 *User:* @${target.split("@")[0]}
💥 *Reason:* Exceeded ${limit} warnings.
────────────────────
> powered by *${secure.author || "AzarTech"}* ⚡
          `.trim(),
          mentions: [target],
        });

        // reset their warnings after kick
        delete data[from][target];
        saveWarnings(data);

      } catch (e) {
        console.error("Kick failed:", e);
        await sock.sendMessage(from, { text: "⚠️ Failed to kick user, check my admin rights." });
      }
    }

  } catch (err) {
    console.error("❌ .warn error:", err);
    await sock.sendMessage(from, {
      text: `⚠️ Failed to issue warning.\nError: ${err.message}`,
    }, { quoted: msg });
  }
};
