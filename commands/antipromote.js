const { getConfig, setConfig, PROMOTE_FILE } = require("../lib/small_lib/anti/promotedemote");
const { isSudo } = require("../lib/guards");

module.exports = async (sock, msg, from, text, args) => {
  try {
    if (!from.endsWith("@g.us")) return sock.sendMessage(from, { text: "❌ This command is only for groups." }, { quoted: msg });

    const isSudoUser = await isSudo(sock, msg);
    if (!isSudoUser && !msg.key.fromMe) {
      return sock.sendMessage(from, { text: "❌ Only the bot owner can use this command." }, { quoted: msg });
    }

    const config = getConfig(PROMOTE_FILE);
    if (!config[from]) config[from] = { kick: false, warn: false, silent: false };

    const mode = args[0]?.toLowerCase(); // kick, warn, silent
    const state = args[1]?.toLowerCase(); // on, off

    if (!mode || !["kick", "warn", "silent"].includes(mode)) {
      return sock.sendMessage(from, { 
        text: `🛡️ *Anti-Promote System*\n\nIf anyone tries to make someone an admin, both will be demoted. Choose the extra penalty:\n\n• \`.antipromote kick on/off\`\n• \`.antipromote warn on/off\`\n• \`.antipromote silent on/off\`` 
      }, { quoted: msg });
    }

    if (state === "on") {
      config[from] = { kick: false, warn: false, silent: false }; // reset others
      config[from][mode] = true;
      setConfig(PROMOTE_FILE, config);
      return sock.sendMessage(from, { text: `✅ Anti-Promote *${mode}* mode has been enabled.` }, { quoted: msg });
    } else if (state === "off") {
      config[from][mode] = false;
      setConfig(PROMOTE_FILE, config);
      return sock.sendMessage(from, { text: `✅ Anti-Promote *${mode}* mode has been disabled.` }, { quoted: msg });
    } else {
      return sock.sendMessage(from, { text: `❌ Use 'on' or 'off'. Example: \`.antipromote ${mode} on\`` }, { quoted: msg });
    }
  } catch (err) {
    console.error("AntiPromote command error:", err);
    await sock.sendMessage(from, { text: `⚠️ Error: ${err.message}` }, { quoted: msg });
  }
};
