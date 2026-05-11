const fs = require("fs");
const path = require("path");
let settings;
try {
  settings = require("./settings");
} catch {
  try { settings = require("../settings"); } catch { settings = require("../../settings"); }
}

const { isPairedOwner } = require("../../lib/guards");

module.exports = async (sock, msg, from, text, args) => {
    try {
      const isOwner = await isPairedOwner(sock, msg);
      
      if (!isOwner) {
        return sock.sendMessage(from, { text: "❌ Only the bot owner can use this command." }, { quoted: msg });
      }

      const newPrefix = args[0];
      if (!newPrefix) {
        return sock.sendMessage(from, { text: "⚠️ Please provide a new prefix (e.g., `.setprefix !`)" }, { quoted: msg });
      }

      const settingsPath = path.join(process.cwd(), "settings.js");
      let settingsContent = fs.readFileSync(settingsPath, "utf8");

      const regex = /prefix:\s*['"`](.*?)['"`]/;
      settingsContent = settingsContent.replace(regex, `prefix: "${newPrefix}"`);

      fs.writeFileSync(settingsPath, settingsContent);

      await sock.sendMessage(from, { text: `✅ Prefix has been updated to: *${newPrefix}*\n\n_Note: It will take effect after the next restart._` }, { quoted: msg });

    } catch (err) {
      console.error("❌ Error in setprefix:", err.message);
      await sock.sendMessage(from, { text: "⚠️ Failed to update prefix." }, { quoted: msg });
    }
};
