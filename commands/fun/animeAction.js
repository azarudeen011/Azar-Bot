// ==============================================
// 💖 Anime Action System (UNIVERSAL - ALL HOSTING PANELS)
// Azahrabot — Multi-API fallback, smart routing
// ==============================================

const axios = require("axios");
const os = require("os");
const fs = require("fs");
const path = require("path");

function getTarget(msg) {
  return (
    msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
    null
  );
}

// ========== API CATEGORY MAPS ==========

// nekos.best — Most reliable, 99.9% uptime, no auth
// Available: baka, bite, blush, bored, cry, cuddle, dance, facepalm, feed,
// handhold, handshake, happy, highfive, hug, kick, kiss, laugh, lurk, nod,
// nom, nope, pat, peck, poke, pout, punch, shoot, shrug, slap, sleep,
// smile, smug, stare, think, thumbsup, tickle, wave, wink, yawn, yeet
const NEKOS_BEST_MAP = {
  poke: "poke",
  cry: "cry",
  kiss: "kiss",
  pat: "pat",
  hug: "hug",
  wink: "wink",
  facepalm: "facepalm",
  slap: "slap",
  cuddle: "cuddle",
  bite: "bite",
  nom: "nom",
  blush: "blush",
  dance: "dance",
  handhold: "handhold",
  happy: "happy",
  highfive: "highfive",
  kick: "kick",
  smile: "smile",
  smug: "smug",
  wave: "wave",
  yeet: "yeet",
  // Approximate mappings (no exact match on nekos.best)
  lick: "feed",
  bonk: "punch",
  bully: "kick",
  cringe: "facepalm",
  glomp: "hug",
  kill: "shoot",
};

// waifu.pics — Has the BEST coverage for unique commands (lick, kill, bonk, bully, cringe, glomp)
// Available: waifu, neko, bully, cuddle, cry, hug, kiss, lick, pat, smug, bonk,
// yeet, blush, smile, wave, highfive, handhold, nom, bite, glomp, slap, kill,
// kick, happy, wink, poke, dance, cringe
const WAIFU_PICS_MAP = {
  poke: "poke",
  cry: "cry",
  kiss: "kiss",
  pat: "pat",
  hug: "hug",
  wink: "wink",
  slap: "slap",
  cuddle: "cuddle",
  bite: "bite",
  lick: "lick",
  nom: "nom",
  bonk: "bonk",
  blush: "blush",
  bully: "bully",
  cringe: "cringe",
  dance: "dance",
  glomp: "glomp",
  handhold: "handhold",
  happy: "happy",
  highfive: "highfive",
  kick: "kick",
  kill: "kill",
  smile: "smile",
  smug: "smug",
  wave: "wave",
  yeet: "yeet",
};

// otakugifs.xyz — Good fallback, CDN-backed, fast delivery
// Available: airkiss, angrystare, bite, bleh, blush, brofist, celebrate,
// cheers, clap, confused, cool, cry, cuddle, dance, drool, evillaugh,
// facepalm, handhold, happy, headbang, hug, huh, kiss, laugh, lick, love,
// mad, nervous, no, nom, nosebleed, nuzzle, nyah, pat, peek, pinch, poke,
// pout, punch, roll, run, sad, scared, shout, shrug, shy, sigh, sing, sip,
// slap, sleep, slowclap, smack, smile, smug, sneeze, sorry, stare, stop,
// surprised, sweat, thumbsup, tickle, tired, wave, wink, woah, yawn, yay, yes
const OTAKU_GIF_MAP = {
  poke: "poke",
  cry: "cry",
  kiss: "kiss",
  pat: "pat",
  hug: "hug",
  wink: "wink",
  facepalm: "facepalm",
  slap: "slap",
  cuddle: "cuddle",
  bite: "bite",
  lick: "lick",
  nom: "nom",
  blush: "blush",
  dance: "dance",
  handhold: "handhold",
  happy: "happy",
  smile: "smile",
  smug: "smug",
  wave: "wave",
  // Approximate mappings
  bonk: "punch",
  bully: "mad",
  cringe: "facepalm",
  glomp: "hug",
  highfive: "thumbsup",
  kick: "punch",
  kill: "punch",
  yeet: "run",
};

// purrbot.site — 4th fallback, SFW anime GIFs
// Available: angry, bite, blush, comfy, cry, cuddle, dance, eevee, feed,
// fluff, hug, kiss, lick, neko, pat, poke, slap, smile, tail, tickle
const PURRBOT_MAP = {
  bite: "bite",
  blush: "blush",
  cry: "cry",
  cuddle: "cuddle",
  dance: "dance",
  hug: "hug",
  kiss: "kiss",
  lick: "lick",
  pat: "pat",
  poke: "poke",
  slap: "slap",
  smile: "smile",
  // Approximate mappings
  nom: "feed",
  glomp: "hug",
  kill: "slap",
  bonk: "slap",
  bully: "slap",
  kick: "slap",
  happy: "smile",
  wave: "pat",
};

