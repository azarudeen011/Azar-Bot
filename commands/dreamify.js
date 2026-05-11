const axios = require("axios");
const settings = require("../settings");
const small_lib = require("../lib/small_lib");

const models_list = [
    "cyberpunk style", "watercolor style", "claymation style", "storybook style",
    "aesthetic style", "doll house", "ghibli style", "anime style",
    "lego style", "origami style", "puppet style"
];

module.exports = async (sock, msg, from, body, args) => {
    const fullText = args.join(" ").trim();

    if (!fullText) {
        let helpText = `✨ *DREAMIFY IMAGE STYLER* ✨\n\n`;
        helpText += `Usage: ${settings.prefix}dreamify <prompt> | <style>\n\n`;
        helpText += `*Available Styles:*\n`;
        helpText += models_list.map(m => `• ${m}`).join("\n");
        helpText += `\n\n_Example: ${settings.prefix}dreamify samurai cat | ghibli style_`;
        return sock.sendMessage(from, { text: helpText }, { quoted: msg });
    }

    // Split prompt and model
    let prompt = fullText;
    let model = "anime style"; // Default model

    if (fullText.includes("|")) {
        const parts = fullText.split("|");
        prompt = parts[0].trim();
        const requestedModel = parts[1].trim();

        // Find closest match in model list (case-insensitive)
        const matched = models_list.find(m => m.toLowerCase() === requestedModel.toLowerCase() || m.toLowerCase().includes(requestedModel.toLowerCase()));
        if (matched) {
            model = matched;
        }
    }

    try {
        await sock.sendMessage(from, { react: { text: "🎨", key: msg.key } }).catch(() => { });

        const url = `https://anabot.my.id/api/ai/dreamify?prompt=${encodeURIComponent(prompt)}&models=${encodeURIComponent(model)}&apikey=freeApikey`;
        const res = await axios.get(url, { timeout: 60000 });

        if (!res.data || !res.data.success || !res.data.data || !res.data.data.result) {
            return sock.sendMessage(from, { text: "❌ Failed to style image. The API might be busy or offline." }, { quoted: msg });
        }

        const imageUrl = res.data.data.result;
        const caption = `✨ *DREAMIFY: ${model.toUpperCase()}* ✨\n\n` +
            `📝 *Prompt:* ${prompt}\n\n` +
            `> ${small_lib.author}`;

        await sock.sendMessage(from, { image: { url: imageUrl }, caption }, { quoted: msg });

    } catch (e) {
        console.error("Dreamify Error:", e.message);
        await sock.sendMessage(from, { text: "❌ API Error or Timeout. Try again later." }, { quoted: msg });
    }
};
