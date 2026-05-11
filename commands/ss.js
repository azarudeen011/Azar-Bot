const axios = require("axios");
const sharp = require("sharp");

module.exports = async function ss(sock, msg, from, text, args, store) {
try {
await sock.sendMessage(from, { react: { text: "📸", key: msg.key } });

const url = args.join(" ").trim();

if (!url) {
  return sock.sendMessage(
    from,
    {
      text:
        "*📸 SCREENSHOT TOOL*\n\nUsage: *.ss <url>*\n\nExample:\n.ss https://google.com"
    },
    { quoted: msg }
  );
}

if (!url.startsWith("http")) {
  return sock.sendMessage(
    from,
    { text: "❌ Invalid URL. Use full link like: .ss https://example.com" },
    { quoted: msg }
  );
}

let screenshotBuf = null;

// 🔥 Primary API
try {
  const apiUrl =
    "https://eliteprotech-apis.zone.id/ssweb?url=" +
    encodeURIComponent(url);

  const res = await axios.get(apiUrl, {
    responseType: "arraybuffer",
    timeout: 25000
  });

  if (res.data && Buffer.byteLength(res.data) > 10000) {
    screenshotBuf = Buffer.from(res.data);
    console.log("✅ Primary SS API success");
  }
} catch (e) {
  console.log("Primary SS API failed:", e.message);
}

// 🔥 Backup API (VERY IMPORTANT)
if (!screenshotBuf) {
  try {
    const thumUrl = `https://image.thum.io/get/png/noanimate/${url}`;
    const res = await axios.get(thumUrl, {
      responseType: "arraybuffer",
      timeout: 25000
    });

    if (res.data && Buffer.byteLength(res.data) > 10000) {
      screenshotBuf = Buffer.from(res.data);
      console.log("✅ Backup Thum.io success");
    }
  } catch (e) {
    console.log("Backup SS failed:", e.message);
  }
}

if (!screenshotBuf) {
  return sock.sendMessage(
    from,
    { text: "❌ Screenshot failed for this website." },
    { quoted: msg }
  );
}

try {
  const meta = await sharp(screenshotBuf).metadata();
  if (meta.format !== "png") {
    screenshotBuf = await sharp(screenshotBuf).png().toBuffer();
  }
} catch {}

await sock.sendMessage(
  from,
  { image: screenshotBuf, caption: `📸 Screenshot\n${url}` },
  { quoted: msg }
);

await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

} catch (err) {
console.log("SS ERROR:", err.message);
sock.sendMessage(
from,
{ text: "❌ Screenshot command error." },
{ quoted: msg }
);
}
};
