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

const { isPairedOwner } = require("../lib/guards");

module.exports = async (sock, msg, from, text, args) => {
  const isOwner = await isPairedOwner(sock, msg);

  const mode = getMode();
  const newMode = args[0]?.toLowerCase();

  // 🔧 Restrict command usage
  if (!isOwner) {
    await sock.sendMessage(
      from,
      { text: "❌ Only the bot owner can access this command." },
      { quoted: msg }
    );
    return;
  }

  // 🧾 Show current mode (no args)
  if (!newMode) {
    const caption = `
⚙️ *${secure.botName} Mode Status*
━━━━━━━━━━━━━━━━━━━
📢 *Current Mode:* ${mode.toUpperCase()}

🪄 *Options:*
• public → everyone can use commands
• private → only owner (in DM & groups)
━━━━━━━━━━━━━━━━━━━
💡 Example:
.mode public
.mode private
━━━━━━━━━━━━━━━━━━━
> powered by *${secure.author} ⚡*
    `.trim();

    await sock.sendMessage(from, { text: caption }, { quoted: msg });
    return;
  }

  // 🛑 Validate mode type
  if (!["public", "private"].includes(newMode)) {
    await sock.sendMessage(
      from,
      { text: "⚙️ Invalid mode.\nUse `.mode public` or `.mode private`" },
      { quoted: msg }
    );
    return;
  }

  // 💾 Save mode & confirm
  setMode(newMode);
  console.log(`🟢 Mode switched to: ${newMode.toUpperCase()}`);

  const confirm = `
✅ *${secure.botName} Mode Updated Successfully!*
━━━━━━━━━━━━━━━━━━━
🆕 *Now Operating In:* ${newMode.toUpperCase()}
━━━━━━━━━━━━━━━━━━━
> ${secure.botName} is now in *${newMode}* mode.
  `.trim();

  await sock.sendMessage(from, { text: confirm }, { quoted: msg });
};
