// ==============================================
// 🎞️ Azahrabot EXIF Writer (v3.0 Portable Edition)
// Adds metadata to image/video stickers • ffmpeg-static compatible
// ==============================================

const { exec } = require("child_process");
const ffmpegPath = require("ffmpeg-static");
const fs = require("fs");
const path = require("path");
const { tmpdir } = require("os");

// Default paths
const TEMP_DIR = path.join(__dirname, "../temp");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// 🧩 Write EXIF for video (attp, etc.)
async function writeExifVid(videoBuffer, options = {}) {
  const { packname = "Azahra Bot", author = "AzarTech" } = options;

  const inputPath = path.join(TEMP_DIR, `input_${Date.now()}.mp4`);
  const outputPath = path.join(TEMP_DIR, `output_${Date.now()}.webp`);

  fs.writeFileSync(inputPath, videoBuffer);

  return new Promise((resolve, reject) => {
    const ffmpegCmd = `"${ffmpegPath}" -i "${inputPath}" -vcodec libwebp -filter:v fps=fps=15,scale=512:512:force_original_aspect_ratio=decrease -loop 0 -ss 0 -t 3 -preset picture -an -vsync 0 "${outputPath}"`;

    exec(ffmpegCmd, (error, stdout, stderr) => {
      try { fs.unlinkSync(inputPath); } catch {}
      if (error) {
        console.error("❌ FFmpeg error in writeExifVid:", stderr || error);
        return reject(error);
      }
      resolve(outputPath);
    });
  });
}

// 🧩 Write EXIF for static image stickers (if used)
async function writeExifImg(imageBuffer, options = {}) {
  const { packname = "Azahra Bot", author = "AzarTech" } = options;

  const inputPath = path.join(TEMP_DIR, `input_${Date.now()}.png`);
  const outputPath = path.join(TEMP_DIR, `output_${Date.now()}.webp`);

  fs.writeFileSync(inputPath, imageBuffer);

  return new Promise((resolve, reject) => {
    const ffmpegCmd = `"${ffmpegPath}" -i "${inputPath}" -vcodec libwebp -filter:v scale=512:512:force_original_aspect_ratio=decrease -lossless 1 -preset picture -qscale 75 -loop 0 -an -vsync 0 "${outputPath}"`;

    exec(ffmpegCmd, (error, stdout, stderr) => {
      try { fs.unlinkSync(inputPath); } catch {}
      if (error) {
        console.error("❌ FFmpeg error in writeExifImg:", stderr || error);
        return reject(error);
      }
      resolve(outputPath);
    });
  });
}

module.exports = { writeExifVid, writeExifImg };
