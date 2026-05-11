// lib/small_lib/anti/antibadword.js
// AntiBadWord core: stable file I/O + add/del/store funcs

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../../../data");
const CONFIG_FILE = path.join(DATA_DIR, "antibadword_config.json");
const WARN_FILE = path.join(DATA_DIR, "antibadword_warns.json");
const BADWORDS_FILE = path.join(DATA_DIR, "badwords.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const readJSON = (file, fallback = null) => {
  try {
    if (!fs.existsSync(file)) return fallback === null ? {} : fallback;
    const raw = fs.readFileSync(file, "utf8");
    return raw ? JSON.parse(raw) : (fallback === null ? {} : fallback);
  } catch (e) {
    console.error("[AntiBadWord] readJSON failed:", e.message);
    return fallback === null ? {} : fallback;
  }
};
const writeJSON = (file, data) => {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (e) {
    console.error("[AntiBadWord] writeJSON failed:", e.message);
    return false;
  }
};

/* ========== Config ========== */
function getGroupMode(gid) {
  const cfg = readJSON(CONFIG_FILE, {});
  return cfg[gid] || { delete: true, warn: false, kick: false };
}
function setGroupMode(gid, newCfg = {}) {
  const cfg = readJSON(CONFIG_FILE, {});
  cfg[gid] = { ...(cfg[gid] || {}), ...newCfg };
  writeJSON(CONFIG_FILE, cfg);
  return cfg[gid];
}

/* ========== Warns ========== */
let warnCache = readJSON(WARN_FILE, {});
function saveWarns() { writeJSON(WARN_FILE, warnCache); }
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

/* ========== Badwords list ========== */
function getBadWords() {
  const arr = readJSON(BADWORDS_FILE, []);
  if (!Array.isArray(arr)) return [];
  return arr.map(w => String(w).toLowerCase());
}
function addBadWord(word) {
  if (!word || typeof word !== "string") return false;
  const cleaned = word.trim().toLowerCase();
  if (!cleaned) return false;
  const arr = getBadWords();
  if (!arr.includes(cleaned)) {
    arr.push(cleaned);
    writeJSON(BADWORDS_FILE, arr);
    return true;
  }
  return false; // already present
}
function delBadWord(word) {
  if (!word || typeof word !== "string") return false;
  const cleaned = word.trim().toLowerCase();
  let arr = getBadWords();
  const before = arr.length;
  arr = arr.filter(w => w !== cleaned);
  writeJSON(BADWORDS_FILE, arr);
  return arr.length !== before;
}

/* ========== Detection ========== */
function containsBadWord(text = "") {
  if (!text) return false;
  const all = new Set(getBadWords().concat([
    "fuck","bitch","asshole","dick","cunt","slut","nude","porn"
  ]));
  const txt = String(text).toLowerCase();
  for (const w of all) {
    if (!w) continue;
    const re = new RegExp(`\\b${w.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i");
    if (re.test(txt)) return true;
  }
  return false;
}

/* ========== Handler ========== */
async function handleAntiBadWord(sock, msg, from, sender, isAdmin) {
  try {
    if (!from.endsWith("@g.us")) return;
    if (isAdmin || msg.key.fromMe) return;

    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      msg.message?.videoMessage?.caption ||
      "";

    if (!containsBadWord(text)) return;

    const cfg = getGroupMode(from);
    let acted = false;

    if (cfg.delete) {
      await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
      acted = true;
    }

    if (cfg.warn) {
      const count = addWarn(from, sender);
      await sock.sendMessage(from, {
        text: `⚠️ *Warning!* @${sender.split("@")[0]}\nUsing bad words is not allowed.\n📊 *Warn Count:* ${count} / 3`,
        mentions: [sender],
      });
      if (count >= 3 && cfg.kick) {
        await sock.sendMessage(from, {
          text: `🚫 @${sender.split("@")[0]} has been removed (3 warns).`,
          mentions: [sender],
        }).catch(() => {});
        await sock.groupParticipantsUpdate(from, [sender], "remove").catch(() => {});
        resetWarns(from, sender);
      }
      acted = true;
    }

    if (!cfg.warn && cfg.kick) {
      await sock.sendMessage(from, {
        text: `🚨 Bad word detected — removing @${sender.split("@")[0]}`,
        mentions: [sender],
      }).catch(() => {});
      await sock.groupParticipantsUpdate(from, [sender], "remove").catch(() => {});
      acted = true;
    }

    if (!acted) {
      await sock.sendMessage(from, {
        text: `⚙️ AntiBadWord detected bad language from @${sender.split("@")[0]}, but no action configured.`,
        mentions: [sender],
      });
    }
  } catch (e) {
    console.error("[AntiBadWord] handler error:", e);
  }
}

module.exports = {
  handleAntiBadWord,
  getGroupMode,
  setGroupMode,
  addBadWord,
  delBadWord,
  addWarn,
  resetWarns,
  getBadWords
};
