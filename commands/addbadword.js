// commands/addbadword.js
const antiBad = require("../lib/small_lib/anti/antibadword");
const settings = require("../settings");

module.exports = async (sock, msg, from, text, args) => {
  try {
    if (!from.endsWith("@g.us")) {
      return await sock.sendMessage(from, { text: "❌ This command works only in groups." }, { quoted: msg });
    }

    const metadata = await sock.groupMetadata(from);
    const sender = msg.key.participant || msg.key.remoteJid || msg.participant;
    const admins = metadata.participants.filter(p => p.admin).map(p => p.id);
    const isAdmin = admins.includes(sender) || msg.key.fromMe;

    if (!isAdmin) return await sock.sendMessage(from, { text: "❌ Only group admins can add bad words." }, { quoted: msg });

    const word = args.join(" ").trim();
    if (!word) return await sock.sendMessage(from, { text: "❗ Usage: .addbadword <word>" }, { quoted: msg });

    const ok = antiBad.addBadWord(word);
    if (ok) return await sock.sendMessage(from, { text: `✅ Added bad word: *${word}*` }, { quoted: msg });
    return await sock.sendMessage(from, { text: `⚠️ Word already exists: *${word}*` }, { quoted: msg });

  } catch (e) {
    console.error(".addbadword error:", e);
    await sock.sendMessage(from, { text: `⚠️ Error: ${e.message}` }, { quoted: msg });
  }
};