const EMOJI = {
  poke: "👉",
  cry: "😭",
  kiss: "💋",
  pat: "🫳",
  hug: "🤗",
  wink: "😉",
  facepalm: "🤦",
  slap: "👋",
  cuddle: "💞",
  bite: "🧛",
  lick: "👅",
  nom: "🍪",
  bonk: "🔨",
  blush: "😊",
  bully: "😈",
  cringe: "😬",
  dance: "💃",
  glomp: "🫂",
  handhold: "🤝",
  happy: "😄",
  highfive: "🙌",
  kick: "🦶",
  kill: "💀",
  smile: "😁",
  smug: "😏",
  wave: "👋",
  yeet: "🚀",
};

// ✅ Action text for caption
const ACTION_TEXT = {
  poke: "poked",
  cry: "is crying",
  kiss: "kissed",
  pat: "patted",
  hug: "hugged",
  wink: "winked at",
  facepalm: "facepalmed",
  slap: "slapped",
  cuddle: "cuddled",
  bite: "bit",
  lick: "licked",
  nom: "nommed on",
  bonk: "bonked",
  blush: "is blushing",
  bully: "bullied",
  cringe: "cringed at",
  dance: "is dancing",
  glomp: "glomped",
  handhold: "is holding hands with",
  happy: "is happy",
  highfive: "high-fived",
  kick: "kicked",
  kill: "killed",
  smile: "is smiling",
  smug: "is feeling smug",
  wave: "waved at",
  yeet: "yeeted",
};

// Commands that waifu.pics has exact matches for but nekos.best doesn't
const WAIFU_PICS_PRIORITY = ["lick", "kill", "bonk", "bully", "cringe", "glomp"];

// ========== API FETCHERS ==========

async function fetchFromNekosBest(command) {
  const category = NEKOS_BEST_MAP[command];
  if (!category) return null;
  try {
    const res = await axios.get(`https://nekos.best/api/v2/${category}`, {
      timeout: 8000,
      headers: { "User-Agent": "AzahraBot/2.0" },
    });
    return res.data?.results?.[0]?.url || null;
  } catch (e) {
    console.log(`[NekosBest] Failed for "${category}":`, e.message);
    return null;
  }
}

async function fetchFromWaifuPics(command) {
  const category = WAIFU_PICS_MAP[command];
  if (!category) return null;
  try {
    const res = await axios.get(`https://api.waifu.pics/sfw/${category}`, {
      timeout: 8000,
    });
    return res.data?.url || null;
  } catch (e) {
    console.log(`[WaifuPics] Failed for "${category}":`, e.message);
    return null;
  }
}

async function fetchFromOtakuGifs(command) {
  const category = OTAKU_GIF_MAP[command];
  if (!category) return null;
  try {
    const res = await axios.get(
      `https://api.otakugifs.xyz/gif?reaction=${category}&format=gif`,
      { timeout: 8000 }
    );
    return res.data?.url || null;
  } catch (e) {
    console.log(`[OtakuGifs] Failed for "${category}":`, e.message);
    return null;
  }
}

async function fetchFromPurrbot(command) {
  const category = PURRBOT_MAP[command];
  if (!category) return null;
  try {
    const res = await axios.get(
      `https://purrbot.site/api/img/sfw/${category}/gif`,
      { timeout: 8000 }
    );
    if (res.data?.error === false && res.data?.link) {
      return res.data.link;
    }
    return null;
  } catch (e) {
    console.log(`[Purrbot] Failed for "${category}":`, e.message);
    return null;
  }
}

// ✅ Smart routing: use the best API for each command
async function fetchGifUrl(command) {
  // For commands where waifu.pics has exact match but nekos.best doesn't,
  // try waifu.pics FIRST for best result quality
  if (WAIFU_PICS_PRIORITY.includes(command)) {
    let url = await fetchFromWaifuPics(command);
    if (url) return url;

    // Then otakugifs (has lick at least)
    url = await fetchFromOtakuGifs(command);
    if (url) return url;

    // Then purrbot
    url = await fetchFromPurrbot(command);
    if (url) return url;

    // Last resort: nekos.best with approximate category
    url = await fetchFromNekosBest(command);
    if (url) return url;
  } else {
    // For standard commands, use nekos.best first (most reliable)
    let url = await fetchFromNekosBest(command);
    if (url) return url;

    // Fallback: waifu.pics
    url = await fetchFromWaifuPics(command);
    if (url) return url;

    // Fallback: otakugifs
    url = await fetchFromOtakuGifs(command);
    if (url) return url;

    // Last resort: purrbot
    url = await fetchFromPurrbot(command);
    if (url) return url;
  }

  return null;
}

