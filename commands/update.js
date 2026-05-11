// commands/system/update.js

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip"); // 🔥 NEW
const secure = require("../lib/small_lib");

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { windowsHide: true }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || stdout || err.message));
      resolve(stdout.toString());
    });
  });
}

const PROTECTED = new Set([
  "auth_info",
  "auth_info_default",
  "auth_info_baileys",
  "session",
  "session_backups",
  "data",
  "node_modules",
  "temp",
  ".env",
  ".git",
  ".replit",
  ".auth",
  ".backup",
  "logs"
]);

// ==============================
// 🌐 DOWNLOAD WITH REDIRECT FIX
// ==============================
function downloadFile(url, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error("Too many redirects"));

    const client = url.startsWith("https") ? require("https") : require("http");

    client.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {

      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        return resolve(downloadFile(res.headers.location, dest, redirects + 1));
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }

      const file = fs.createWriteStream(dest);
      res.pipe(file);

      file.on("finish", () => file.close(resolve));
      file.on("error", reject);

    }).on("error", reject);
  });
}

// ==============================
// 📦 SAFE COPY
// ==============================
function safeCopy(src, dest) {
  for (const file of fs.readdirSync(src)) {
    if (PROTECTED.has(file)) continue;

    const s = path.join(src, file);
    const d = path.join(dest, file);
    const stat = fs.lstatSync(s);

    if (stat.isDirectory()) {
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
      safeCopy(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

// ==============================
// 📦 ZIP UPDATE (FIXED)
// ==============================
async function updateViaZip(zipUrl, cwd) {
  const tmpDir = path.join(cwd, "tmp_update");

  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir);

  const zipPath = path.join(tmpDir, "update.zip");

  await downloadFile(zipUrl, zipPath);

  // 🔥 USE ADM-ZIP INSTEAD OF SYSTEM UNZIP
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(tmpDir, true);

  // Find the extracted folder — skip update.zip, only look at directories
  const extractedFolders = fs.readdirSync(tmpDir).filter((e) => {
    return e !== "update.zip" && fs.lstatSync(path.join(tmpDir, e)).isDirectory();
  });

  if (extractedFolders.length === 0) throw new Error("No folder found inside zip");

  const extracted = path.join(tmpDir, extractedFolders[0]);

  safeCopy(extracted, cwd);

  fs.rmSync(tmpDir, { recursive: true, force: true });

  return true;
}

// ==============================
// 🔄 RESTART
// ==============================
async function restart(sock, from) {
  await sock.sendMessage(from, { text: "♻️ Restarting bot..." });

  try {
    await run("pm2 restart all");
  } catch {
    setTimeout(() => process.exit(0), 500);
  }
}

// ==============================
// 🚀 MAIN
// ==============================
module.exports = async (sock, msg, from) => {
  try {
    const isOwner = await isPairedOwner(sock, msg);
    if (!isOwner) {
      return sock.sendMessage(from, { text: "❌ Owner only." }, { quoted: msg });
    }

    await sock.sendMessage(from, { text: "🔍 Checking for updates..." }, { quoted: msg });

    const zipUrl = secure.updateZipUrl;
    if (!zipUrl) {
      return sock.sendMessage(from, { text: "❌ No update URL configured in small_lib.js." }, { quoted: msg });
    }

    await sock.sendMessage(from, { text: "⬇️ Downloading latest files from GitHub..." }, { quoted: msg });

    await updateViaZip(zipUrl, process.cwd());

    await sock.sendMessage(from, {
      text: "✅ *UPDATE SUCCESSFUL!*\n━━━━━━━━━━━━━━\n📂 Core files — Updated\n📦 Dependencies — Scheduled\n🔒 Session & Data — Protected\n\n♻️ *Restarting now...*"
    }, { quoted: msg });

    await restart(sock, from);

  } catch (err) {
    console.error("[Update] Error:", err);

    const tmpDir = path.join(process.cwd(), "tmp_update");
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });

    await sock.sendMessage(from, {
      text: `❌ *Update Failed*\n━━━━━━━━━━━━━━\nReason: ${err.message}`
    }, { quoted: msg });
  }
};