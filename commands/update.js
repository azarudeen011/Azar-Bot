// commands/system/update.js

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const axios = require("axios");
const secure = require("../lib/small_lib");
const { isSudo } = require("../lib/guards");

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
  "backups",
  ".backup",
  "logs"
]);

// ==============================
// 🌐 ROBUST AXIOS DOWNLOAD
// ==============================
async function downloadFile(url, dest) {
  const writer = fs.createWriteStream(dest);
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", () => {
      writer.close();
      resolve();
    });
    writer.on("error", (err) => {
      writer.close();
      fs.unlink(dest, () => reject(err));
    });
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
// 📦 ZIP UPDATE (FALLBACK)
// ==============================
async function updateViaZip(zipUrl, cwd) {
  const tmpDir = path.join(cwd, "tmp_update");

  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir);

  const zipPath = path.join(tmpDir, "update.zip");
  await downloadFile(zipUrl, zipPath);

  const zip = new AdmZip(zipPath);
  zip.extractAllTo(tmpDir, true);

  // Check if it's a single root folder (like GitHub zips) or directly extracted files
  const entries = fs.readdirSync(tmpDir).filter(e => e !== "update.zip");
  let rootDirToCopy = tmpDir;

  if (entries.length === 1 && fs.lstatSync(path.join(tmpDir, entries[0])).isDirectory()) {
    // It's a GitHub-style zip with a single root wrapper folder
    rootDirToCopy = path.join(tmpDir, entries[0]);
  } else if (entries.length === 0) {
    throw new Error("The update zip file is empty.");
  }

  // Copy all contents from the determined root directory into cwd
  safeCopy(rootDirToCopy, cwd);

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
  return true;
}

// ==============================
// 🔄 GIT UPDATE (PRIMARY)
// ==============================
async function updateViaGit(cwd) {
  if (!fs.existsSync(path.join(cwd, ".git"))) {
    return false; // Not a git repository
  }

  await run("git fetch --all");

  let branch = "main";
  try {
    const branches = await run("git branch -r");
    if (branches.includes("origin/master") && !branches.includes("origin/main")) {
      branch = "master";
    }
  } catch (e) {
    // Ignore errors, default to main
  }

  await run(`git reset --hard origin/${branch}`);
  return true;
}

// ==============================
// 🔄 RESTART
// ==============================
async function restart(sock, from) {
  await sock.sendMessage(from, { text: "♻️ Restarting server automatically..." });

  try {
    await run("pm2 restart all");
  } catch {
    // PM2 is not installed or running. Spawn natively.
    if (process.platform === "win32") {
      const { exec } = require("child_process");
      // Spawns a new visible command prompt window on Windows
      exec("start cmd.exe /K node index.js", { cwd: process.cwd() });
    } else {
      const { spawn } = require("child_process");
      // Spawns detached background process on Linux/Mac
      const child = spawn(process.argv[0], process.argv.slice(1), {
        detached: true,
        stdio: "ignore",
        cwd: process.cwd()
      });
      child.unref();
    }
    // Give it a moment to boot before killing the old process
    setTimeout(() => process.exit(0), 1500);
  }
}

// ==============================
// 🚀 MAIN
// ==============================
module.exports = async (sock, msg, from) => {
  try {
    const isSudoUser = await isSudo(sock, msg);
    if (!isSudoUser && !msg.key.fromMe) {
      return sock.sendMessage(from, { text: "❌ Sudo/Owner only." }, { quoted: msg });
    }

    await sock.sendMessage(from, { text: "🔍 Checking for updates from GitHub..." }, { quoted: msg });

    const cwd = process.cwd();
    let updateMethod = "Git Pull";

    // 1. Try Git Update first (Best for hosting servers)
    try {
      const gitSuccess = await updateViaGit(cwd);
      if (!gitSuccess) {
        throw new Error("Not a git repository");
      }
    } catch (gitErr) {
      // 2. Fallback to Zip Download
      updateMethod = "Zip Download";
      const zipUrl = secure.updateZipUrl;
      if (!zipUrl) {
        return sock.sendMessage(from, { text: "❌ No update URL configured and not a git repo." }, { quoted: msg });
      }

      await sock.sendMessage(from, { text: `⬇️ Git pull failed. Falling back to Zip Download...` }, { quoted: msg });
      await updateViaZip(zipUrl, cwd);
    }

    await sock.sendMessage(from, {
      text: `✅ *UPDATE SUCCESSFUL!*\n━━━━━━━━━━━━━━\n📥 Method: ${updateMethod}\n📂 Core files — Updated\n🔒 .auth & Backups — Protected\n\n♻️ *Server is restarting...*`
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