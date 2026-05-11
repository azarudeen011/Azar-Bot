// ==============================================
// ✉️ TempMail Generator (FIXED)
// ==============================================

const fs = require("fs");
const path = require("path");
const axios = require("axios");

const DATA_PATH = path.join(__dirname, "../../data/tempmail.json");

function loadDB() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify({ emails: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DATA_PATH));
}

function saveDB(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

module.exports = async (sock, msg, from, text, args) => {
  try {
    const db = loadDB();

    const res = await axios.get("https://eliteprotech-apis.zone.id/tempemail");

    // ✅ FIXED
    if (!res.data?.success || !res.data?.email) {
      throw new Error("API failed");
    }

    const email = res.data.email;

    db.emails.push({
      jid: from,
      email,
      created: Date.now()
    });

    saveDB(db);

    await sock.sendMessage(
      from,
      {
        text: `📩 *Temporary Email Created*\n\n✉️ ${email}\n\n📬 Use:\n.mailinbox ${email}`,
      },
      { quoted: msg }
    );

  } catch (err) {
    console.error("❌ tempmail error:", err.message);

    await sock.sendMessage(
      from,
      { text: "❌ Failed to generate temp email." },
      { quoted: msg }
    );
  }
};