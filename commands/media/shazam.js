const crypto = require("crypto");
const axios = require("axios");
const FormData = require("form-data");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const smallLib = require("../../lib/small_lib");

// Build ACRCloud signature
function buildStringToSign(
  method,
  uri,
  accessKey,
  dataType,
  signatureVersion,
  timestamp,
) {
  return [method, uri, accessKey, dataType, signatureVersion, timestamp].join(
    "\n",
  );
}

function signRequest(stringToSign, accessSecret) {
  return crypto
    .createHmac("sha1", accessSecret)
    .update(stringToSign)
    .digest("base64");
}

module.exports = async (sock, msg, from, text, args) => {
  try {
    // 🎵 React when command used
    await sock.sendMessage(from, {
      react: { text: "🎵", key: msg.key },
    });

    const acr = smallLib.acrcloud;

    if (!acr || !acr.host || !acr.access_key || !acr.access_secret) {
      return sock.sendMessage(
        from,
        { text: "❌ ACRCloud credentials not configured in small_lib.js" },
        { quoted: msg },
      );
    }

    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    // =====================================================
    // 🎧 AUDIO RECOGNITION
    // =====================================================
    if (quoted?.audioMessage) {
      await sock.sendMessage(
        from,
        { text: "🎧 Recognizing audio..." },
        { quoted: msg },
      );

      const stream = await downloadContentFromMessage(
        quoted.audioMessage,
        "audio",
      );

      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      const method = "POST";
      const http_uri = "/v1/identify";
      const dataType = "audio";
      const signatureVersion = "1";
      const timestamp = Math.floor(Date.now() / 1000).toString();

      const stringToSign = buildStringToSign(
        method,
        http_uri,
        acr.access_key,
        dataType,
        signatureVersion,
        timestamp,
      );

      const signature = signRequest(stringToSign, acr.access_secret);

      const form = new FormData();
      form.append("access_key", acr.access_key);
      form.append("signature", signature);
      form.append("sample", buffer, "audio.mp3");
      form.append("data_type", dataType);
      form.append("signature_version", signatureVersion);
      form.append("timestamp", timestamp);

      const response = await axios.post(
        `https://${acr.host}${http_uri}`,
        form,
        { headers: form.getHeaders() },
      );

      const match = response.data?.metadata?.music?.[0];

      if (!match) {
        return sock.sendMessage(
          from,
          { text: "❌ Song not recognized." },
          { quoted: msg },
        );
      }

      // 🎶 React when song found
      await sock.sendMessage(from, {
        react: { text: "🎶", key: msg.key },
      });

      return sock.sendMessage(
        from,
        {
          text:
            `🎵 *Song Found!*\n\n` +
            `🎤 Artist: ${match.artists?.[0]?.name || "Unknown"}\n` +
            `🎶 Title: ${match.title || "Unknown"}\n` +
            `💿 Album: ${match.album?.name || "Unknown"}`,
        },
        { quoted: msg },
      );
    }

    // =====================================================
    // 🔎 TEXT / LYRICS SEARCH
    // =====================================================
    if (!args.length) {
      return sock.sendMessage(
        from,
        {
          text:
            "Usage:\n" +
            "• Reply to audio with `.shazam`\n" +
            "• `.shazam <lyrics or song name>`",
        },
        { quoted: msg },
      );
    }

    await sock.sendMessage(
      from,
      { text: "🔍 Searching song..." },
      { quoted: msg },
    );

    const query = args.join(" ");

    const res = await axios.get("https://itunes.apple.com/search", {
      params: {
        term: query,
        media: "music",
        limit: 1,
      },
    });

    const song = res.data.results?.[0];

    if (!song) {
      return sock.sendMessage(
        from,
        { text: "❌ No matching song found." },
        { quoted: msg },
      );
    }

    // 🎶 React when found
    await sock.sendMessage(from, {
      react: { text: "🎶", key: msg.key },
    });

    return sock.sendMessage(
      from,
      {
        text:
          `🎵 *Song Found!*\n\n` +
          `🎤 Artist: ${song.artistName}\n` +
          `🎶 Title: ${song.trackName}\n` +
          `💿 Album: ${song.collectionName}`,
      },
      { quoted: msg },
    );
  } catch (error) {
    console.error("⚠️ .shazam error:", error?.response?.data || error.message);

    await sock.sendMessage(from, {
      react: { text: "❌", key: msg.key },
    });

    return sock.sendMessage(
      from,
      { text: "❌ Error recognizing song. Check panel logs." },
      { quoted: msg },
    );
  }
};
