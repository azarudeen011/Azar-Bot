// ==============================================
// 🚨 Azahrabot AntiTag System (v3.0 — Stable Build)
// Detects .tagall / .tag usage and auto deletes
// Works with warn + kick system like AntiLink
// ==============================================

const fs = require("fs");
const path = require("path");

// 🗂 Data Files
const DATA_DIR = path.join(__dirname, "../../../data");
const CONFIG_FILE = path.join(DATA_DIR, "antitag_config.json");
const WARN_FILE = path.join(DATA_DIR, "antitag_warns.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// JSON Helpers
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

// ⚙️ Config System
function getGroupMode(gid) {
  const cfg = readJSON(CONFIG_FILE);
  return cfg[gid] || { delete: true, warn: false, kick: false };
}
function setGroupMode(gid, newCfg = {}) {
  const cfg = readJSON(CONFIG_FILE);
  cfg[gid] = { ...(cfg[gid] || {}), ...newCfg };
  writeJSON(CONFIG_FILE, cfg);
  return cfg[gid];
}

// ⚠️ Warn System
let warnCache = readJSON(WARN_FILE);
function saveWarns() {
  writeJSON(WARN_FILE, warnCache);
}
function addWarn(gid, uid) {
  if (!warnCache[gid]) warnCache[gid] = {};
  warnCache[gid][uid] = (warnCache[gid][uid] || 0) + 1;
  saveWarns();
  return warnCache[gid][uid];
}
function resetWarns(gid, uid = null) {
  if (!warnCache[gid]) warnCache[gid] = {};
  if (uid) delete warnCache[gid][uid];
  else warnCache[gid] = {};
  saveWarns();
}

// 🧩 Detection Function
function containsTagCommand(text = "") {
  const lowered = text.toLowerCase();
  return (
    lowered.startsWith(".tagall") ||
    lowered.startsWith(".tag ") ||
    lowered.includes("tag all") ||
    lowered.includes("@everyone")
  );
}

// 🚨 Handler
async function handleAntiTag(sock, msg, from, sender, isAdmin) {
  try {
    if (!from.endsWith("@g.us")) return;
    if (isAdmin || msg.key.fromMe) return;

    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      "";

    if (!containsTagCommand(text)) return;

    const cfg = getGroupMode(from);
    let acted = false;

    // 🗑️ Delete
    if (cfg.delete) {
      await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
      acted = true;
    }

    // ⚠️ Warn
    if (cfg.warn) {
      const count = addWarn(from, sender);
      await sock.sendMessage(from, {
        text: `⚠️ *Warning!* @${sender.split("@")[0]} — tagging everyone is not allowed!\n📊 *Warn Count:* ${count} / 3`,
        mentions: [sender],
      });

      // 🚫 Auto Kick if 3 warns + kick enabled
      if (count >= 3 && cfg.kick) {
        await sock.sendMessage(from, {
          text: `🚫 *User Removed Automatically*\n@${sender.split("@")[0]} reached 3 warnings for tag misuse.`,
          mentions: [sender],
        });
        await sock.groupParticipantsUpdate(from, [sender], "remove").catch(() => {});
        resetWarns(from, sender);
      }
      acted = true;
    }

    // 🚷 Kick Only
    if (!cfg.warn && cfg.kick) {
      await sock.sendMessage(from, {
        text: `🚨 *Tag Detected!* @${sender.split("@")[0]} removed instantly for using tag commands.`,
        mentions: [sender],
      });
      await sock.groupParticipantsUpdate(from, [sender], "remove").catch(() => {});
      acted = true;
    }

    // ℹ️ No Configured Action
    if (!acted) {
      await sock.sendMessage(from, {
        text: `⚙️ AntiTag detected @${sender.split("@")[0]} used tag commands, but no action is configured.\nUse .antitag delete|warn|kick on/off.`,
        mentions: [sender],
      });
    }
  } catch (e) {
    console.error("AntiTag handler error:", e);
  }
}

// 📤 Exported Functions
module.exports = {
  handleAntiTag,
  getGroupMode,
  setGroupMode,
  addWarn,
  resetWarns,
};