module.exports = async (sock, msg, from, text, command) => {
  try {
    // ❗ Safety check
    if (!command) {
      console.log("❌ Missing command in animeAction");
      return;
    }

    console.log("Anime Command:", command);

    const target = getTarget(msg);
    const sender = msg.key.participant || msg.key.remoteJid;

    // ✅ React to the message
    await sock.sendMessage(from, {
      react: {
        text: EMOJI[command] || "💖",
        key: {
          remoteJid: msg.key.remoteJid,
          fromMe: msg.key.fromMe,
          id: msg.key.id,
        },
      },
    }).catch(() => {});

    // 🔥 Fetch GIF with smart multi-API fallback
    const gifUrl = await fetchGifUrl(command);

    if (!gifUrl) {
      return sock.sendMessage(
        from,
        { text: "❌ Couldn't fetch anime action. All APIs are down." },
        { quoted: msg }
      );
    }

    // ✅ Download the GIF as buffer (no disk write needed)
    const gifBuffer = Buffer.from(
      (await axios.get(gifUrl, { responseType: "arraybuffer", timeout: 15000 })).data
    );

    // ✅ Build caption
    const senderName = `@${sender.split("@")[0]}`;
    const actionVerb = ACTION_TEXT[command] || command;
    let caption = "";

    // Solo actions (no target needed)
    const soloActions = [
      "cry", "blush", "dance", "happy", "smile", "smug", "facepalm", "cringe",
    ];

    if (soloActions.includes(command)) {
      caption = `${EMOJI[command] || "💖"} *${senderName}* ${actionVerb}!`;
    } else if (target) {
      const targetName = `@${target.split("@")[0]}`;
      caption = `${EMOJI[command] || "💖"} *${senderName}* ${actionVerb} *${targetName}*!`;
    } else {
      caption = `${EMOJI[command] || "💖"} *${senderName}* ${actionVerb}!`;
    }

    // ✅ Try sending as sticker first (if ffmpeg available)
    // If sticker fails, send as GIF video — works on ALL hosting panels
    let stickerSent = false;

    try {
      const ffmpegPath = require("ffmpeg-static");
      if (ffmpegPath && fs.existsSync(ffmpegPath)) {
        const { exec } = require("child_process");
        const id = Date.now() + "_" + Math.random().toString(36).slice(2, 6);
        const tmpDir = os.tmpdir();
        const gifPath = path.join(tmpDir, `anime_${id}.gif`);
        const webpPath = path.join(tmpDir, `anime_${id}.webp`);

        fs.writeFileSync(gifPath, gifBuffer);

        await new Promise((resolve, reject) => {
          exec(
            `"${ffmpegPath}" -i "${gifPath}" -vf "fps=15,scale=512:512:force_original_aspect_ratio=increase,crop=512:512" -loop 0 -an -vsync 0 -vcodec libwebp "${webpPath}"`,
            { timeout: 20000 },
            (err) => (err ? reject(err) : resolve())
          );
        });

        if (fs.existsSync(webpPath)) {
          await sock.sendMessage(
            from,
            {
              sticker: fs.readFileSync(webpPath),
              mentions: target ? [sender, target] : [sender],
            },
            { quoted: msg }
          );
          stickerSent = true;
        }

        // Cleanup temp files
        try { fs.unlinkSync(gifPath); } catch (_) {}
        try { fs.unlinkSync(webpPath); } catch (_) {}
      }
    } catch (stickerErr) {
      console.log("Sticker conversion skipped (no ffmpeg):", stickerErr.message);
    }

    // ✅ Fallback: Send as GIF/video (works on ALL hosting panels)
    if (!stickerSent) {
      await sock.sendMessage(
        from,
        {
          video: gifBuffer,
          gifPlayback: true,
          caption: caption,
          mentions: target ? [sender, target] : [sender],
        },
        { quoted: msg }
      );
    } else {
      // If sticker was sent, send caption separately
      if (caption) {
        await sock.sendMessage(
          from,
          {
            text: caption,
            mentions: target ? [sender, target] : [sender],
          },
          { quoted: msg }
        );
      }
    }
  } catch (err) {
    console.error("Anime FULL ERROR:", err);

    await sock
      .sendMessage(
        from,
        { text: "❌ Anime action failed: " + err.message },
        { quoted: msg }
      )
      .catch(() => {});
  }
};