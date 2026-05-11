const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const ffmpegPath = require("ffmpeg-static");

// Standard stream to buffer
async function streamToBuffer(stream) {
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    return Buffer.concat(chunks);
}

// Effect mapping
const effects = {
    bass: "bass=g=30:f=110:w=0.6,bass=g=20:f=110:w=0.6", // Intense double-stack bass
    deep: "asetrate=44100*0.8,atempo=1.25",
    chipmunk: "asetrate=44100*1.4,atempo=0.7",
    nightcore: "asetrate=44100*1.25,atempo=1.0",
    slow: "atempo=0.7",
    fast: "atempo=1.5",
    blown: "acrusher=.1:1:64:0:log",
    robot: "afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)':win_size=512:overlap=0.75",
    reverse: "areverse",
    echo: "aecho=0.8:0.9:1000:0.3",
    vibrato: "vibrato=f=6.0:d=0.8",
    alien: "tremolo=f=5.0:d=0.9,aecho=0.8:0.9:50:0.3"
};

module.exports = async function applyVoiceChanger(sock, msg, from, text, effectName) {
    try {
        await sock.sendMessage(from, { react: { text: "🎙️", key: msg.key } });

        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const audioMsg = quoted?.audioMessage || msg.message?.audioMessage;

        if (!audioMsg) {
            return sock.sendMessage(
                from,
                { text: `🎶 Reply to an *audio* message with \`.${effectName}\` to apply the effect!` },
                { quoted: msg }
            );
        }

        const stream = await downloadContentFromMessage(audioMsg, "audio");
        const buffer = await streamToBuffer(stream);

        const input = path.join(__dirname, "../temp/in_aud_" + Date.now() + ".mp3");
        const output = path.join(__dirname, "../temp/out_aud_" + Date.now() + ".mp3");

        if (!fs.existsSync(path.dirname(input))) {
            fs.mkdirSync(path.dirname(input), { recursive: true });
        }

        fs.writeFileSync(input, buffer);

        const filter = effects[effectName] || "atempo=1.0";

        await new Promise((resolve, reject) => {
            exec(`"${ffmpegPath}" -i "${input}" -af "${filter}" -q:a 0 "${output}"`, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        const mp3Buffer = fs.readFileSync(output);

        await sock.sendMessage(
            from,
            {
                audio: mp3Buffer,
                mimetype: "audio/mpeg",
                fileName: `Azahrabot_${effectName}.mp3`,
                ptt: false
            },
            { quoted: msg }
        );

        await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

        try { fs.unlinkSync(input); } catch {}
        try { fs.unlinkSync(output); } catch {}

    } catch (err) {
        console.error("VOICE CHANGER ERROR:", err);
        await sock.sendMessage(
            from,
            { text: `❌ Failed to apply ${effectName} effect.` },
            { quoted: msg }
        );
    }
};
