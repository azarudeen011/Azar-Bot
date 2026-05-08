const { isPairedOwner } = require("../lib/guards");

module.exports = async (sock, msg, from, text, args) => {
  if (!(await isPairedOwner(sock, msg))) {
    return sock.sendMessage(from, { text: "❌ This command is only for the bot owner." }, { quoted: msg });
  }

  const bioText = args.join(" ");
  if (!bioText) {
    return sock.sendMessage(from, { text: "❓ Please provide the bio text.\nUsage: `.setbio Hello world`" }, { quoted: msg });
  }

  try {
    await sock.updateProfileStatus(bioText);
    await sock.sendMessage(from, { text: `✅ Bio successfully updated to:\n\n"${bioText}"` }, { quoted: msg });
  } catch (err) {
    console.error("Error in setbio command:", err);
    await sock.sendMessage(from, { text: "❌ Failed to update bio. " + (err.message || "") }, { quoted: msg });
  }
};
