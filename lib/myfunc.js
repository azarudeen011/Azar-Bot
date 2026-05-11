// lib/myfunc.js
// 🌐 Fetch, Buffer, Upload, URL utilities — Azahrabot v4.9 Optimized

const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

// 💤 Sleep utility
exports.sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 🌍 Fetch JSON safely
exports.fetchJson = async (url, options = {}) => {
  try {
    const res = await axios.get(url, {
      headers: { "User-Agent": "Azahrabot/1.0" },
      ...options,
    });
    return res.data;
  } catch (err) {
    console.error(`❌ fetchJson failed for ${url}:`, err.message);
    return null;
  }
};

// 📦 Fetch file as Buffer
exports.fetchBuffer = async (url, options = {}) => {
  try {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      ...options,
    });
    return res.data;
  } catch (err) {
    console.error(`❌ fetchBuffer failed for ${url}:`, err.message);
    return null;
  }
};

// 🔗 Check valid URL
exports.isUrl = (url) => /^https?:\/\//i.test(url);

// ☁️ Upload image to telegra.ph safely
exports.TelegraPh = async (filePath) => {
  try {
    if (!fs.existsSync(filePath)) throw new Error("File not found!");

    const form = new FormData();
    form.append("file", fs.createReadStream(filePath));

    const res = await axios.post("https://telegra.ph/upload", form, {
      headers: form.getHeaders(),
      timeout: 10000,
    });

    if (!res.data || !Array.isArray(res.data))
      throw new Error("Invalid Telegra.ph response");

    return "https://telegra.ph" + res.data[0].src;
  } catch (err) {
    console.error("❌ TelegraPh upload failed:", err.message);
    return null;
  }
};

// 🎞️ Convert WebP to MP4 using ezgif (safe mode)
exports.webpToMp4 = async (filePath) => {
  try {
    const form = new FormData();
    form.append("new-image", fs.createReadStream(filePath));

    // Step 1: Upload file
    const upload = await axios.post("https://s6.ezgif.com/webp-to-mp4", form, {
      headers: form.getHeaders(),
      timeout: 15000,
    });

    const idMatch = upload.data.match(/name="file" value="([^"]+)"/);
    if (!idMatch) throw new Error("Failed to extract file ID");

    const id = idMatch[1];
    const form2 = new FormData();
    form2.append("file", id);
    form2.append("convert", "Convert WebP to MP4!");

    // Step 2: Convert file
    const convert = await axios.post(`https://ezgif.com/webp-to-mp4/${id}`, form2, {
      headers: form2.getHeaders(),
      timeout: 15000,
    });

    const mp4Match = convert.data.match(/<source src="([^"]+)"/);
    if (!mp4Match) throw new Error("Failed to extract MP4 URL");

    return "https:" + mp4Match[1];
  } catch (err) {
    console.error("❌ WebP→MP4 conversion failed:", err.message);
    return null;
  }
};
