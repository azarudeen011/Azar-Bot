// ==============================================
// 💫 Azahrabot AntiSticker System (v2.2 Fixed)
// Deletes all sticker messages instantly when enabled
// Works with all Baileys versions
// ==============================================

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../../../data");
const CONFIG_FILE = path.join(DATA_DIR, "antisticker_config.json");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

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

function getGroupMode(gid) {
  const data = readJSON(CONFIG_FILE);
  return data[gid] || { enabled: false };
}

function setGroupMode(gid, state) {
  const data = readJSON(CONFIG_FILE);
  data[gid] = { enabled: state };
  writeJSON(CONFIG_FILE, data);
  return data[gid];
}

function isStickerMessage(msg) {
  if (!msg || !msg.message) return false;
  // handle standard sticker
  if (msg.message.stickerMessage) return true;

  // handle viewOnce sticker (rare)
  if (msg.message.viewOnceMessageV2?.message?.stickerMessage) return true;

  // handle quoted sticker inside reply (fallback)
  const ctx = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
  if (ctx && (ctx.stickerMessage || ctx.viewOnceMessageV2?.message?.stickerMessage)) return true;

  return false;
}

async function handleAntiSticker(sock, msg, from, sender, isAdmin) {
  try {
    if (!from.endsWith("@g.us")) return;
    if (isAdmin || msg.key.fromMe) return;

    const state = getGroupMode(from);
    if (!state.enabled) return;

    if (isStickerMessage(msg)) {
      console.log(`[AntiSticker] Detected sticker from ${sender} in ${from}`);
      await sock.sendMessage(from, { delete: msg.key }).catch(err => {
        console.log("AntiSticker delete failed:", err.message);
      });
    }
  } catch (err) {
    console.error("AntiSticker error:", err);
  }
}

module.exports = {
  handleAntiSticker,
  getGroupMode,
  setGroupMode,
};
