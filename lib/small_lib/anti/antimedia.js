// ==============================================
// 📸 Azahrabot Anti-Media (v6.0 Stable)
// Deletes / Warns / Kicks users who send any media
// ==============================================

const fs = require("fs");
const path = require("path");

// 📁 Storage paths
const DATA_DIR = path.join(__dirname, "../../../data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const CONFIG_FILE = path.join(DATA_DIR, "antimedia_config.json");
const WARN_FILE = path.join(DATA_DIR, "antimedia_warns.json");

// ===== JSON Helpers =====
function readJSON(file) {
  try {
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ===== Config Management =====
function getGroupMode(gid) {
  const data = readJSON(CONFIG_FILE);
  return data[gid] || { mode: "off" };
}
function setGroupMode(gid, mode) {
  const data = readJSON(CONFIG_FILE);
  data[gid] = { mode };
  writeJSON(CONFIG_FILE, data);
  return mode;
}

// ===== Warn System =====
function addWarn(gid, user) {
  const data = readJSON(WARN_FILE);
  if (!data[gid]) data[gid] = {};
  if (!data[gid][user]) data[gid][user] = 0;
  data[gid][user]++;
  writeJSON(WARN_FILE, data);
  return data[gid][user];
}
function resetWarn(gid, user) {
  const data = readJSON(WARN_FILE);
  if (data[gid]?.[user]) delete data[gid][user];
  writeJSON(WARN_FILE, data);
}

// ===== MAIN HANDLER =====
async function handleAntiMedia(sock, msg, from, sender, isAdmin) {
  try {
    if (!from.endsWith("@g.us")) return;

    const { mode } = getGroupMode(from);
    if (mode === "off" || !mode) return;
    if (isAdmin || msg.key.fromMe) return;

    // Detect media messages
    const hasMedia =
      msg.message?.imageMessage ||
      msg.message?.videoMessage ||
      msg.message?.stickerMessage ||
      msg.message?.audioMessage ||
      msg.message?.documentMessage ||
      msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage ||
      msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage;

    if (!hasMedia) return;

    console.log(`🧩 [AntiMedia] Triggered in ${from} | Mode: ${mode}`);

    // 🚫 Action modes
    if (mode === "delete") {
      await sock.sendMessage(from, { delete: msg.key });
      await sock.sendMessage(from, {
        text: `🚫 Media message deleted automatically.`,
      });
    } else if (mode === "warn") {
      const warns = addWarn(from, sender);
      await sock.sendMessage(from, {
        text: `⚠️ *AntiMedia Warning!*\n👤 @${sender.split("@")[0]}\n📊 Warns: ${warns}/3`,
        mentions: [sender],
      });

      if (warns >= 3) {
        await sock.groupParticipantsUpdate(from, [sender], "remove");
        resetWarn(from, sender);
        await sock.sendMessage(from, {
          text: `🚨 @${sender.split("@")[0]} was removed for sending media repeatedly.`,
          mentions: [sender],
        });
      }
    } else if (mode === "kick") {
      await sock.groupParticipantsUpdate(from, [sender], "remove");
      await sock.sendMessage(from, {
        text: `🚷 @${sender.split("@")[0]} was kicked for sending media.`,
        mentions: [sender],
      });
    }
  } catch (err) {
    console.error("❌ AntiMedia error:", err);
  }
}

module.exports = {
  handleAntiMedia,
  getGroupMode,
  setGroupMode,
  resetWarn,
};
