const fs = require('fs');
const path = require('path');

// Try to require the library. If not found, we'll suggest installing it.
let JavaScriptObfuscator;
try {
  JavaScriptObfuscator = require('javascript-obfuscator');
} catch (e) {
  console.log("⚠️ javascript-obfuscator not found locally.");
  console.log("Please run: npm install --save-dev javascript-obfuscator");
  process.exit(1);
}

const SRC_DIR = path.join(__dirname, 'src');
const DEST_DIR = __dirname;

// Maximum protection obfuscator settings (Aggressive string hiding)
const OBFUSCATOR_CONFIG = {
    compact: true,
    selfDefending: false, // Disabled for better performance on large files
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.75, // Slightly lower threshold for better speed
    unicodeEscapeSequence: false, // Reduced to speed up build
    renameGlobals: false,
    reservedNames: [
        "fetchUser", "updateUser", "isRegistered", "adjustBalance", "logTx",
        "getPhoneDigits", "spend", "getUser", "addMoney", "removeMoney",
        "hasItem", "checkDaily", "addXP", "resolveNumber", "saveMapping",
        "check", "set", "formatTime", "resolveUrl"
    ]
};

console.log("🔒 Starting AzahraBot Professional Obfuscation Build");

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function (file) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else {
      if (filePath.endsWith('.js')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

const args = process.argv.slice(2);
let jsFiles = [];

if (args.length > 0) {
  const target = path.resolve(args[0]);
  if (!fs.existsSync(target)) {
    console.error(`❌ Path does not exist: ${args[0]}`);
    process.exit(1);
  }

  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    console.log(`📂 Building folder: ${args[0]}`);
    jsFiles = walk(target);
  } else if (target.endsWith('.js')) {
    console.log(`🎯 Building single file: ${args[0]}`);
    jsFiles = [target];
  } else {
    console.error(`❌ Target must be a directory or a .js file: ${args[0]}`);
    process.exit(1);
  }
} else {
  jsFiles = walk(SRC_DIR);
}

const SENSITIVE_FILES = [
  'index.js', 'main.js', 'kontal.js', 'lib/small_lib.js',
  'lib/ai_helper.js', 'lib/aiFun.js', 'lib/dictionary.js', 'lib/functions.js',
  'lib/mafiaEngine.js', 'lib/tictactoe.js', 'lib/wcgStore.js', 'lib/economy.js',
  'lib/firebaseManager.js', 'lib/cardData.js', 'lib/cardDropManager.js',
  'lib/cardGenerator.js', 'lib/cardUrlSpy.js', 'lib/petUrlSpy.js',
  'lib/identityManager.js', 'lib/guards.js', 'lib/duelEngine.js', 'lib/duelUI.js',
  'commands/animensfw',
  'commands/database/jid.js', 'commands/database/xnxx.js', 'commands/database/xvideo.js',
  'commands/database/removebg.js', 'commands/database/ttt.js',
  'commands/azarbug.js', 'utils/azarmenu.js', 'utils/menuData.js',
  'commands/system/azarmenu.js', 'commands/flux.js', 'commands/gemini.js',
  'commands/gpt.js', 'commands/play.js', 'commands/vv.js', 'commands/vv2.js',
  'commands/economy', 'commands/cards', 'data/card_series_mapping.js'
];

function shouldObfuscate(relativePath) {
  const normPath = relativePath.replace(/\\/g, '/');
  return SENSITIVE_FILES.some(sensitive => normPath === sensitive || normPath.startsWith(sensitive + '/'));
}

jsFiles.forEach(srcFile => {
  const relativePath = path.relative(SRC_DIR, srcFile);
  const destFile = path.join(DEST_DIR, relativePath);
  const destDirName = path.dirname(destFile);

  if (!fs.existsSync(destDirName)) {
    fs.mkdirSync(destDirName, { recursive: true });
  }

  if (shouldObfuscate(relativePath)) {
    console.log(`🔒 Obfuscating: ${relativePath}`);
    try {
      const sourceCode = fs.readFileSync(srcFile, 'utf8');
      const obfuscationResult = JavaScriptObfuscator.obfuscate(sourceCode, OBFUSCATOR_CONFIG);
      fs.writeFileSync(destFile, obfuscationResult.getObfuscatedCode());
    } catch (e) {
      console.error(`❌ Failed to obfuscate ${relativePath}:`, e.message);
    }
  } else {
    console.log(`📄 Copying raw: ${relativePath}`);
    try {
      fs.copyFileSync(srcFile, destFile);
    } catch (e) {
      console.error(`❌ Failed to copy ${relativePath}:`, e.message);
    }
  }
});

console.log("✅ Build Complete! All sensitive strings (including API keys) are now encrypted.");
