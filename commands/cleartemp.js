// ==============================================
// 🧹 Azahrabot ClearTemp Command (v5.1 Clean)
// Deletes temp + tmp files safely — owner only
// ==============================================

const fs = require("fs");
const path = require("path");

module.exports = async (sock, msg, from) => {
  try {
    // ✅ Restrict to bot owner only
    if (!msg.key.fromMe) {
      return await sock.sendMessage(from, { text: "❌ This command is only for the owner!" }, { quoted: msg });
    }

    // 🧠 Temp directories to clean
    const tempDirs = [
      path.join(process.cwd(), "temp"),
      path.join(process.cwd(), "tmp")
    ];

    let totalCleared = 0;
    let totalFailed = 0;

    for (const dir of tempDirs) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        try {
          const filePath = path.join(dir, file);
          const stat = fs.lstatSync(filePath);
          if (stat.isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(filePath);
          }
          totalCleared++;
        } catch (e) {
          totalFailed++;
          console.error(`Failed to delete unlockable file: ${file} -`, e.message);
        }
      }
    }

    // 🧾 Response message
    const message = `
🧹 *Temporary Files Cleanup Complete!*
━━━━━━━━━━━━━━━━━━━
🗂️ *Files Removed:* ${totalCleared}
⚠️ *Files Locked/Failed:* ${totalFailed > 0 ? totalFailed + " (Restart bot to unlock)" : 0}
⚙️ *Status:* Bot is running smoothly ✅
━━━━━━━━━━━━━━━━━━━
> powered by *AzarTech ⚡*
`.trim();

    await sock.sendMessage(from, { text: message }, { quoted: msg });

  } catch (err) {
    console.error("❌ Error in cleartemp:", err.message);
    await sock.sendMessage(from, { text: "⚠️ Failed to clear temp files. Try again later." }, { quoted: msg });
  }
};
