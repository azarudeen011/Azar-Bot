// ==============================================
// 🌍 Azahrabot Country PRO (v2.1 CLEAN)
// Single banner • No link preview • Weather + Map
// ==============================================

const axios = require("axios");
const small = require("../../lib/small_lib");

module.exports = async (sock, msg, from, text, args) => {
  try {
    const query = args.join(" ").trim();

    if (!query) {
      return sock.sendMessage(
        from,
        { text: "🌍 *Usage:* .country <name>\nExample: .country india" },
        { quoted: msg }
      );
    }

    await sock.sendMessage(from, {
      react: { text: "🌍", key: msg.key },
    });

    // 🌍 Country API
    const res = await axios.get(
      `https://eliteprotech-apis.zone.id/countries?q=${encodeURIComponent(query)}`
    );

    if (!res.data?.status) throw new Error("Country not found");

    const c = res.data.result;

    const currencies = c.currencies?.map(v => `${v.name} (${v.symbol})`).join(", ") || "N/A";
    const languages = c.languages?.join(", ") || "N/A";

    // 🌦 Weather (optional)
    let weatherText = "N/A";
    try {
      const key = small.api?.weatherKey;
      if (key && c.capital) {
        const w = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(c.capital)}&appid=${key}&units=metric`
        );

        weatherText = `${w.data.main.temp}°C, ${w.data.weather[0].description}`;
      }
    } catch {}

    // 🗺 Map (SAFE LINK — no preview)
    const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.name)}`;
    const safeMap = mapLink.replace("https://", "https://\u200B");

    const caption = `
🌍 *${c.name}*
────────────────────
🏛 *Official:* ${c.officialName}
🏙 *Capital:* ${c.capital}
🌐 *Region:* ${c.region} (${c.subregion})
👥 *Population:* ${c.population.toLocaleString()}
📏 *Area:* ${c.area}
💰 *Currency:* ${currencies}
🗣 *Languages:* ${languages}
🌦 *Weather:* ${weatherText}
────────────────────
🗺 *Map:* ${safeMap}
> ⚡ Powered by ${small.author || "AzarTech"}
`.trim();

    // 🎨 SINGLE CLEAN MESSAGE (NO externalAdReply)
    await sock.sendMessage(
      from,
      {
        image: { url: c.flag?.image },
        caption,
      },
      { quoted: msg }
    );

    await sock.sendMessage(from, {
      react: { text: "✅", key: msg.key },
    });

  } catch (err) {
    console.error("❌ .country error:", err.message);

    await sock.sendMessage(
      from,
      { text: "❌ Country not found or API failed." },
      { quoted: msg }
    );
  }
};