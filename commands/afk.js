const fs = require("fs");
const path = require("path");

let afkManager;
try {
  afkManager = require("../lib/afkManager");
} catch (e) {
  console.error("AFK Manager not loaded:", e.message);
}

module.exports = async (sock, msg, from, text, args = []) => {
  if (!afkManager) {
    return await sock.sendMessage(from, { text: "❌ AFK Manager is missing." }, { quoted: msg });
  }

  const sender = msg.key.participant || msg.key.remoteJid;
  const reason = args.join(" ").trim() || "Busy";

  afkManager.addAfk(sender, reason);

  await sock.sendMessage(
    from,
    { text: `😴 You are now AFK.\n📌 Reason: ${reason}\n\n_Your AFK status will be removed automatically when you send a message._` },
    { quoted: msg }
  );
};
