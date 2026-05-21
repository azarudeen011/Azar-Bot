// ==============================================
// 📢 Announcements Toggle Command
// Turns on/off group event announcements
// ==============================================

const fs = require("fs");
const path = require("path");
const { isSudo } = require("../lib/guards");

const CONFIG_PATH = path.join(__dirname, "../../data/announcements_config.json");

// Ensure config file exists
if (!fs.existsSync(CONFIG_PATH)) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({}));
}

module.exports = async (sock, msg, from, text, args) => {
  try {
    // 1. Ensure it's a group
    if (!from.endsWith("@g.us")) {
      return await sock.sendMessage(from, { text: "❌ This command can only be used in groups." }, { quoted: msg });
    }

    // 2. Admin/Sudo Check
    const sender = msg.key.participant || msg.key.remoteJid;
    const metadata = await sock.groupMetadata(from);
    const isSenderAdmin = metadata.participants.some(p => 
      (p.id === sender || (p.lid && p.lid === sender)) && 
      (p.admin === "admin" || p.admin === "superadmin" || !!p.admin)
    );
    const isSudoUser = await isSudo(sock, msg);

    if (!isSenderAdmin && !isSudoUser) {
      return await sock.sendMessage(from, { text: "❌ Only group admins can toggle announcements." }, { quoted: msg });
    }

    const action = args[0]?.toLowerCase();
    
    if (action !== "on" && action !== "off") {
      return await sock.sendMessage(from, {
        text: "📢 *Announcements Setup*\n\nUsage:\n.announcements on\n.announcements off\n\n_When enabled, I will announce all group changes (promotes, demotes, name/icon changes, etc)._"
      }, { quoted: msg });
    }

    // 3. Update config
    let config = {};
    try {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH));
    } catch (e) {}

    config[from] = (action === "on");
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

    await sock.sendMessage(from, {
      text: `✅ Group Announcements have been turned *${action.toUpperCase()}*.`
    }, { quoted: msg });

  } catch (error) {
    console.error("Announcements Toggle Error:", error);
    await sock.sendMessage(from, { text: "⚠️ Error setting announcements." }, { quoted: msg });
  }
};
