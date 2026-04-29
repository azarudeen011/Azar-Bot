// ==============================================
// 🧹 Azahrabot — .clearsession Command (v3.0)
// Safely clears stale session cache files
// Keeps creds.json + app-state-sync-key intact
// ==============================================

const fs = require("fs");
const path = require("path");
const settings = require("../settings");

const { isPairedOwner } = require("../lib/guards");

module.exports = async (sock, msg, from) => {
  try {
    const isOwner = isPairedOwner(msg);

    if (!isOwner) {
      return await sock.sendMessage(from, { text: "❌ This command is only for the owner!" }, { quoted: msg });
    }

    // Target the actual session directory with files
    const sessionDir = path.join(process.cwd(), ".auth", "session_default");

    if (!fs.existsSync(sessionDir)) {
      return await sock.sendMessage(from, { text: "ℹ️ Session directory not found." }, { quoted: msg });
    }

    // Files/patterns to KEEP (critical for staying logged in)
    const keepPatterns = ["creds.json"];

    // Files/patterns to CLEAN (stale cache that causes Bad MAC errors)
    const cleanPatterns = ["sender-key-", "session-", "pre-key-", "app-state-sync-version-"];

    let cleaned = 0;
    let skipped = 0;

    const entries = fs.readdirSync(sessionDir);

    for (const entry of entries) {
      const fullPath = path.join(sessionDir, entry);

      // Skip directories
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        skipped++;
        continue;
      }

      // Always keep critical files
      if (keepPatterns.some(p => entry === p || entry.startsWith("app-state-sync-key"))) {
        skipped++;
        continue;
      }

      // Clean known stale cache patterns
      if (cleanPatterns.some(p => entry.startsWith(p))) {
        try {
          fs.unlinkSync(fullPath);
          cleaned++;
        } catch {
          skipped++;
        }
        continue;
      }

      // For any other files, leave them (safe default)
      skipped++;
    }

    await sock.sendMessage(from, {
      text:
        `✅ *Session Cleanup Complete*\n\n` +
        `🗑️ Removed: ${cleaned} stale cache files\n` +
        `🔒 Kept: ${skipped} essential files\n\n` +
        `_Restart the bot for changes to take effect._\n\n` +
        `> Powered by Azar Tech ⚡`
    }, { quoted: msg });

  } catch (err) {
    console.error("❌ Error in clearsession:", err.message);
    await sock.sendMessage(from, { text: "⚠️ Failed to clear session cache: " + err.message }, { quoted: msg });
  }
};
