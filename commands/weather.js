// =============================================
// 🌦️ Azahrabot Weather Command v3.0 (Accurate Edition)
// Proper sender detection • Correct country guess • Stable wttr.in
// =============================================

const axios = require("axios");

const countryPrefixes = {
  91: "India", 1: "United States", 44: "United Kingdom",
  62: "Indonesia", 60: "Malaysia", 65: "Singapore",
  81: "Japan", 92: "Pakistan", 49: "Germany",
  39: "Italy", 33: "France", 34: "Spain", 55: "Brazil",
  971: "UAE", 234: "Nigeria", 7: "Russia", 94: "Sri Lanka"
};

function getSenderNumber(msg) {
  const jid = msg.key.participant || msg.key.remoteJid || "";
  return jid.split("@")[0].replace(/\D/g, "");
}

module.exports = async (sock, msg, from, text, args = []) => {
  try {
    await sock.sendMessage(from, { react: { text: "🌦️", key: msg.key } });
  } catch {}

  try {
    // 🔍 Correct phone number detection
    const userNum = getSenderNumber(msg);

    // 📝 If user typed city manually → use it
    let location = args.join(" ").trim();
    let guessedCountry = "";

    // 🌎 If no city typed → guess using phone prefix
    if (!location) {
      const prefix = Object.keys(countryPrefixes)
        .sort((a,b)=>b.length-a.length) // match longest prefix (971 > 9)
        .find(code => userNum.startsWith(code));

      guessedCountry = countryPrefixes[prefix] || "";

      if (guessedCountry) {
        location = guessedCountry;
      } else {
        // 🌐 Fallback = IP-based detection
        try {
          const ipRes = await axios.get("https://ipapi.co/json/", { timeout: 5000 });
          location = ipRes.data.city || ipRes.data.country_name;
          guessedCountry = ipRes.data.country_name || "Unknown";
        } catch {
          location = "Tokyo"; // best neutral default
          guessedCountry = "Japan";
        }
      }
    }

    // 🌤 Fetch real weather
    const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;
    const { data } = await axios.get(url, { timeout: 10000 });
    const weather = data?.current_condition?.[0];

    if (!weather) throw new Error("Invalid weather response");

    const desc = weather.weatherDesc?.[0]?.value || "N/A";
    const feels = weather.FeelsLikeC || weather.FeelsLikeF || "N/A";
    const temp = weather.temp_C || "N/A";

    const finalText = `
🌤️ *Weather Report — ${location}*
━━━━━━━━━━━━━━━━━━━
🌡️ *Temperature:* ${temp}°C
🤔 *Feels Like:* ${feels}°C
💧 *Humidity:* ${weather.humidity}%
🌬️ *Wind:* ${weather.windspeedKmph} km/h
🌞 *Visibility:* ${weather.visibility} km
🌈 *Condition:* ${desc}
🌍 *Region:* ${guessedCountry || "Auto"}
────────────────────
☁️ _Powered by AzahraTech Forecast Engine_
    `.trim();

    await sock.sendMessage(from, { text: finalText }, { quoted: msg });

  } catch (err) {
    console.error("Weather Error:", err.message);
    await sock.sendMessage(from, {
      text: "❌ Couldn't fetch weather. Try: `.weather Tokyo`"
    }, { quoted: msg });
  }
};
