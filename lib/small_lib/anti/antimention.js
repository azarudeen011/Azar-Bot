// ==============================================
// ⚔️ Azahrabot AntiMention System (v1.0 Stable)
// Deletes messages that @mention users in group
// Includes delete, warn, kick modes • Admin-controlled
// ==============================================

const fs = require("fs");
const path = require("path");
const settingsPath = path.join(__dirname, "settings.json");

// 🧠 Load Settings
function getSettings() {
  if (!fs.existsSync(settingsPath))
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({ groups: {} }, null, 2)
    );
  return JSON.parse(fs.readFileSync(settingsPath));
}

// 💾 Save Settings
function saveSettings(data) {
  fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2));
}

// 🏷️ Manage Per-Group Modes
function setGroupMode(groupId, modeType, modeValue) {
  const data = getSettings();
  data.groups[groupId] = data.groups[groupId] || {};
  data.groups[groupId][modeType] = modeValue;
  saveSettings(data);
}

function getGroupMode(groupId, modeType) {
  const data = getSettings();
  return data.groups[groupId]?.[modeType] || "off";
}

// ⚠️ Warn System
function warnUser(groupId, userId) {
  const data = getSettings();
  data.groups[groupId] = data.groups[groupId] || {};
  data.groups[groupId].warns = data.groups[groupId].warns || {};
  const warns = (data.groups[groupId].warns[userId] || 0) + 1;
  data.groups[groupId].warns[userId] = warns;
  saveSettings(data);
  return warns;
}

function resetWarn(groupId, userId) {
  const data = getSettings();
  if (data.groups[groupId]?.warns?.[userId]) {
    delete data.groups[groupId].warns[userId];
    saveSettings(data);
  }
}

// 🚨 AntiMention Core
async function handleAntiMention(sock, msg, from, sender, isAdmin) {
  try {
    const groupMode = getGroupMode(from, "antimention") || "off";
    if (groupMode === "off") return;

    const message = msg.message || {};
    const mentionCtx =
      message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    if (!mentionCtx.length) return; // no mentions

    // Ignore admins and the bot itself
    if (isAdmin || msg.key.fromMe) return;

    console.log(`🚨 [AntiMention] Triggered in ${from} by ${sender}`);

    // Action by mode
    if (groupMode === "delete") {
      await sock.sendMessage(from, { delete: msg.key });
      await sock.sendMessage(from, {
        text: `⚠️ *Mention detected!*\n> Message from @${sender.split("@")[0]} deleted.`,
        mentions: [sender],
      });
    }

    if (groupMode === "warn") {
      const warns = warnUser(from, sender);
      await sock.sendMessage(from, {
        text: `⚠️ *Warning!* @${sender.split("@")[0]} mentioned someone.\n📛 Warn: ${warns}/3`,
        mentions: [sender],
      });
      if (warns >= 3) {
        await sock.groupParticipantsUpdate(from, [sender], "remove");
        resetWarn(from, sender);
        await sock.sendMessage(from, {
          text: `🚫 @${sender.split("@")[0]} has been *kicked* for repeated mentions.`,
          mentions: [sender],
        });
      }
    }

    if (groupMode === "kick") {
      await sock.groupParticipantsUpdate(from, [sender], "remove");
      await sock.sendMessage(from, {
        text: `🚫 @${sender.split("@")[0]} kicked for mentioning someone.`,
        mentions: [sender],
      });
    }
  } catch (err) {
    console.error("❌ AntiMention error:", err);
  }
}

module.exports = {
  handleAntiMention,
  setGroupMode,
  getGroupMode,
  warnUser,
  resetWarn
};
