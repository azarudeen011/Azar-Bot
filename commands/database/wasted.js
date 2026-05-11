const fs = require("fs");
const path = require("path");
const axios = require("axios");
const sharp = require("sharp");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

// Stream → Buffer helper
async function streamToBuffer(stream) {
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    return Buffer.concat(chunks);
}

module.exports = async function wasted(sock, msg, from) {
  try {
    let imgBuffer;

    // 1️⃣ If user replied with an image
    if (msg.message?.imageMessage) {
      const stream = await downloadContentFromMessage(
        msg.message.imageMessage,
        "image"
      );
      imgBuffer = await streamToBuffer(stream);
    } else {
      // 2️⃣ Mention → reply → participant → DM fallback
      const target =
        msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
        msg.message?.extendedTextMessage?.contextInfo?.participant ||
        msg.key.participant ||
        msg.key.remoteJid;

      try {
        const dp = await sock.profilePictureUrl(target, "image");
        const res = await axios.get(dp, { responseType: "arraybuffer" });
        imgBuffer = Buffer.from(res.data);
      } catch {
        // fallback anime pic
        const res = await axios.get("https://i.ibb.co/z7SP7G9/anime.jpg", {
          responseType: "arraybuffer",
        });
        imgBuffer = Buffer.from(res.data);
      }
    }

    // 2️⃣ Load base image & metadata
    const base = sharp(imgBuffer);
    const meta = await base.metadata();

    // 3️⃣ Load overlay wasted.png
    const wastedPath = path.join(process.cwd(), "assets", "wasted.png");
    if (!fs.existsSync(wastedPath)) {
      return sock.sendMessage(
        from,
        { text: "❌ Missing wasted.png in /assets folder!" },
        { quoted: msg }
      );
    }

    const wastedBuffer = fs.readFileSync(wastedPath);

    // 4️⃣ Resize overlay to full width
    const overlayResized = await sharp(wastedBuffer)
      .resize(meta.width)
      .toBuffer();

    const overlayMeta = await sharp(overlayResized).metadata();
    const x = 0;
    const y = Math.floor((meta.height - overlayMeta.height) / 2);

    // 5️⃣ Composite
    const final = await base
      .composite([{ input: overlayResized, left: x, top: y }])
      .jpeg()
      .toBuffer();

    // 6️⃣ Send output
    await sock.sendMessage(
      from,
      { image: final, caption: "*💀 GTA — WASTED!*" },
      { quoted: msg }
    );
  } catch (err) {
    console.error("Wasted Error:", err);
    await sock.sendMessage(
      from,
      { text: "⚠️ Failed to make GTA Wasted image." },
      { quoted: msg }
    );
  }
};
