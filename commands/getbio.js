const { isPairedOwner } = require("../lib/guards");

module.exports = async (sock, msg, from) => {
  if (!(await isPairedOwner(sock, msg))) {
    return sock.sendMessage(from, { text: "❌ This command is only for the bot owner." }, { quoted: msg });
  }

  try {
    // We fetch the status of the bot itself
    const botJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";
    const status = await sock.fetchStatus(botJid);
    
    if (status && status.status) {
      await sock.sendMessage(from, { text: `📝 *Current Bio:* \n\n${status.status}` }, { quoted: msg });
    } else {
      await sock.sendMessage(from, { text: "❌ Could not fetch bio or bio is empty." }, { quoted: msg });
    }
  } catch (err) {
    console.error("Error in getbio command:", err);
    await sock.sendMessage(from, { text: "❌ Failed to fetch bio. " + (err.message || "") }, { quoted: msg });
  }
};
