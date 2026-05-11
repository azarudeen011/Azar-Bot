// ==============================================
// ✨ Azahrabot — .attp Command (v5.8 Portable Node Edition)
// Fully portable • No apt • Works on Replit, Bot.Hosting
// ==============================================

const fs = require("fs");
const path = require("path");
const { writeExifVid } = require("../lib/exif");
const secure = require("../lib/small_lib");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

// 💡 Force ffmpeg-static path globally (fixes spawn ENOENT)
ffmpeg.setFfmpegPath(ffmpegPath);

module.exports = async (sock, msg, from, text, args = []) => {
  try {
    const inputText = args.length > 0 ? args.join(" ").trim() : text?.trim();
    if (!inputText) {
      await sock.sendMessage(from, { text: "🪄 *Usage:* .attp <text>\nExample: `.attp Azahrabot ✨`" }, { quoted: msg });
      return;
    }

    await sock.sendMessage(from, { react: { text: "⏱", key: msg.key } }).catch(() => {});

    // 🔮 Generate the blinking text animation
    const videoBuffer = await renderBlinkingVideo(inputText);

    // 🎭 Add sticker metadata and convert to WebP
    const webpPath = await writeExifVid(videoBuffer, {
      packname: secure.packname || "Azahra Bot",
      author: secure.author || "AzarTech",
    });

    const sticker = fs.readFileSync(webpPath);
    await sock.sendMessage(from, { sticker }, { quoted: msg });

    // 🧹 Cleanup
    try { fs.unlinkSync(webpPath); } catch {}
  } catch (err) {
    console.error("❌ .attp error:", err);
    await sock.sendMessage(from, { text: "⚠️ Failed to create sticker. Try again." }, { quoted: msg });
  }
};

// ==============================================
// 🎬 Render Blinking Color Text with ffmpeg-static
// ==============================================
function renderBlinkingVideo(text) {
  return new Promise((resolve, reject) => {
    const fontPath =
      process.platform === "win32"
        ? "C:/Windows/Fonts/arialbd.ttf"
        : "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

    const safeText = text
      .replace(/\\/g, "\\\\")
      .replace(/:/g, "\\:")
      .replace(/,/g, "\\,")
      .replace(/'/g, "\\'")
      .replace(/\[/g, "\\[")
      .replace(/\]/g, "\\]")
      .replace(/%/g, "\\%");

    const dur = 1.8; // total duration (s)
    const tempFile = path.join(__dirname, `../temp/attp_${Date.now()}.mp4`);
    if (!fs.existsSync(path.dirname(tempFile))) fs.mkdirSync(path.dirname(tempFile), { recursive: true });

    const filters = [
      `drawtext=fontfile='${fontPath}':text='${safeText}':fontcolor=red:borderw=2:bordercolor=black@0.6:fontsize=56:x=(w-text_w)/2:y=(h-text_h)/2:enable='lt(mod(t,0.3),0.1)'`,
      `drawtext=fontfile='${fontPath}':text='${safeText}':fontcolor=blue:borderw=2:bordercolor=black@0.6:fontsize=56:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(mod(t,0.3),0.1,0.2)'`,
      `drawtext=fontfile='${fontPath}':text='${safeText}':fontcolor=green:borderw=2:bordercolor=black@0.6:fontsize=56:x=(w-text_w)/2:y=(h-text_h)/2:enable='gte(mod(t,0.3),0.2)'`,
    ].join(",");

    ffmpeg()
      .setFfmpegPath(ffmpegPath)
      .input(`color=c=black:s=512x512:d=${dur}:r=20`)
      .inputFormat("lavfi")
      .videoFilters(filters)
      .videoCodec("libx264")
      .outputOptions(["-pix_fmt yuv420p", "-movflags +faststart+frag_keyframe+empty_moov"])
      .format("mp4")
      .duration(dur)
      .on("end", () => {
        const buffer = fs.readFileSync(tempFile);
        try { fs.unlinkSync(tempFile); } catch {}
        resolve(buffer);
      })
      .on("error", reject)
      .save(tempFile);
  });
}
