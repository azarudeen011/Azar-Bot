// ==============================================
// ⚙️ Azahrabot AntiBadWord Command (v3.0)
// Allows admin to toggle, add, and delete bad words
// ==============================================

const antiBad = require("../lib/small_lib/anti/antibadword");
const secure = require("../lib/small_lib");

module.exports = async (sock, msg, from, text, args) => {
  try {
    if (!from.endsWith("@g.us"))
      return sock.sendMessage(from, { text: "❌ This command works only in groups." }, { quoted: msg });

    const metadata = await sock.groupMetadata(from);
    const sender = msg.key.participant || msg.key.remoteJid;
    const admins = metadata.participants.filter(p => p.admin).map(p => p.id);
    const isAdmin = admins.includes(sender) || msg.key.fromMe;

    if (!isAdmin)
      return sock.sendMessage(from, { text: "❌ Only admins can use AntiBadWord settings." }, { quoted: msg });

    const action = (args[0] || "").toLowerCase();
    const value = (args[1] || "").toLowerCase();

    // ✅ Show help
    if (!["delete", "warn", "kick", "status", "add", "del"].includes(action)) {
      const msgText = `
⚙️ *AntiBadWord Configuration*
━━━━━━━━━━━━━━━━━━━
🗑️ delete → auto delete bad words  
⚠️ warn → warn users who send bad words  
🚫 kick → instant kick after detection  
➕ add <word> → add bad word  
➖ del <word> → remove word  
📊 status → view current config  
━━━━━━━━━━━━━━━━━━━
💡 Example:
.antibadword delete on  
.antibadword warn on  
.addbadword idiot  
.delbadword idiot  
━━━━━━━━━━━━━━━━━━━
> powered by *${secure.author} ⚡*
      `.trim();
      return sock.sendMessage(from, { text: msgText }, { quoted: msg });
    }

    // 🔹 Add / Delete Bad Words
    if (action === "add") {
      const word = args.slice(1).join(" ").toLowerCase();
      if (!word) return sock.sendMessage(from, { text: "❗ Specify a word to add." }, { quoted: msg });
      antiBad.addBadWord(word);
      return sock.sendMessage(from, { text: `✅ Added bad word: *${word}*` }, { quoted: msg });
    }

    if (action === "del") {
      const word = args.slice(1).join(" ").toLowerCase();
      if (!word) return sock.sendMessage(from, { text: "❗ Specify a word to remove." }, { quoted: msg });
      antiBad.delBadWord(word);
      return sock.sendMessage(from, { text: `✅ Removed bad word: *${word}*` }, { quoted: msg });
    }

    // 📊 Show status
    if (action === "status") {
      const cfg = antiBad.getGroupMode(from);
      const msgTxt = `
📊 *AntiBadWord Status*
━━━━━━━━━━━━━━━━━━━
🗑️ Delete: ${cfg.delete ? "✅ ON" : "❌ OFF"}
⚠️ Warn: ${cfg.warn ? "✅ ON" : "❌ OFF"}
🚫 Kick: ${cfg.kick ? "✅ ON" : "❌ OFF"}
━━━━━━━━━━━━━━━━━━━
> powered by *${secure.author} ⚡*
      `.trim();
      return sock.sendMessage(from, { text: msgTxt }, { quoted: msg });
    }

    // ⚙️ Toggle modes
    const newValue = value === "on";
    antiBad.setGroupMode(from, { [action]: newValue });
    await sock.sendMessage(from, {
      text: `✅ *AntiBadWord Updated!*\n\n🔧 ${action.toUpperCase()} → ${newValue ? "ON ✅" : "OFF ❌"}`,
    }, { quoted: msg });
  } catch (err) {
    console.error("❌ .antibadword error:", err);
    await sock.sendMessage(from, { text: `⚠️ Command failed: ${err.message}` }, { quoted: msg });
  }
};
