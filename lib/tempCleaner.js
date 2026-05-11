// lib/tempCleaner.js
// 🧹 Lightweight background temp cleaner
// Azahrabot by Azar Tech

const fs = require("fs");
const path = require("path");

const TEMP_DIR = path.join(process.cwd(), "temp");
const MAX_AGE = 3 * 60 * 60 * 1000; // 3 hours

function cleanupTempFiles() {
  try {
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
      return;
    }

    fs.readdir(TEMP_DIR, (err, files) => {
      if (err || !Array.isArray(files)) return;

      const now = Date.now();
      let cleaned = 0;

      for (const file of files) {
        const filePath = path.join(TEMP_DIR, file);
        fs.stat(filePath, (err, stats) => {
          if (err || !stats.isFile()) return;

          if (now - stats.mtimeMs > MAX_AGE) {
            fs.unlink(filePath, () => {});
            cleaned++;
          }
        });
      }

      if (cleaned > 0) {
        console.log(`🧹 Background temp clean: ${cleaned} file(s) removed`);
      }
    });
  } catch {
    // never crash the bot
  }
}

// 🕒 Run once on startup + every hour
cleanupTempFiles();
setInterval(cleanupTempFiles, 60 * 60 * 1000);

module.exports = { cleanupTempFiles };
