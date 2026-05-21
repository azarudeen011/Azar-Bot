const { getConfig, setConfig, DEMOTE_FILE } = require("../lib/small_lib/anti/promotedemote");
const { isSudo } = require("../lib/guards");

module.exports = async (sock, msg, from, text, args) => {
  try {
    if (!from.endsWith("@g.us")) return sock.sendMessage(from, { text: "❌ This command is only for groups." }, { quoted: msg });

    const isSudoUser = await isSudo(sock, msg);
    if (!isSudoUser && !msg.key.fromMe) {
      return sock.sendMessage(from, { text: "❌ Only the bot owner can use this command." }, { quoted: msg });
    }

    const config = getConfig(DEMOTE_FILE);
    if (!config[from]) config[from] = { kick: false, warn: false, silent: false };

    const mode = args[0]?.toLowerCase(); // kick, warn, silent
    const state = args[1]?.toLowerCase(); // on, off

    if (!mode || !["kick", "warn", "silent"].includes(mode)) {
      return sock.sendMessage(from, { 
        text: `🛡️ *Anti-Demote System*\n\nIf anyone tries to demote an admin, the offender will be demoted and victims restored. Choose extra penalty:\n\n• \`.antidemote kick on/off\`\n• \`.antidemote warn on/off\`\n• \`.antidemote silent on/off\`` 
      }, { quoted: msg });
    }

    if (state === "on") {
      config[from] = { kick: false, warn: false, silent: false }; // reset others
      config[from][mode] = true;
      setConfig(DEMOTE_FILE, config);
      return sock.sendMessage(from, { text: `✅ Anti-Demote *${mode}* mode has been enabled.` }, { quoted: msg });
    } else if (state === "off") {
      config[from][mode] = false;
      setConfig(DEMOTE_FILE, config);
      return sock.sendMessage(from, { text: `✅ Anti-Demote *${mode}* mode has been disabled.` }, { quoted: msg });
    } else {
      return sock.sendMessage(from, { text: `❌ Use 'on' or 'off'. Example: \`.antidemote ${mode} on\`` }, { quoted: msg });
    }
  } catch (err) {
    console.error("AntiDemote command error:", err);
    await sock.sendMessage(from, { text: `⚠️ Error: ${err.message}` }, { quoted: msg });
  }
};
