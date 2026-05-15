// ==============================================
// ⚙️ Azahrabot Mode Command (v5.1 Synced Edition)
// Perfectly aligned with global handler
// ==============================================

const fs = require("fs");
const path = require("path");
const settings = require("../settings");
const secure = require("../lib/small_lib");

const dataFile = path.join(__dirname, "../data/botMode.json");

// 🗂 Ensure /data directory exists
if (!fs.existsSync(path.join(__dirname, "../data"))) {
  fs.mkdirSync(path.join(__dirname, "../data"), { recursive: true });
}

// 🧠 Load or initialize mode file
function getMode() {
  try {
    const data = JSON.parse(fs.readFileSync(dataFile));
    return data.mode || "public";
  } catch {
    return "public";
  }
}

// 💾 Save mode safely
function setMode(mode) {
  fs.writeFileSync(dataFile, JSON.stringify({ mode }, null, 2));
}

const { isSudo } = require("../lib/guards");

module.exports = async (sock, msg, from, text, args) => {
  const isOwner = await isSudo(sock, msg);

  // 🔧 Restrict command usage
  if (!isOwner) {
    return sock.sendMessage(from, { text: "❌ Only the bot owner or sudo users can access this command." }, { quoted: msg });
  }

  const mode = getMode();
  const newMode = args[0]?.toLowerCase();

  // 🧾 Show current mode (no args)
  if (!newMode) {
    let response = `╭━━━〔 ⚙️ ʙᴏᴛ ᴍᴏᴅᴇ 〕━━━⬣\n`;
    response += `┃\n`;
    response += `┃ 📢 *Current:* ${mode.toUpperCase()}\n`;
    response += `┃\n`;
    response += `┃ 🛠️ *Available Modes:*\n`;
    response += `┃ • \`.mode public\` (Everyone)\n`;
    response += `┃ • \`.mode private\` (Owner Only)\n`;
    response += `┃ • \`.mode groups\` (Authorized Only)\n`;
    response += `┃\n`;
    response += `┃ 💡 *Tip:* In 'Groups' mode, use\n`;
    response += `┃ \`.authorize\` in a group to allow it.\n`;
    response += `┃\n`;
    
    // Use global to check authorized groups if available
    if (mode === "groups") {
      const count = global.getAuthorizedGroupsCount ? global.getAuthorizedGroupsCount() : 0;
      response += `┃ 🏰 *Authorized Groups:* ${count}\n`;
    }
    
    response += `┃\n`;
    response += `╰━━━━━━━━━━━━━━━━━━━━━━⬣\n`;
    response += `> ✨ AzahraBot Management 🚀`;
    
    return sock.sendMessage(from, { text: response }, { quoted: msg });
  }

  // 🛑 Validate mode type
  if (!["public", "private", "groups"].includes(newMode)) {
    return sock.sendMessage(from, { text: "❌ Invalid mode! Use: \`.mode public\`, \`.mode private\`, or \`.mode groups\`" }, { quoted: msg });
  }

  // 💾 Save mode & confirm
  setMode(newMode);
  
  let statusMsg = "";
  if (newMode === "public") statusMsg = "🌍 Bot is now *Public* for all users.";
  if (newMode === "private") statusMsg = "🔒 Bot is now *Private* (Owner only).";
  if (newMode === "groups") statusMsg = "🏰 Bot is now in *Selective Public* mode.\n(Only authorized groups can use it).";

  return sock.sendMessage(from, { text: `✅ *MODE UPDATED*\n\n${statusMsg}` }, { quoted: msg });
};
